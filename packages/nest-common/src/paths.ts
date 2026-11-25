import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** The nearest directory above `from` that holds the shared resource definitions. */
function findRoot(from: string): string {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, "packages/contracts/resources.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

/**
 * Root of the service's repository, whatever the working directory and wherever this package is
 * installed: the directory with packages/contracts/resources.json, which every service repository
 * carries. REPO_ROOT overrides it (the Docker images set it).
 */
export const repoRoot = () => process.env.REPO_ROOT ?? findRoot(__dirname);

/**
 * Environment for the Python engine and tools. Their stdin and stdout carry JSON with Vietnamese
 * text; without UTF-8 mode, Python on Windows encodes them with the console code page (cp1252)
 * and fails on the first Vietnamese letter.
 */
export const pythonEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  PYTHONUTF8: "1",
  PYTHONIOENCODING: "utf-8",
});
