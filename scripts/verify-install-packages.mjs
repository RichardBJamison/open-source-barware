#!/usr/bin/env node
/**
 * Verify Mac + Windows program zips before release.
 * - Manifest check (critical files)
 * - Mac: simulate install → venv → ping
 */
import { execSync, spawn } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const macZip = path.join(root, "public/downloads/open-source-barware-program-mac.zip");
const winZip = path.join(root, "public/downloads/open-source-barware-program-win.zip");
const PORT = 5056;

const REQUIRED = [
  "open-source-barware-program/server.py",
  "open-source-barware-program/invoice_parse.py",
  "open-source-barware-program/requirements.txt",
  "open-source-barware-program/README-INSTALL.txt",
  "open-source-barware-program/LICENSE.txt",
  "open-source-barware-program/VERSION.txt",
  "open-source-barware-program/Install.command",
  "open-source-barware-program/Install.bat",
  "open-source-barware-program/static/setup.html",
  "open-source-barware-program/static/home.html",
  "open-source-barware-program/static/js/osb-app.js",
  "open-source-barware-program/static/css/app.css",
];

const failures = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  failures.push(msg);
  console.error(`  ✗ ${msg}`);
};

function zipList(zipPath) {
  const out = execSync(`unzip -Z1 "${zipPath}"`, { encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

function assertZip(zipPath, label) {
  if (!existsSync(zipPath)) {
    fail(`${label} missing: ${zipPath}`);
    return [];
  }
  const entries = zipList(zipPath);
  const size = execSync(`stat -f%z "${zipPath}"`, { encoding: "utf8" }).trim();
  ok(`${label} exists (${(Number(size) / 1024 / 1024).toFixed(2)} MB, ${entries.length} entries)`);
  for (const req of REQUIRED) {
    if (!entries.includes(req)) fail(`${label} missing ${req}`);
    else ok(`${label} has ${req.split("/").pop()}`);
  }
  const readme = entries.find((e) => e.endsWith("README-INSTALL.txt"));
  if (readme) {
    const tmp = mkdtempSync(path.join(tmpdir(), "osb-readme-"));
    execSync(`unzip -p "${zipPath}" "${readme}" > "${path.join(tmp, "r.txt")}"`);
    const text = readFileSync(path.join(tmp, "r.txt"), "utf8");
    rmSync(tmp, { recursive: true });
    if (!text.includes("CLEAN UP YOUR DOWNLOADS")) fail(`${label} README missing cleanup section`);
    else ok(`${label} README has cleanup instructions`);
    if (!text.includes("v1.0") && !text.includes("1.0")) fail(`${label} README missing version`);
    else ok(`${label} README version noted`);
  }
  return entries;
}

async function waitPing(port, ms = 20000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/ping`);
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function simulateMacInstall() {
  console.log("\n── Mac install simulation ──");
  const work = mkdtempSync(path.join(tmpdir(), "osb-mac-install-"));
  const installDir = path.join(work, "osb-program");
  try {
    execSync(`unzip -o -q "${macZip}" -d "${work}"`);
    const src = path.join(work, "open-source-barware-program");
    mkdirSync(installDir, { recursive: true });
    cpSync(src, installDir, { recursive: true });

    const python =
      ["/opt/homebrew/bin/python3", "/usr/local/bin/python3", "/usr/bin/python3"].find((p) => {
        try {
          execSync(`"${p}" --version`, { stdio: "ignore" });
          return true;
        } catch {
          return false;
        }
      }) || fail("Python 3 not found for simulation");

    if (!python) return;

    execSync(`"${python}" -m venv "${path.join(installDir, ".venv")}"`);
    const vpy = path.join(installDir, ".venv/bin/python3");
    execSync(`"${vpy}" -m pip install -r "${path.join(installDir, "requirements.txt")}" -q`);
    execSync(`"${vpy}" -c "import flask, openpyxl; import invoice_parse"`, {
      cwd: installDir,
    });
    ok("venv + imports (flask, openpyxl, invoice_parse)");

    const proc = spawn(vpy, ["server.py"], {
      cwd: installDir,
      env: { ...process.env, PORT: String(PORT) },
      stdio: "ignore",
    });

    const pingOk = await waitPing(PORT, 15000);
    if (pingOk) {
      ok(`server responds on :${PORT} from simulated install`);
      const setup = await fetch(`http://127.0.0.1:${PORT}/setup`);
      const html = await setup.text();
      if (html.includes("welcomeAiPanel") && html.includes("20260705-positioning")) {
        ok("setup page serves v1.0 positioning build");
      } else {
        fail("setup page missing expected v1.0 markers");
      }
    } else {
      fail("server did not respond on :5052 after simulated install");
    }

    proc.kill("SIGTERM");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

console.log("VERIFY INSTALL PACKAGES — v1.0\n");
assertZip(macZip, "Mac zip");
assertZip(winZip, "Windows zip");

if (process.platform === "darwin") {
  await simulateMacInstall();
} else {
  console.log("\n  (skip Mac install simulation — not on macOS)");
}

console.log("\n" + "═".repeat(50));
if (failures.length) {
  console.error(`FAILED — ${failures.length} issue(s)`);
  failures.forEach((f) => console.error(`  • ${f}`));
  process.exit(1);
}
console.log("PASS — install packages ready for release");