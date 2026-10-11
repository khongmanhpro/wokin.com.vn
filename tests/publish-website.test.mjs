import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { listReleases, publishWebsite, switchCurrent } from "../scripts/publish-website.mjs";

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "wokin-publish-"));
  const websiteDir = path.join(root, "site");
  mkdirSync(path.join(websiteDir, "src/data"), { recursive: true });
  writeFileSync(path.join(websiteDir, "src/data/catalog.generated.json"), "repo-catalog");
  writeFileSync(path.join(websiteDir, "src/data/site-settings.json"), "repo-settings");
  const releaseFile = path.join(root, "catalog-release.json");
  writeFileSync(releaseFile, "{}");
  const siteSettingsFile = path.join(root, "site-settings.json");
  writeFileSync(siteSettingsFile, "admin-settings");
  const uploadsDir = path.join(root, "uploads");
  mkdirSync(uploadsDir);
  writeFileSync(path.join(uploadsDir, "anh-moi.png"), "png");
  return { root, websiteDir, releaseFile, siteSettingsFile, uploadsDir, targetDir: path.join(root, "publish") };
}

// Stands in for node/npm/rsync: "build" writes out/ from what the publish step put in src/data.
function fakeRun(calls, { failOn } = {}) {
  return async (command, args, { cwd }) => {
    calls.push([command, ...args].join(" "));
    if (failOn && args.includes(failOn)) throw new Error(`${failOn} failed`);
    if (args[0] === "scripts/build-catalog-data.mjs") writeFileSync(path.join(cwd, "src/data/catalog.generated.json"), "admin-catalog");
    if (args.join(" ") === "run build") {
      mkdirSync(path.join(cwd, "out"), { recursive: true });
      const settings = readFileSync(path.join(cwd, "src/data/site-settings.json"), "utf8");
      const upload = existsSync(path.join(cwd, "public/images/products/uploads/anh-moi.png"));
      writeFileSync(path.join(cwd, "out/index.html"), `${settings}|upload=${upload}`);
    }
    if (command === "rsync") throw new Error("no rsync in test");
  };
}

test("publish builds from admin data, switches current atomically and restores the checkout", async () => {
  const f = fixture();
  const calls = [];
  const result = await publishWebsite({ ...f, run: fakeRun(calls), log: () => {}, releaseId: "20261011-120000" });
  assert.equal(result.releaseId, "20261011-120000");
  assert.ok(lstatSync(path.join(f.targetDir, "current")).isSymbolicLink());
  assert.equal(readlinkSync(path.join(f.targetDir, "current")), path.join("releases", "20261011-120000"));
  assert.equal(readFileSync(path.join(f.targetDir, "current/index.html"), "utf8"), "admin-settings|upload=true");
  // The checkout is left as it was, so `git pull` on the server never conflicts.
  assert.equal(readFileSync(path.join(f.websiteDir, "src/data/catalog.generated.json"), "utf8"), "repo-catalog");
  assert.equal(readFileSync(path.join(f.websiteDir, "src/data/site-settings.json"), "utf8"), "repo-settings");
  assert.equal(existsSync(path.join(f.websiteDir, "public/images/products/uploads")), false);
  assert.ok(calls.some((call) => call.includes("validate:export")));
});

test("a failed build keeps the live site and still restores the checkout", async () => {
  const f = fixture();
  await publishWebsite({ ...f, run: fakeRun([]), log: () => {}, releaseId: "20261011-120000" });
  await assert.rejects(() => publishWebsite({ ...f, run: fakeRun([], { failOn: "build" }), log: () => {}, releaseId: "20261011-130000" }), /build failed/);
  assert.equal(listReleases(f.targetDir).current, "20261011-120000");
  assert.equal(readFileSync(path.join(f.websiteDir, "src/data/catalog.generated.json"), "utf8"), "repo-catalog");
});

test("only the newest releases are kept and rollback switches back", async () => {
  const f = fixture();
  for (const id of ["20261011-100000", "20261011-110000", "20261011-120000", "20261011-130000"]) {
    await publishWebsite({ ...f, run: fakeRun([]), log: () => {}, releaseId: id, keep: 3 });
  }
  assert.deepEqual(listReleases(f.targetDir), { releases: ["20261011-110000", "20261011-120000", "20261011-130000"], current: "20261011-130000" });
  switchCurrent(f.targetDir, "20261011-120000");
  assert.equal(listReleases(f.targetDir).current, "20261011-120000");
  assert.throws(() => switchCurrent(f.targetDir, "../../etc"), /không hợp lệ/);
  assert.throws(() => switchCurrent(f.targetDir, "20261011-100000"), /Không có bản/);
});

test("refuses to replace a real directory named current", async () => {
  const f = fixture();
  mkdirSync(path.join(f.targetDir, "current"), { recursive: true });
  await assert.rejects(() => publishWebsite({ ...f, run: fakeRun([]), log: () => {}, releaseId: "20261011-120000" }), /không phải symlink/);
});
