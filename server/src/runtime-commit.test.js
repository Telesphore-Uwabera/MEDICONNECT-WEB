import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "url";
import { commitSearchRoots, normalizeCommit, resolveRunningCommit } from "./runtime-commit.js";

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

  it("prefers a COMMIT file over git, and still honors an explicit env sha", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mediconnect-commit-"));
    git(root, ["init"]);
    fs.writeFileSync(path.join(root, "README"), "one\n");
    git(root, ["add", "README"]);
    git(root, ["commit", "-m", "one"]);
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    const filed = "c".repeat(40);
    fs.writeFileSync(path.join(root, "COMMIT"), `${filed}\n`);

    expect(resolveRunningCommit({ MEDICONNECT_COMMIT: "b".repeat(40) }, [root])).toBe("b".repeat(40));
    expect(resolveRunningCommit({}, [root])).toBe(filed);
    fs.rmSync(path.join(root, "COMMIT"));
    expect(resolveRunningCommit({}, [root])).toBe(head);
    const here = path.dirname(fileURLToPath(import.meta.url));
    expect(commitSearchRoots()).toContain(path.resolve(here, ".."));
    expect(commitSearchRoots()).toContain(process.cwd());
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
    fs.mkdirSync(path.join(seed, "server/src"), { recursive: true });
    fs.mkdirSync(path.join(seed, "src"), { recursive: true });
    fs.writeFileSync(path.join(seed, "server/src/marker.js"), "first\n");
    fs.writeFileSync(path.join(seed, "src/App.tsx"), "frontend\n");
    fs.writeFileSync(path.join(seed, "package.json"), "{\"name\":\"frontend\"}\n");
    git(seed, ["add", "server", "src", "package.json"]);
    git(seed, ["commit", "-m", "first"]);
    git(seed, ["push", "origin", "HEAD:main"]);
    git(root, ["clone", "--depth=1", "--branch", "main", origin, clone]);
    git(clone, ["remote", "set-url", "origin", path.join(root, "missing.git")]);
    fs.writeFileSync(path.join(seed, "server/src/marker.js"), "second\n");
    fs.writeFileSync(path.join(seed, "package.json"), "{\"name\":\"frontend-next\"}\n");
    git(seed, ["commit", "-am", "second"]);
    git(seed, ["push", "origin", "HEAD:main"]);
    const expected = execFileSync("git", ["rev-parse", "HEAD"], { cwd: seed, encoding: "utf8" }).trim();
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, "package.json"), "{\"name\":\"already-installed\"}\n");

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
    expect(fs.readFileSync(path.join(dest, "src/marker.js"), "utf8")).toBe("second\n");
    expect(fs.readFileSync(path.join(dest, "package.json"), "utf8")).toBe("{\"name\":\"already-installed\"}\n");
    expect(fs.existsSync(path.join(dest, "src/App.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(dest, "src.next"))).toBe(false);
  });

  it("keeps the live source when the staged copy fails", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mediconnect-deploy-swap-"));
    const origin = path.join(root, "origin.git");
    const seed = path.join(root, "seed");
    const clone = path.join(root, "clone");
    const dest = path.join(root, "dest");
    git(root, ["init", "--bare", origin]);
    git(root, ["clone", origin, seed]);
    fs.mkdirSync(path.join(seed, "server/src"), { recursive: true });
    fs.writeFileSync(path.join(seed, "server/src/marker.js"), "incoming\n");
    git(seed, ["add", "server"]);
    git(seed, ["commit", "-m", "incoming"]);
    git(seed, ["push", "origin", "HEAD:main"]);
    git(root, ["clone", "--depth=1", "--branch", "main", origin, clone]);
    fs.mkdirSync(path.join(dest, "src"), { recursive: true });
    fs.writeFileSync(path.join(dest, "src/marker.js"), "live\n");
    fs.writeFileSync(path.join(dest, "COMMIT"), "old\n");
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "cp"), `#!/bin/sh
for arg in "$@"; do
  case "$arg" in
    *src.next*) echo "copy failed" >&2; exit 1 ;;
  esac
done
exec /bin/cp "$@"
`);
    fs.chmodSync(path.join(bin, "cp"), 0o755);

    expect(() => run({
      PATH: `${bin}:${process.env.PATH}`,
      MEDICONNECT_CLONE: clone,
      MEDICONNECT_DEST: dest,
      MEDICONNECT_REPO: origin,
      MEDICONNECT_SKIP_INSTALL: "1",
      MEDICONNECT_SKIP_RESTART: "1",
    })).toThrow();
    expect(fs.readFileSync(path.join(dest, "src/marker.js"), "utf8")).toBe("live\n");
    expect(fs.readFileSync(path.join(dest, "COMMIT"), "utf8")).toBe("old\n");
  });

  it("runs npm install only when the server lockfile changes", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mediconnect-deploy-npm-"));
    const origin = path.join(root, "origin.git");
    const seed = path.join(root, "seed");
    const clone = path.join(root, "clone");
    const dest = path.join(root, "dest");
    const log = path.join(root, "npm.log");
    git(root, ["init", "--bare", origin]);
    git(root, ["clone", origin, seed]);
    fs.mkdirSync(path.join(seed, "server/src"), { recursive: true });
    fs.writeFileSync(path.join(seed, "server/src/marker.js"), "app\n");
    fs.writeFileSync(path.join(seed, "server/package.json"), "{\"name\":\"api\"}\n");
    fs.writeFileSync(path.join(seed, "server/package-lock.json"), "{\"lock\":1}\n");
    git(seed, ["add", "server"]);
    git(seed, ["commit", "-m", "locked"]);
    git(seed, ["push", "origin", "HEAD:main"]);
    git(root, ["clone", "--depth=1", "--branch", "main", origin, clone]);
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, "package.json"), "{\"name\":\"api\"}\n");
    const lockHash = execFileSync("sha256sum", [path.join(clone, "server/package-lock.json")], { encoding: "utf8" }).split(" ")[0];
    fs.writeFileSync(path.join(dest, ".package-lock.sha"), `${lockHash}\n`);
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "npm"), `#!/bin/sh\necho "$@" >> "${log}"\n`);
    fs.chmodSync(path.join(bin, "npm"), 0o755);
    const env = {
      PATH: `${bin}:${process.env.PATH}`,
      MEDICONNECT_CLONE: clone,
      MEDICONNECT_DEST: dest,
      MEDICONNECT_REPO: origin,
      MEDICONNECT_SKIP_RESTART: "1",
    };

    run(env);
    expect(fs.existsSync(log)).toBe(false);

    fs.writeFileSync(path.join(seed, "server/package-lock.json"), "{\"lock\":2}\n");
    git(seed, ["commit", "-am", "lock changed"]);
    git(seed, ["push", "origin", "HEAD:main"]);
    run(env);
    expect(fs.readFileSync(log, "utf8")).toContain("install --omit=dev --prefix");
    expect(fs.readFileSync(path.join(dest, "package-lock.json"), "utf8")).toBe("{\"lock\":2}\n");
    expect(fs.readFileSync(path.join(dest, ".package-lock.sha"), "utf8").trim()).not.toBe(lockHash);
  });

  it("copies server package files and skips install when there is no previous lock", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mediconnect-deploy-first-"));
    const origin = path.join(root, "origin.git");
    const seed = path.join(root, "seed");
    const clone = path.join(root, "clone");
    const dest = path.join(root, "dest");
    const log = path.join(root, "npm.log");
    git(root, ["init", "--bare", origin]);
    git(root, ["clone", origin, seed]);
    fs.mkdirSync(path.join(seed, "server/src"), { recursive: true });
    fs.writeFileSync(path.join(seed, "server/src/marker.js"), "app\n");
    fs.writeFileSync(path.join(seed, "server/package.json"), "{\"name\":\"server-api\"}\n");
    fs.writeFileSync(path.join(seed, "server/package-lock.json"), "{\"lock\":1}\n");
    git(seed, ["add", "server"]);
    git(seed, ["commit", "-m", "locked"]);
    git(seed, ["push", "origin", "HEAD:main"]);
    git(root, ["clone", "--depth=1", "--branch", "main", origin, clone]);
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, "package.json"), "{\"name\":\"already-installed\"}\n");
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "npm"), `#!/bin/sh\necho "$@" >> "${log}"\n`);
    fs.chmodSync(path.join(bin, "npm"), 0o755);

    run({
      PATH: `${bin}:${process.env.PATH}`,
      MEDICONNECT_CLONE: clone,
      MEDICONNECT_DEST: dest,
      MEDICONNECT_REPO: origin,
      MEDICONNECT_SKIP_RESTART: "1",
    });

    expect(fs.existsSync(log)).toBe(false);
    expect(fs.readFileSync(path.join(dest, "package.json"), "utf8")).toBe("{\"name\":\"server-api\"}\n");
    expect(fs.readFileSync(path.join(dest, "package-lock.json"), "utf8")).toBe("{\"lock\":1}\n");
    expect(fs.readFileSync(path.join(dest, ".package-lock.sha"), "utf8").trim()).toMatch(/^[a-f0-9]{64}$/);
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
