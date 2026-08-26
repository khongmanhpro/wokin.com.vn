import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const projectRoot = path.resolve(import.meta.dirname, "..");
const nativeRequire = createRequire(import.meta.url);

function loadTypeScriptModule(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };

  function localRequire(specifier) {
    if (specifier.startsWith("@/data/") && specifier.endsWith(".json")) {
      return JSON.parse(readFileSync(path.join(projectRoot, "src", specifier.slice(2)), "utf8"));
    }
    return nativeRequire(specifier);
  }

  vm.runInNewContext(output, {
    console,
    exports: module.exports,
    module,
    require: localRequire,
  }, { filename });
  return module.exports;
}

test("product specs become inert structured text instead of sanitized HTML", () => {
  const { parseProductSpec } = loadTypeScriptModule("src/lib/catalog.ts");
  assert.equal(typeof parseProductSpec, "function");

  const result = parseProductSpec(`
    <p onclick="alert(1)">&gt; Điện áp: 20V<br onmouseover="alert(2)">
    &gt; An toàn<img src=x onerror="alert(3)"></p>
    <script>alert("script")</script><style>body{display:none}</style>
    <iframe srcdoc="<script>alert(4)</script>">frame text</iframe>
    <table style="background:url(javascript:alert(5))"><tr>
      <td onclick="alert(6)">STOCK NO.</td>
      <td><a href="javascript:alert(7)">ABC<br>123</a></td>
      <td><a href="data:text/html,evil">QTY./CARTON</a></td>
    </tr></table>
  `);

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    lines: ["> Điện áp: 20V", "> An toàn"],
    table: [["MÃ KHO", "ABC 123", "SL/THÙNG"]],
  });
  assert.doesNotMatch(JSON.stringify(result), /script|style|iframe|javascript:|data:|onerror|onclick|alert/i);
});

test("JSON-LD serializer escapes script breakers and remains parseable in rendered HTML", () => {
  const { JsonLd, serializeJsonLd } = loadTypeScriptModule("src/components/JsonLd.tsx");
  const { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const payload = {
    name: "</script><script>alert('xss')</script>",
    punctuation: "< > &",
    separators: "line\u2028paragraph\u2029end",
  };

  const serialized = serializeJsonLd(payload);
  assert.doesNotMatch(serialized, /[<>&\u2028\u2029]/u);
  assert.deepEqual(JSON.parse(serialized), payload);

  const html = renderToStaticMarkup(JsonLd({ data: payload }));
  const match = html.match(/^<script type="application\/ld\+json">([\s\S]*)<\/script>$/);
  assert.ok(match, html);
  assert.deepEqual(JSON.parse(match[1]), payload);
  assert.equal((html.match(/<script/g) ?? []).length, 1);
});

test("product page has no raw product HTML injection path", () => {
  const page = readFileSync(path.join(projectRoot, "src/app/san-pham/[slug_vi]/page.tsx"), "utf8");
  assert.doesNotMatch(page, /dangerouslySetInnerHTML|translatedSpecHtml/);
  assert.match(page, /parseProductSpec/);
});

test("Hostinger Apache config sets static security headers and leaves HSTS opt-in", () => {
  const config = readFileSync(path.join(projectRoot, "deploy/hostinger/.htaccess"), "utf8");
  assert.match(config, /X-Content-Type-Options\s+"nosniff"/);
  assert.match(config, /Referrer-Policy\s+"strict-origin-when-cross-origin"/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /X-Frame-Options\s+"SAMEORIGIN"/);
  assert.match(config, /Content-Security-Policy/);
  assert.doesNotMatch(config, /unsafe-eval/);
  assert.doesNotMatch(config, /^\s*Header\s+always\s+set\s+Strict-Transport-Security/m);
});
