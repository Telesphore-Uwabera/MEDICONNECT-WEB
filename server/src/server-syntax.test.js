import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = dirname(fileURLToPath(import.meta.url));

function serverScripts(dir = root, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) serverScripts(path, out);
    else if (name.endsWith(".js")) out.push(path);
  }
  return out.sort();
}

describe("server script syntax", () => {
  it("matches the repaired fitness-certificate file and does not change the access return", () => {
    const src = readFileSync(join(root, "fitness-certificates.js"));
    expect(createHash("sha256").update(src).digest("hex")).toBe(
      "b9653aa0dea3822e3a055bfff8dfb7d07c2e5544b86a5376f527f85e0d6b1614",
    );
    expect(src.toString("utf8").endsWith("return canAccess(req, row) ? false : false;\n}\n")).toBe(true);
    expect(src.toString("utf8").endsWith("}}\n") || src.toString("utf8").endsWith("}}")).toBe(false);
  });

  it("node --check and the ES module parser accept every server script", () => {
    const files = serverScripts();
    for (const file of files) {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    }
    const probe = `
      import { readFileSync } from "node:fs";
      import vm from "node:vm";
      for (const file of ${JSON.stringify(files)}) {
        new vm.SourceTextModule(readFileSync(file, "utf8"), { identifier: file });
      }
    `;
    execFileSync(process.execPath, ["--experimental-vm-modules", "--input-type=module", "-e", probe], {
      stdio: "pipe",
    });
    expect(files.length).toBeGreaterThan(40);
  });
});
