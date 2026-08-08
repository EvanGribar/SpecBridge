/* global process */

import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const packageRoot = resolve(repositoryRoot, "packages", "benchmark");
const dataRoot = resolve(packageRoot, "data");

if (process.argv.includes("--clean")) {
  rmSync(dataRoot, { recursive: true, force: true });
} else {
  rmSync(dataRoot, { recursive: true, force: true });
  for (const name of ["benchmarks", "fixtures", "tasks", "experiments"]) {
    const source = resolve(repositoryRoot, name);
    if (existsSync(source)) cpSync(source, resolve(dataRoot, name), { recursive: true });
  }
}
