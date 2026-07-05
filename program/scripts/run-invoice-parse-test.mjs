#!/usr/bin/env node
/** Local invoice text parser + API smoke (no AI key required for local). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.OSB_TEST_URL || "http://localhost:5052";
const SAMPLE = path.join(
  __dir,
  "../test-kit/harbor-hearth-full-test/part-4-week1-inputs/invoice-southern-glazers-0701.txt"
);

function pyParse(text) {
  const r = spawnSync(
    "python3",
    [
      "-c",
      `import json,sys; from invoice_parse import parse_invoice_text_local; print(json.dumps(parse_invoice_text_local(sys.stdin.read())))`,
    ],
    { input: text, cwd: path.join(__dir, ".."), encoding: "utf-8" }
  );
  if (r.status !== 0) throw new Error(r.stderr || "python parse failed");
  return JSON.parse(r.stdout);
}

async function api(method, route, body) {
  const r = await fetch(`${BASE}${route}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

async function main() {
  const text = fs.readFileSync(SAMPLE, "utf8");
  const local = pyParse(text);
  if (local.line_count < 8) {
    console.error(`FAIL: local parser got ${local.line_count} lines, expected >= 8`);
    process.exit(1);
  }
  console.log(`  ✓ local parser: ${local.line_count} lines, vendor=${local.vendor.slice(0, 30)}…`);

  const ping = await api("GET", "/ping");
  if (ping.ok) {
    const res = await api("POST", "/api/inputs/invoice/parse", { text });
    if (!res.ok || !res.data.invoice?.lines?.length) {
      console.error("FAIL: API parse", res.data);
      process.exit(1);
    }
    console.log(`  ✓ API parse: ${res.data.invoice.lines.length} lines (${res.data.invoice.parse_source})`);
  } else {
    console.log("  ⊘ API parse skipped (server not running)");
  }

  console.log("\nPASS — invoice parse");
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});