import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const packages = ["core", "parsers", "repository", "rules", "adapters", "sarif", "cli"] as const;
const run = async (command: string, args: string[], cwd = root) => exec(command, args, { cwd, windowsHide: true });
const pnpmEntrypoint = process.env.npm_execpath;
if (!pnpmEntrypoint) throw new Error("pnpm entrypoint is unavailable");
const runPnpm = (args: string[], cwd = root) => run(process.execPath, [pnpmEntrypoint, ...args], cwd);
const temp = await mkdtemp(join(tmpdir(), "specbridge-pack-"));

try {
  for (const name of packages) await runPnpm(["--filter", `@specbridge/${name}`, "pack", "--pack-destination", temp]);
  const archives = await readdir(temp);
  if (archives.length !== packages.length) throw new Error(`expected ${packages.length} tarballs, received ${archives.length}`);
  for (const archive of archives) {
    const { stdout } = await run("tar", ["-xOf", join(temp, archive), "package/package.json"]);
    const manifest = JSON.parse(stdout) as { name: string; files?: string[]; dependencies?: Record<string, string> };
    if (!manifest.files?.includes("dist") || !manifest.name.startsWith("@specbridge/")) throw new Error(`invalid packed manifest: ${archive}`);
    if (Object.values(manifest.dependencies ?? {}).some((version) => version.startsWith("workspace:"))) throw new Error(`packed workspace dependency found in ${archive}`);
  }
  const tarball = (name: string) => join(temp, archives.find((archive) => archive.startsWith(`specbridge-${name.replace("@specbridge/", "")}`)) ?? "");
  const consumer = join(temp, "consumer");
  const dependencies = Object.fromEntries(packages.map((name) => [`@specbridge/${name}`, `file:${tarball(name)}`]));
  await writeFile(join(temp, "package.json"), JSON.stringify({ private: true, dependencies, pnpm: { overrides: dependencies } }, null, 2));
  await runPnpm(["install", "--ignore-scripts"], temp);
  await writeFile(join(temp, "smoke.mjs"), 'import { RequirementContractSchema, ReviewCoverageReportSchema } from "@specbridge/core"; import { toSarif } from "@specbridge/sarif"; if (!RequirementContractSchema || !ReviewCoverageReportSchema || typeof toSarif !== "function") throw new Error("public imports unavailable");\n');
  await run("node", [join(temp, "smoke.mjs")], temp);
  await runPnpm(["exec", "specbridge", "audit", "--format", "json"], temp);
  process.stdout.write(`Packed and externally consumed ${archives.length} SpecBridge packages.\n`);
} finally { await rm(temp, { recursive: true, force: true }); }
