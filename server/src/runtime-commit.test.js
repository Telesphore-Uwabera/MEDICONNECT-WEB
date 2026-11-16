import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { normalizeCommit, resolveRunningCommit } from "./runtime-commit.js";

function git(cwd, args) {
  execFileSync("git", args, {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Deploy Test",
      GIT_AUTHOR_EMAIL: "deploy-test@example.com",
      GIT_COMMITTER_NAME: "Deploy Test",
      GIT_COMMITTER_EMAIL: "deploy-test@example.com",
    },
  });
}

describe("running commit", () => {
  it("accepts only a full git sha", () => {
    expect(normalizeCommit("A".repeat(40))).toHaveLength(40);
    expect(normalizeCommit("abc")).toBe("");
    expect(normalizeCommit("")).toBe("");
  });

  it("prefers the process environment, then git, then a COMMIT file", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mediconnect-commit-"));
    git(root, ["init"]);
    fs.writeFileSync(path.join(root, "README"), "one\n");
    git(root, ["add", "README"]);
    git(root, ["commit", "-m", "one"]);
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

    expect(resolveRunningCommit({ MEDICONNECT_COMMIT: "b".repeat(40) }, [root])).toBe("b".repeat(40));
    expect(resolveRunningCommit({}, [root])).toBe(head);

    const bare = fs.mkdtempSync(path.join(os.tmpdir(), "mediconnect-commit-file-"));
    fs.writeFileSync(path.join(bare, "COMMIT"), `${"c".repeat(40)}\n`);
    expect(resolveRunningCommit({}, [bare])).toBe("c".repeat(40));
  });
});

describe("deploy.sh", () => {
  const script = path.resolve(process.cwd(), "deploy.sh");

  function run(env) {
    return execFileSync("bash", [script], {
      env: { ...process.env, ...env },
      encoding: "utf8",
    });
  }

  it("reclones after a failed fetch and publishes that sha", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mediconnect-deploy-"));
    const origin = path.join(root, "origin.git");
    const seed = path.join(root, "seed");
    const clone = path.join(root, "clone");
    const dest = path.join(root, "dest");
    git(root, ["init", "--bare", origin]);
    git(root, ["clone", origin, seed]);
    fs.writeFileSync(path.join(seed, "marker"), "first\n");
    git(seed, ["add", "marker"]);
    git(seed, ["commit", "-m", "first"]);
    git(seed, ["push", "origin", "HEAD:main"]);
    git(root, ["clone", "--depth=1", "--branch", "main", origin, clone]);
    git(clone, ["remote", "set-url", "origin", path.join(root, "missing.git")]);
    fs.writeFileSync(path.join(seed, "marker"), "second\n");
    git(seed, ["commit", "-am", "second"]);
    git(seed, ["push", "origin", "HEAD:main"]);
    const expected = execFileSync("git", ["rev-parse", "HEAD"], { cwd: seed, encoding: "utf8" }).trim();

    const published = run({
      MEDICONNECT_CLONE: clone,
      MEDICONNECT_DEST: dest,
      MEDICONNECT_REPO: origin,
      MEDICONNECT_EXPECTED_SHA: expected,
      MEDICONNECT_SKIP_INSTALL: "1",
      MEDICONNECT_SKIP_RESTART: "1",
    }).trim();

    expect(published).toBe(expected);
    expect(fs.readFileSync(path.join(dest, "COMMIT"), "utf8").trim()).toBe(expected);
    expect(fs.readFileSync(path.join(dest, "marker"), "utf8")).toBe("second\n");
  });

  it("does not copy or restart when the update cannot be cloned", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mediconnect-deploy-fail-"));
    const clone = path.join(root, "clone");
    const dest = path.join(root, "dest");
    const restarted = path.join(root, "restarted");
    fs.mkdirSync(path.join(clone, ".git"), { recursive: true });
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, "keep"), "old\n");
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "systemctl"), `#!/bin/sh\necho restart > "${restarted}"\n`);
    fs.chmodSync(path.join(bin, "systemctl"), 0o755);

    expect(() => run({
      PATH: `${bin}:${process.env.PATH}`,
      MEDICONNECT_CLONE: clone,
      MEDICONNECT_DEST: dest,
      MEDICONNECT_REPO: path.join(root, "missing.git"),
      MEDICONNECT_SKIP_INSTALL: "1",
    })).toThrow();
    expect(fs.readFileSync(path.join(dest, "keep"), "utf8")).toBe("old\n");
    expect(fs.existsSync(path.join(dest, "COMMIT"))).toBe(false);
    expect(fs.existsSync(restarted)).toBe(false);
  });
});
