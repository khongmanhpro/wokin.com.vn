import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { outDir: path.join(projectRoot, "out"), dataDir: path.join(projectRoot, "src/data") };
  for (let index = 0; index < argv.length; index += 2) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`Thiếu giá trị cho ${argument}.`);
    if (argument === "--out-dir") options.outDir = path.resolve(value);
    else if (argument === "--data-dir") options.dataDir = path.resolve(value);
    else throw new Error(`Đối số không hợp lệ: ${argument}.`);
  }
  return options;
}

function safeTarget(outDir, requestPath) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(requestPath, "http://localhost").pathname); }
  catch { return null; }
  if (pathname.split("/").includes("..")) return null;
  const relative = pathname.replace(/^\/+/, "");
  const direct = path.join(outDir, relative);
  const candidates = path.extname(pathname) ? [direct] : [path.join(direct, "index.html")];
  const target = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  return target && target.startsWith(path.resolve(outDir)) ? target : null;
}

function contentType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (file.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export async function smokeStaticServer(options) {
  if (!existsSync(options.outDir)) throw new Error(`Export directory không tồn tại: ${options.outDir}.`);
  const translations = JSON.parse(readFileSync(path.join(options.dataDir, "products_vi.json"), "utf8"));
  const categories = JSON.parse(readFileSync(path.join(options.dataDir, "categories.json"), "utf8"));
  if (!translations[0]?.slug_vi || !categories[0]?.slug) throw new Error("Không suy ra được representative catalog routes.");
  const routes = [
    "/", "/san-pham/", "/san-pham-moi/", "/gp20v/", "/about/", "/distributors/", "/contact/",
    `/danh-muc/${categories[0].slug}/`, `/san-pham/${translations[0].slug_vi}/`, "/sitemap.xml", "/robots.txt",
  ];
  const server = createServer((request, response) => {
    const target = safeTarget(options.outDir, request.url ?? "/");
    if (!target) { response.writeHead(404); response.end("Not found"); return; }
    response.writeHead(200, { "Content-Type": contentType(target) });
    createReadStream(target).pipe(response);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const failures = [];
  try {
    for (const route of routes) {
      const response = await fetch(`${base}${route}`);
      if (response.status !== 200) failures.push(`${route}: HTTP ${response.status}`);
      await response.arrayBuffer();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  if (failures.length) throw new Error(`Static smoke failures: ${failures.join("; ")}`);
  return { routes: routes.length };
}

async function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; return; }
  try {
    const result = await smokeStaticServer(options);
    console.log(`Static server smoke passed: ${result.routes} representative routes returned HTTP 200.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
