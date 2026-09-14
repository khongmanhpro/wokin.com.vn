import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { finished } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultHtaccess = path.join(projectRoot, "deploy/hostinger/.htaccess");
const packageDirectoryName = "hostinger";
const manifestName = "SHA256SUMS";
const archiveName = "wokin-hostinger.tar.gz";
const forbiddenSegments = new Set([".git", ".next", ".cache", ".npm", "node_modules"]);
const sensitiveNames = new Set(["credentials.json", "secrets.json"]);
const sensitiveExtensions = new Set([".key", ".p12", ".pem", ".pfx"]);
const secretPatterns = [
  /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[opsu]_[A-Za-z0-9]{20,}\b/,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  /^(?:export\s+)?[A-Z][A-Z0-9_]*(?:API_KEY|PASSWORD|SECRET|TOKEN)[A-Z0-9_]*\s*=\s*\S{8,}\s*$/m,
];

function comparePaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeRelative(value) {
  return value.split(path.sep).join("/");
}

function pathsOverlap(left, right) {
  const relative = path.relative(left, right);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function assertSafePaths(outDir, releaseDir) {
  if (pathsOverlap(outDir, releaseDir) || pathsOverlap(releaseDir, outDir)) {
    throw new Error("Output and release paths must not overlap or be inside one another.");
  }
}

function forbiddenReason(relative) {
  const normalized = normalizeRelative(relative);
  const segments = normalized.split("/");
  const basename = segments.at(-1).toLowerCase();
  if (segments.some((segment) => forbiddenSegments.has(segment.toLowerCase()))) return "development cache/source directory";
  if (basename === ".env" || basename.startsWith(".env.")) return "environment file";
  if (basename.endsWith(".map")) return "source map";
  if (/^(?:npm-)?audit(?:[-_.].*)?\.json$/i.test(basename)) return "raw audit data";
  if (sensitiveNames.has(basename) || sensitiveExtensions.has(path.extname(basename))) return "sensitive credential file";
  return null;
}

function scanFile(file, relative) {
  const reason = forbiddenReason(relative);
  if (reason) throw new Error(`Forbidden ${reason}: ${normalizeRelative(relative)}.`);
  const buffer = readFileSync(file);
  const text = buffer.includes(0) ? "" : buffer.toString("utf8");
  if (text && secretPatterns.some((pattern) => pattern.test(text))) {
    throw new Error(`Secret-like content detected in ${normalizeRelative(relative)}.`);
  }
  return buffer;
}

function collectTree(root) {
  const files = [];
  const directories = [];
  function visit(directory, relativeDirectory = "") {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => comparePaths(a.name, b.name));
    for (const entry of entries) {
      const relative = path.join(relativeDirectory, entry.name);
      const source = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Forbidden symbolic link: ${normalizeRelative(relative)}.`);
      if (entry.isDirectory()) {
        const reason = forbiddenReason(relative);
        if (reason) throw new Error(`Forbidden ${reason}: ${normalizeRelative(relative)}.`);
        directories.push(relative);
        visit(source, relative);
      } else if (entry.isFile()) {
        files.push({ buffer: scanFile(source, relative), relative, source });
      } else {
        throw new Error(`Unsupported filesystem entry: ${normalizeRelative(relative)}.`);
      }
    }
  }
  visit(root);
  return { directories, files };
}

function copyTree(tree, targetRoot) {
  mkdirSync(targetRoot, { recursive: true, mode: 0o755 });
  for (const relative of tree.directories) mkdirSync(path.join(targetRoot, relative), { recursive: true, mode: 0o755 });
  for (const file of tree.files) writeFileSync(path.join(targetRoot, file.relative), file.buffer, { mode: 0o644 });
}

function checksum(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function manifestFor(packageDir) {
  const tree = collectTree(packageDir);
  const lines = tree.files
    .map((file) => `${checksum(file.buffer)}  ${packageDirectoryName}/${normalizeRelative(file.relative)}`)
    .sort(comparePaths);
  return `${lines.join("\n")}\n`;
}

function splitTarPath(name) {
  if (Buffer.byteLength(name) <= 100) return { name, prefix: "" };
  for (let index = name.lastIndexOf("/"); index > 0; index = name.lastIndexOf("/", index - 1)) {
    const prefix = name.slice(0, index);
    const basename = name.slice(index + 1);
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(basename) <= 100) return { name: basename, prefix };
  }
  throw new Error(`Archive path exceeds ustar limits: ${name}.`);
}

function writeString(buffer, offset, length, value) {
  const encoded = Buffer.from(value);
  if (encoded.length > length) throw new Error(`Tar header value is too long: ${value}.`);
  encoded.copy(buffer, offset);
}

function writeOctal(buffer, offset, length, value) {
  const digits = Math.trunc(value).toString(8).padStart(length - 2, "0");
  if (digits.length > length - 2) throw new Error(`Tar numeric value is too large: ${value}.`);
  writeString(buffer, offset, length, `${digits}\0 `);
}

function tarHeader(name, size, type) {
  const header = Buffer.alloc(512);
  const split = splitTarPath(name);
  writeString(header, 0, 100, split.name);
  writeOctal(header, 100, 8, type === "5" ? 0o755 : 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  writeString(header, 156, 1, type);
  writeString(header, 257, 6, "ustar\0");
  writeString(header, 263, 2, "00");
  writeString(header, 345, 155, split.prefix);
  const headerChecksum = header.reduce((sum, byte) => sum + byte, 0);
  writeOctal(header, 148, 8, headerChecksum);
  return header;
}

async function writeChunk(stream, chunk) {
  if (!stream.write(chunk)) await new Promise((resolve) => stream.once("drain", resolve));
}

async function writeFileToTar(stream, file, archivePath) {
  const size = statSync(file).size;
  await writeChunk(stream, tarHeader(archivePath, size, "0"));
  for await (const chunk of createReadStream(file)) await writeChunk(stream, chunk);
  const padding = (512 - (size % 512)) % 512;
  if (padding) await writeChunk(stream, Buffer.alloc(padding));
}

async function createDeterministicArchive(releaseRoot, archiveFile) {
  const packageDir = path.join(releaseRoot, packageDirectoryName);
  const tree = collectTree(packageDir);
  const directories = [packageDirectoryName, ...tree.directories.map((item) => `${packageDirectoryName}/${normalizeRelative(item)}`)]
    .map((item) => `${item}/`)
    .sort(comparePaths);
  const files = [
    ...tree.files.map((item) => ({ archivePath: `${packageDirectoryName}/${normalizeRelative(item.relative)}`, file: item.source })),
    { archivePath: manifestName, file: path.join(releaseRoot, manifestName) },
  ].sort((a, b) => comparePaths(a.archivePath, b.archivePath));

  const output = createWriteStream(archiveFile, { mode: 0o644 });
  const gzip = createGzip({ level: 9, mtime: 0 });
  gzip.pipe(output);
  for (const directory of directories) await writeChunk(gzip, tarHeader(directory, 0, "5"));
  for (const file of files) await writeFileToTar(gzip, file.file, file.archivePath);
  gzip.end(Buffer.alloc(1024));
  await finished(output);
}

export async function packageRelease(options = {}) {
  const outDir = path.resolve(options.outDir ?? path.join(projectRoot, "out"));
  const releaseDir = path.resolve(options.releaseDir ?? path.join(projectRoot, "release"));
  const htaccessFile = path.resolve(options.htaccessFile ?? defaultHtaccess);
  if (!existsSync(outDir) || !statSync(outDir).isDirectory()) throw new Error(`Output directory does not exist: ${outDir}.`);
  if (!existsSync(htaccessFile) || !statSync(htaccessFile).isFile()) throw new Error(`Hostinger .htaccess does not exist: ${htaccessFile}.`);
  assertSafePaths(outDir, releaseDir);
  if (existsSync(releaseDir)) throw new Error(`Release directory already exists: ${releaseDir}.`);

  const sourceTree = collectTree(outDir);
  const htaccessBuffer = scanFile(htaccessFile, ".htaccess");
  const parent = path.dirname(releaseDir);
  mkdirSync(parent, { recursive: true });
  const temporaryDir = mkdtempSync(path.join(parent, `.${path.basename(releaseDir)}-tmp-`));
  try {
    const packageDir = path.join(temporaryDir, packageDirectoryName);
    copyTree(sourceTree, packageDir);
    writeFileSync(path.join(packageDir, ".htaccess"), htaccessBuffer, { mode: 0o644 });
    const manifestFile = path.join(temporaryDir, manifestName);
    writeFileSync(manifestFile, manifestFor(packageDir), { mode: 0o644 });
    const archiveFile = path.join(temporaryDir, archiveName);
    await createDeterministicArchive(temporaryDir, archiveFile);
    renameSync(temporaryDir, releaseDir);
    return {
      archiveFile: path.join(releaseDir, archiveName),
      files: sourceTree.files.length + 1,
      manifestFile: path.join(releaseDir, manifestName),
      packageDir: path.join(releaseDir, packageDirectoryName),
      releaseDir,
    };
  } catch (error) {
    rmSync(temporaryDir, { recursive: true, force: true });
    throw error;
  }
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`Missing value for ${argument}.`);
    if (argument === "--out-dir") options.outDir = value;
    else if (argument === "--release-dir") options.releaseDir = value;
    else throw new Error(`Unknown argument: ${argument}.`);
  }
  return options;
}

async function main() {
  try {
    const result = await packageRelease(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
