import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");
const packagerUrl = pathToFileURL(path.join(projectRoot, "scripts/package-release.mjs"));
const workflowFile = path.join(projectRoot, ".github/workflows/ci.yml");

let packager;
let packagerLoadError;
try {
  packager = await import(packagerUrl.href);
} catch (error) {
  packagerLoadError = error;
}

function requirePackager() {
  assert.ok(packager, `release packager must load: ${packagerLoadError?.message ?? "unknown error"}`);
  return packager;
}

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "wokin-release-"));
  const outDir = path.join(root, "out");
  mkdirSync(path.join(outDir, "assets"), { recursive: true });
  writeFileSync(path.join(outDir, "index.html"), "<!doctype html><title>Fixture</title><h1>Release fixture</h1>");
  writeFileSync(path.join(outDir, "assets/app.js"), "globalThis.releaseFixture = true;\n");
  return { outDir, root };
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

async function serveIndex(root) {
  const server = createServer((request, response) => {
    const target = path.join(root, request.url === "/" ? "index.html" : request.url.slice(1));
    if (!existsSync(target)) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200);
    createReadStream(target).pipe(response);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Release fixture/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("release packager module is available", () => {
  requirePackager();
});

test("release package contains deploy root, dotfile config, sorted SHA-256 manifest, and deterministic archive", async () => {
  const { packageRelease } = requirePackager();
  const current = fixture();
  try {
    const first = await packageRelease({ outDir: current.outDir, releaseDir: path.join(current.root, "release-a") });
    const second = await packageRelease({ outDir: current.outDir, releaseDir: path.join(current.root, "release-b") });

    assert.ok(existsSync(path.join(first.packageDir, "index.html")));
    assert.ok(existsSync(path.join(first.packageDir, "assets/app.js")));
    assert.match(readFileSync(path.join(first.packageDir, ".htaccess"), "utf8"), /Content-Security-Policy/);

    const lines = readFileSync(first.manifestFile, "utf8").trim().split("\n");
    assert.deepEqual(lines, [...lines].sort((left, right) => left.localeCompare(right, "en")));
    assert.ok(lines.some((line) => /^[a-f0-9]{64}  hostinger\/\.htaccess$/.test(line)));
    assert.ok(lines.some((line) => /^[a-f0-9]{64}  hostinger\/index\.html$/.test(line)));
    for (const line of lines) {
      const match = line.match(/^([a-f0-9]{64})  (hostinger\/.+)$/);
      assert.ok(match, `invalid checksum line: ${line}`);
      assert.equal(sha256(path.join(first.releaseDir, match[2])), match[1]);
    }
    assert.equal(sha256(first.archiveFile), sha256(second.archiveFile));

    const listed = spawnSync("tar", ["-tzf", first.archiveFile], { encoding: "utf8" });
    assert.equal(listed.status, 0, listed.stderr);
    assert.match(listed.stdout, /hostinger\/\.htaccess/);
    assert.match(listed.stdout, /SHA256SUMS/);

    const extractDir = path.join(current.root, "extracted");
    mkdirSync(extractDir);
    const extracted = spawnSync("tar", ["-xzf", first.archiveFile, "-C", extractDir], { encoding: "utf8" });
    assert.equal(extracted.status, 0, extracted.stderr);
    await serveIndex(path.join(extractDir, "hostinger"));
  } finally {
    rmSync(current.root, { recursive: true, force: true });
  }
});

test("release packager rejects forbidden files and secret-like content", async (context) => {
  const { packageRelease } = requirePackager();
  const forbidden = [
    ["assets/app.js.map", "{}"],
    [".env.production", "API_KEY=test"],
    ["node_modules/pkg/index.js", "module.exports = {}"],
    [".git/config", "[core]"],
    ["npm-audit.json", "{}"],
    ["private.pem", "-----BEGIN PRIVATE KEY-----\nfixture\n-----END PRIVATE KEY-----"],
    ["assets/config.txt", "WOKIN_API_KEY=fixture-secret-value"],
  ];

  for (const [relative, content] of forbidden) {
    await context.test(relative, async () => {
      const current = fixture();
      try {
        const target = path.join(current.outDir, relative);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, content);
        await assert.rejects(
          packageRelease({ outDir: current.outDir, releaseDir: path.join(current.root, "release") }),
          /forbidden|secret|sensitive/i,
        );
      } finally {
        rmSync(current.root, { recursive: true, force: true });
      }
    });
  }
});

test("CI runs every release gate before uploading only build artifacts", () => {
  const workflow = readFileSync(workflowFile, "utf8");
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /uses: actions\/checkout@v7/);
  assert.match(workflow, /uses: actions\/setup-node@v7[\s\S]*cache: npm/);
  assert.match(workflow, /uses: actions\/upload-artifact@v7/);
  const gates = [
    "npm ci",
    "npm audit --audit-level=high",
    "npm run typecheck",
    "npm test",
    "npm run validate:data",
    "npm run check:data",
    "npm run build",
    "npm run validate:export",
    "npm run package:release",
  ];
  let previous = -1;
  for (const gate of gates) {
    const current = workflow.indexOf(`run: ${gate}`);
    assert.ok(current > previous, `${gate} must appear once and after the preceding gate`);
    previous = current;
  }
  const upload = workflow.indexOf("uses: actions/upload-artifact@v7");
  assert.ok(upload > previous, "artifact upload must happen after every gate");
  assert.match(workflow, /path: out\//);
  assert.doesNotMatch(workflow, /path:\s*(?:node_modules|\.|src\/|\.git)/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});

test("release packager refuses missing input, an existing destination, and overlapping paths", async () => {
  const { packageRelease } = requirePackager();
  const current = fixture();
  try {
    await assert.rejects(
      packageRelease({ outDir: path.join(current.root, "missing"), releaseDir: path.join(current.root, "release-missing") }),
      /does not exist|missing/i,
    );
    const releaseDir = path.join(current.root, "release-existing");
    mkdirSync(releaseDir);
    await assert.rejects(packageRelease({ outDir: current.outDir, releaseDir }), /already exists/i);
    await assert.rejects(
      packageRelease({ outDir: current.outDir, releaseDir: path.join(current.outDir, "release") }),
      /overlap|inside/i,
    );
  } finally {
    rmSync(current.root, { recursive: true, force: true });
  }
});
