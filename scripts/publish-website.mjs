// Builds the public website from an admin release export and switches the live folder to it.
//
//   node scripts/publish-website.mjs --release <catalog-release.json> --site-settings <site-settings.json> \
//     --target <publish dir> [--uploads <admin media dir>] [--keep 3] [--release-id YYYYMMDD-HHMMSS]
//   node scripts/publish-website.mjs --rollback <releaseId> --target <publish dir>
//
// The publish dir holds releases/<id>/ (full static sites) and a `current` symlink that the web server
// (nginx root) points at, so switching or rolling back is one atomic rename. The checkout's generated data
// files are restored afterwards, so `git pull` keeps working on the server.
import { spawn } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Files under src/data that a publish overwrites (catalog data from the release, settings from the admin,
// image metadata from the prebuild step). They are restored after every run.
export const GENERATED_DATA_FILES = Object.freeze([
  "README.md",
  "catalog-data.checksums.json",
  "catalog.generated.json",
  "categories.json",
  "image-metadata.generated.json",
  "products_vi.json",
  "search-index.json",
  "site-settings.json",
  "vi-glossary.json",
]);
const UPLOADS_PUBLIC_DIR = "public/images/products/uploads";
const RELEASE_ID = /^\d{8}-\d{6}(?:-\d+)?$/;

export function newReleaseId(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

export function listReleases(targetDir) {
  const releasesDir = path.join(targetDir, "releases");
  const releases = existsSync(releasesDir) ? readdirSync(releasesDir).filter((name) => RELEASE_ID.test(name)).sort() : [];
  const currentLink = path.join(targetDir, "current");
  let current = null;
  if (existsSync(currentLink) && lstatSync(currentLink).isSymbolicLink()) current = path.basename(readlinkSync(currentLink));
  return { releases, current };
}

/** Points <target>/current at releases/<id> with an atomic rename (no moment where the site is missing). */
export function switchCurrent(targetDir, releaseId) {
  if (!RELEASE_ID.test(releaseId)) throw new Error(`Mã phiên bản không hợp lệ: ${releaseId}`);
  const releaseDir = path.join(targetDir, "releases", releaseId);
  if (!existsSync(path.join(releaseDir, "index.html"))) throw new Error(`Không có bản website ${releaseId}.`);
  const currentLink = path.join(targetDir, "current");
  if (existsSync(currentLink) && !lstatSync(currentLink).isSymbolicLink()) {
    throw new Error(`${currentLink} là thư mục thật, không phải symlink; hãy chuyển nó vào releases/ trước khi xuất bản.`);
  }
  const temporaryLink = path.join(targetDir, `.current-${process.pid}`);
  rmSync(temporaryLink, { force: true });
  symlinkSync(path.join("releases", releaseId), temporaryLink);
  renameSync(temporaryLink, currentLink);
}

export function pruneReleases(targetDir, keep) {
  const { releases, current } = listReleases(targetDir);
  const removable = releases.filter((id) => id !== current);
  const excess = removable.length - Math.max(keep - 1, 0);
  for (const id of removable.slice(0, Math.max(excess, 0))) rmSync(path.join(targetDir, "releases", id), { recursive: true, force: true });
}

function defaultRun(command, args, { cwd, env, log }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    const forward = (chunk) => { for (const line of chunk.toString().split("\n")) if (line.trim()) log(line); };
    child.stdout.on("data", forward);
    child.stderr.on("data", forward);
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} thoát với mã ${code}`))));
  });
}

async function copySite(outDir, releaseDir, previousDir, run, log) {
  // rsync --link-dest hard-links files unchanged since the previous release, so keeping old releases is cheap.
  try {
    await run("rsync", ["-a", "--delete", ...(previousDir ? [`--link-dest=${previousDir}`] : []), `${outDir}/`, `${releaseDir}/`], { log });
  } catch (error) {
    log(`rsync không dùng được (${error.message}); chép toàn bộ thư mục.`);
    rmSync(releaseDir, { recursive: true, force: true });
    cpSync(outDir, releaseDir, { recursive: true });
  }
}

export async function publishWebsite({
  websiteDir = projectRoot,
  releaseFile,
  siteSettingsFile,
  uploadsDir,
  targetDir,
  keep = 3,
  env = {},
  log = (line) => console.log(line),
  run = defaultRun,
  releaseId = newReleaseId(),
}) {
  if (!releaseFile || !existsSync(releaseFile)) throw new Error("Thiếu file dữ liệu xuất bản (--release).");
  if (!siteSettingsFile || !existsSync(siteSettingsFile)) throw new Error("Thiếu file thông tin website (--site-settings).");
  if (!targetDir) throw new Error("Thiếu thư mục xuất bản (--target).");
  const dataDir = path.join(websiteDir, "src/data");
  const uploadsPublicDir = path.join(websiteDir, UPLOADS_PUBLIC_DIR);
  const backups = new Map(GENERATED_DATA_FILES.map((name) => {
    const file = path.join(dataDir, name);
    return [file, existsSync(file) ? readFileSync(file) : null];
  }));
  const runIn = (command, args) => run(command, args, { cwd: websiteDir, env, log });
  try {
    log("[1/6] Chuẩn bị dữ liệu sản phẩm từ admin");
    await runIn("node", ["scripts/build-catalog-data.mjs", "--snapshot", path.resolve(releaseFile)]);
    writeFileSync(path.join(dataDir, "site-settings.json"), readFileSync(siteSettingsFile));

    log("[2/6] Chép ảnh tải lên từ admin");
    rmSync(uploadsPublicDir, { recursive: true, force: true });
    if (uploadsDir && existsSync(uploadsDir)) cpSync(uploadsDir, uploadsPublicDir, { recursive: true });

    log("[3/6] Build website (vài phút)");
    await runIn("npm", ["run", "build"]);

    log("[4/6] Kiểm tra bản build");
    await runIn("npm", ["run", "validate:export"]);

    log("[5/6] Lưu bản website mới");
    const releasesDir = path.join(targetDir, "releases");
    mkdirSync(releasesDir, { recursive: true });
    const { current } = listReleases(targetDir);
    const releaseDir = path.join(releasesDir, releaseId);
    await copySite(path.join(websiteDir, "out"), releaseDir, current ? path.join(releasesDir, current) : null, (command, args, options) => run(command, args, { ...options, cwd: websiteDir, env }), log);

    log("[6/6] Chuyển website sang bản mới");
    switchCurrent(targetDir, releaseId);
    pruneReleases(targetDir, keep);
    log(`Xong: website đang chạy bản ${releaseId}.`);
    return { releaseId };
  } finally {
    for (const [file, content] of backups) {
      if (content === null) rmSync(file, { force: true });
      else writeFileSync(file, content);
    }
    rmSync(uploadsPublicDir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (!value) throw new Error(`Thiếu giá trị cho ${flag}.`);
    if (flag === "--release") options.releaseFile = path.resolve(value);
    else if (flag === "--site-settings") options.siteSettingsFile = path.resolve(value);
    else if (flag === "--uploads") options.uploadsDir = path.resolve(value);
    else if (flag === "--target") options.targetDir = path.resolve(value);
    else if (flag === "--keep") options.keep = Number(value);
    else if (flag === "--rollback") options.rollback = value;
    else if (flag === "--release-id") {
      if (!RELEASE_ID.test(value)) throw new Error(`Mã phiên bản không hợp lệ: ${value}.`);
      options.releaseId = value;
    }
    else throw new Error(`Đối số không hợp lệ: ${flag}.`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.rollback) {
    switchCurrent(options.targetDir, options.rollback);
    console.log(`Đã quay lại bản ${options.rollback}.`);
    return;
  }
  await publishWebsite(options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`LỖI: ${error.message}`);
    process.exit(1);
  });
}
