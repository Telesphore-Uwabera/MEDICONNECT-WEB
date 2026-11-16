import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHA = /^[0-9a-f]{40}$/i;

export function normalizeCommit(value) {
  const text = String(value ?? "").trim().split(/\s+/)[0] ?? "";
  return SHA.test(text) ? text.toLowerCase() : "";
}

function readFileSha(file) {
  try {
    return normalizeCommit(fs.readFileSync(file, "utf8"));
  } catch {
    return "";
  }
}

function gitHead(dir) {
  try {
    return normalizeCommit(execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], {
      encoding: "utf8",
      timeout: 2000,
      stdio: ["ignore", "pipe", "ignore"],
    }));
  } catch {
    return "";
  }
}

/** The commit this process started from. Later writes on disk do not change it. */
export function resolveRunningCommit(env = process.env, roots = []) {
  const fromEnv = normalizeCommit(env.MEDICONNECT_COMMIT || env.GIT_COMMIT || env.SOURCE_VERSION);
  if (fromEnv) return fromEnv;
  for (const root of roots) {
    if (!root) continue;
    for (const name of ["COMMIT", ".commit"]) {
      const fromFile = readFileSha(path.join(root, name));
      if (fromFile) return fromFile;
    }
  }
  for (const root of roots) {
    if (!root) continue;
    const fromGit = gitHead(root);
    if (fromGit) return fromGit;
  }
  return "";
}

/** Install root (parent of this file), the working directory, and its parent. */
export function commitSearchRoots(fromDir = __dirname) {
  return [
    path.resolve(fromDir, ".."),
    process.cwd(),
    path.resolve(process.cwd(), ".."),
  ];
}

const startedAs = resolveRunningCommit(process.env, commitSearchRoots()) || null;

export function runningCommit() {
  return startedAs;
}
