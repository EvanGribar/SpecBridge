import { readdir, readFile, stat, realpath } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { type AuditConfig, parseAuditReport, AuditConfigSchema } from "@specbridge/core";
import { parseInstructionFile, type ParsedInstructionFile } from "@specbridge/parsers";

export type DetectedPackageManager = {
  name: "pnpm" | "npm" | "yarn" | "bun";
  source: "packageManager-field" | "lockfile" | "default";
  version?: string;
  file?: string;
};

export type CIWorkflowStep = {
  workflowFile: string;
  jobName: string;
  stepName?: string;
  command: string;
  packageManager?: string;
  line?: number;
};

export type RepositoryInventory = {
  rootDir: string;
  files: Set<string>;
  directories: Set<string>;
  packageManager: DetectedPackageManager;
  packageScripts: Map<string, { name: string; command: string; sourceFile: string }>;
  nodeEngineRequirement?: { raw: string; sourceFile: string };
  ciWorkflows: CIWorkflowStep[];
  instructionFiles: ParsedInstructionFile[];
  config?: AuditConfig;
  workspaces?: string[];
  isMonorepo: boolean;
};

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".cache",
  "coverage",
  "out",
  ".next",
  ".nuxt",
  "fixtures",
]);

export async function scanRepository(rootDir: string): Promise<RepositoryInventory> {
  const absoluteRoot = resolve(rootDir);
  const realRoot = await realpath(absoluteRoot);

  const files = new Set<string>();
  const directories = new Set<string>();
  const instructionFiles: ParsedInstructionFile[] = [];
  const packageScripts = new Map<string, { name: string; command: string; sourceFile: string }>();
  const ciWorkflows: CIWorkflowStep[] = [];

  let detectedPm: DetectedPackageManager = { name: "npm", source: "default" };
  let nodeEngineRequirement: { raw: string; sourceFile: string } | undefined;
  let config: AuditConfig | undefined;
  let workspaces: string[] | undefined;
  let isMonorepo = false;

  const MAX_FILES = 50000;
  let fileCount = 0;

  async function walkDir(currentDir: string) {
    if (fileCount > MAX_FILES) return;
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const fullSubDir = join(currentDir, entry.name);

        // Security check: ensure symlink doesn't escape root
        try {
          const realSubDir = await realpath(fullSubDir);
          if (!realSubDir.startsWith(realRoot)) continue;
        } catch {
          continue;
        }

        const relDir = relative(realRoot, fullSubDir).replaceAll("\\", "/");
        if (relDir) directories.add(relDir);
        await walkDir(fullSubDir);
      } else if (entry.isFile()) {
        fileCount++;
        const fullFilePath = join(currentDir, entry.name);

        try {
          const realFilePath = await realpath(fullFilePath);
          if (!realFilePath.startsWith(realRoot)) continue;
        } catch {
          continue;
        }

        const relPath = relative(realRoot, fullFilePath).replaceAll("\\", "/");
        files.add(relPath);

        const filename = entry.name;
        const filenameLower = filename.toLowerCase();

        // Check for instruction files
        if (
          filenameLower === "agents.md" ||
          filenameLower === "claude.md" ||
          filenameLower === "gemini.md" ||
          relPath === ".github/copilot-instructions.md" ||
          (relPath.startsWith(".github/instructions/") && relPath.endsWith(".instructions.md"))
        ) {
          try {
            const content = await readFile(fullFilePath, "utf8");
            instructionFiles.push(parseInstructionFile(relPath, content));
          } catch {
            // ignore unreadable files
          }
        }

        // Config file
        if (filename === "specbridge.config.json" || filename === ".specbridgerc") {
          try {
            const rawConfig = JSON.parse(await readFile(fullFilePath, "utf8"));
            const parsedConfig = AuditConfigSchema.safeParse(rawConfig);
            if (parsedConfig.success) config = parsedConfig.data;
          } catch {
            // malformed config
          }
        }
      }
    }
  }

  await walkDir(realRoot);

  // Read root package.json
  if (files.has("package.json")) {
    try {
      const pkgContent = JSON.parse(await readFile(join(realRoot, "package.json"), "utf8"));

      if (pkgContent.packageManager) {
        const pmStr = String(pkgContent.packageManager);
        let name: DetectedPackageManager["name"] = "npm";
        if (pmStr.startsWith("pnpm")) name = "pnpm";
        else if (pmStr.startsWith("yarn")) name = "yarn";
        else if (pmStr.startsWith("bun")) name = "bun";
        else if (pmStr.startsWith("npm")) name = "npm";

        detectedPm = {
          name,
          source: "packageManager-field",
          version: pmStr.split("@")[1],
          file: "package.json",
        };
      }

      if (pkgContent.scripts) {
        for (const [sName, sCmd] of Object.entries(pkgContent.scripts)) {
          packageScripts.set(sName, {
            name: sName,
            command: String(sCmd),
            sourceFile: "package.json",
          });
        }
      }

      if (pkgContent.engines?.node) {
        nodeEngineRequirement = {
          raw: String(pkgContent.engines.node),
          sourceFile: "package.json",
        };
      }

      if (pkgContent.workspaces) {
        isMonorepo = true;
        workspaces = Array.isArray(pkgContent.workspaces)
          ? pkgContent.workspaces
          : pkgContent.workspaces.packages;
      }
    } catch {
      // ignore
    }
  }

  // If packageManager field wasn't set, check lockfiles
  if (detectedPm.source === "default") {
    if (files.has("pnpm-lock.yaml")) {
      detectedPm = { name: "pnpm", source: "lockfile", file: "pnpm-lock.yaml" };
    } else if (files.has("yarn.lock")) {
      detectedPm = { name: "yarn", source: "lockfile", file: "yarn.lock" };
    } else if (files.has("bun.lockb") || files.has("bun.lock")) {
      detectedPm = { name: "bun", source: "lockfile", file: "bun.lockb" };
    } else if (files.has("package-lock.json")) {
      detectedPm = { name: "npm", source: "lockfile", file: "package-lock.json" };
    }
  }

  // Check pnpm-workspace.yaml
  if (files.has("pnpm-workspace.yaml")) {
    isMonorepo = true;
  }

  // Check Node version files if engines wasn't set
  if (!nodeEngineRequirement) {
    if (files.has(".nvmrc")) {
      try {
        const raw = (await readFile(join(realRoot, ".nvmrc"), "utf8")).trim();
        if (raw) nodeEngineRequirement = { raw, sourceFile: ".nvmrc" };
      } catch {}
    } else if (files.has(".node-version")) {
      try {
        const raw = (await readFile(join(realRoot, ".node-version"), "utf8")).trim();
        if (raw) nodeEngineRequirement = { raw, sourceFile: ".node-version" };
      } catch {}
    }
  }

  // Parse CI Workflows (.github/workflows)
  for (const fileRel of files) {
    if (fileRel.startsWith(".github/workflows/") && (fileRel.endsWith(".yml") || fileRel.endsWith(".yaml"))) {
      try {
        const content = await readFile(join(realRoot, fileRel), "utf8");
        const lines = content.split(/\r?\n/);
        let currentJob = "job";

        lines.forEach((lineStr, idx) => {
          const lineNum = idx + 1;
          const trimmed = lineStr.trim();

          const jobMatch = /^([a-zA-Z0-9_-]+):/.exec(trimmed);
          if (jobMatch && lineStr.search(/\S/) === 2) {
            currentJob = jobMatch[1]!;
          }

          const runIdx = trimmed.indexOf("run:");
          if (runIdx !== -1 && (trimmed.startsWith("run:") || trimmed.startsWith("- run:") || trimmed.startsWith("- name:"))) {
            let cmdStr = trimmed.slice(runIdx + 4).trim();
            if ((cmdStr.startsWith('"') && cmdStr.endsWith('"')) || (cmdStr.startsWith("'") && cmdStr.endsWith("'"))) {
              cmdStr = cmdStr.slice(1, -1);
            }

            let pm: string | undefined;
            if (cmdStr.includes("pnpm")) pm = "pnpm";
            else if (cmdStr.includes("npm")) pm = "npm";
            else if (cmdStr.includes("yarn")) pm = "yarn";
            else if (cmdStr.includes("bun")) pm = "bun";

            ciWorkflows.push({
              workflowFile: fileRel,
              jobName: currentJob,
              command: cmdStr,
              packageManager: pm,
              line: lineNum,
            });
          }
        });
      } catch {}
    }
  }

  return {
    rootDir: realRoot,
    files,
    directories,
    packageManager: detectedPm,
    packageScripts,
    nodeEngineRequirement,
    ciWorkflows,
    instructionFiles,
    config,
    workspaces,
    isMonorepo,
  };
}
