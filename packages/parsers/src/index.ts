export type ParsedInstructionType =
  | "agents-md"
  | "claude-md"
  | "gemini-md"
  | "copilot-instructions"
  | "path-scoped-instructions";

export type ReferencedPath = {
  path: string;
  line: number;
  rawText: string;
  isEscape?: boolean;
};

export type ReferencedCommand = {
  fullCommand: string;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  scriptName?: string;
  line: number;
  rawText: string;
  category?: "test" | "build" | "lint" | "typecheck" | "migrate" | "other";
};

export type NodeVersionRequirement = {
  raw: string;
  parsedVersion?: string;
  line: number;
};

export type ParsedInstructionFile = {
  path: string;
  type: ParsedInstructionType;
  rawContent: string;
  lineCount: number;
  frontmatter?: Record<string, unknown>;
  malformedFrontmatter?: boolean;
  applyToGlobs?: string[];
  referencedPaths: ReferencedPath[];
  referencedCommands: ReferencedCommand[];
  nodeVersionRequirements: NodeVersionRequirement[];
};

export function classifyInstructionType(relativePath: string): ParsedInstructionType | undefined {
  const normalized = relativePath.replaceAll("\\", "/");
  const filename = normalized.split("/").pop() ?? "";
  if (filename === "AGENTS.md" || filename === "agents.md") return "agents-md";
  if (filename === "CLAUDE.md" || filename === "claude.md") return "claude-md";
  if (filename === "GEMINI.md" || filename === "gemini.md") return "gemini-md";
  if (normalized === ".github/copilot-instructions.md") return "copilot-instructions";
  if (normalized.startsWith(".github/instructions/") && normalized.endsWith(".instructions.md")) return "path-scoped-instructions";
  return undefined;
}

export function parseYamlFrontmatter(rawContent: string): {
  frontmatter?: Record<string, unknown>;
  body: string;
  malformed: boolean;
  frontmatterEndLine: number;
} {
  if (!rawContent.startsWith("---")) {
    return { body: rawContent, malformed: false, frontmatterEndLine: 0 };
  }

  const lines = rawContent.split(/\r?\n/);
  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      closingIdx = i;
      break;
    }
  }

  if (closingIdx === -1) {
    return { body: rawContent, malformed: true, frontmatterEndLine: 0 };
  }

  const frontmatterLines = lines.slice(1, closingIdx);
  const frontmatter: Record<string, unknown> = {};
  let malformed = false;

  for (const line of frontmatterLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      malformed = true;
      continue;
    }
    const key = trimmed.slice(0, colonIndex).trim();
    let valStr = trimmed.slice(colonIndex + 1).trim();

    if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
      valStr = valStr.slice(1, -1);
    }

    if (valStr.startsWith("[") && valStr.endsWith("]")) {
      const items = valStr
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
      frontmatter[key] = items;
    } else if (valStr.startsWith("[") && !valStr.endsWith("]")) {
      malformed = true;
    } else {
      frontmatter[key] = valStr;
    }
  }

  const body = lines.slice(closingIdx + 1).join("\n");
  return {
    frontmatter,
    body,
    malformed,
    frontmatterEndLine: closingIdx + 1,
  };
}

const PM_REGEX = /\b(pnpm|npm|yarn|bun)\b(?:\s+(run|exec|test|build|lint|typecheck|ci))?(\s+[\w:.-]+)?/g;
const NODE_VERSION_REGEX = /\b(?:Node(?:\.js)?\s*(?:>=|>|==|=|v)?\s*(\d+(?:\.\d+)*)|node:\s*["']?(>=|>|==|=|v)?(\d+(?:\.\d+)*)["']?)/gi;
const PATH_REGEX = /(?:`|\b)(?:[a-zA-Z]:[\\/][^\s`"'>]+|\.\.\/[^\s`"'>]+|\/?(?:[a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_.*-]+|\.\/[^\s`"'>]+)(?:`|\b)/g;

function classifyCommandCategory(cmdText: string): ReferencedCommand["category"] {
  const lower = cmdText.toLowerCase();
  if (lower.includes("test")) return "test";
  if (lower.includes("build")) return "build";
  if (lower.includes("lint")) return "lint";
  if (lower.includes("typecheck") || lower.includes("tsc")) return "typecheck";
  if (lower.includes("migrate")) return "migrate";
  return "other";
}

export function parseInstructionFile(relativePath: string, rawContent: string): ParsedInstructionFile {
  const normPath = relativePath.replaceAll("\\", "/");
  const type = classifyInstructionType(normPath) ?? "agents-md";
  const { frontmatter, malformed: malformedFrontmatter } = parseYamlFrontmatter(rawContent);

  const lines = rawContent.split(/\r?\n/);
  const referencedPaths: ReferencedPath[] = [];
  const referencedCommands: ReferencedCommand[] = [];
  const nodeVersionRequirements: NodeVersionRequirement[] = [];

  let applyToGlobs: string[] | undefined;
  if (frontmatter?.applyTo) {
    if (Array.isArray(frontmatter.applyTo)) {
      applyToGlobs = frontmatter.applyTo.map(String);
    } else if (typeof frontmatter.applyTo === "string") {
      applyToGlobs = [frontmatter.applyTo];
    }
  }

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    // Node version requirements
    let nodeMatch: RegExpExecArray | null;
    NODE_VERSION_REGEX.lastIndex = 0;
    while ((nodeMatch = NODE_VERSION_REGEX.exec(lineText)) !== null) {
      const versionStr = nodeMatch[1] || nodeMatch[3];
      nodeVersionRequirements.push({
        raw: nodeMatch[0],
        parsedVersion: versionStr,
        line: lineNum,
      });
    }

    // Commands
    PM_REGEX.lastIndex = 0;
    let pmMatch: RegExpExecArray | null;
    while ((pmMatch = PM_REGEX.exec(lineText)) !== null) {
      const pm = pmMatch[1] as "npm" | "pnpm" | "yarn" | "bun";
      const subcommand = pmMatch[2];
      const target = pmMatch[3]?.trim();
      let scriptName = subcommand;
      if (subcommand === "run" && target) {
        scriptName = target;
      } else if (!subcommand && target) {
        scriptName = target;
      }

      const fullCommand = pmMatch[0].trim();
      referencedCommands.push({
        fullCommand,
        packageManager: pm,
        scriptName,
        line: lineNum,
        rawText: lineText.trim(),
        category: classifyCommandCategory(fullCommand),
      });
    }

    // Path references
    PATH_REGEX.lastIndex = 0;
    let pathMatch: RegExpExecArray | null;
    while ((pathMatch = PATH_REGEX.exec(lineText)) !== null) {
      let rawPath = pathMatch[0].replace(/^`|`$/g, "").trim();
      if (!rawPath || rawPath.length < 2) continue;

      // Filter out obvious false positives like URLs or version numbers
      if (rawPath.startsWith("http://") || rawPath.startsWith("https://") || /^\d+\.\d+/.test(rawPath)) {
        continue;
      }

      const isEscape = rawPath.startsWith("../") || rawPath.includes("/../") || /^[a-zA-Z]:[\\/]/.test(rawPath) || rawPath.startsWith("/");
      const cleanPath = rawPath.replace(/^\.\//, "");

      referencedPaths.push({
        path: cleanPath,
        line: lineNum,
        rawText: lineText.trim(),
        isEscape,
      });
    }
  });

  return {
    path: normPath,
    type,
    rawContent,
    lineCount: lines.length,
    frontmatter,
    malformedFrontmatter,
    applyToGlobs,
    referencedPaths,
    referencedCommands,
    nodeVersionRequirements,
  };
}
