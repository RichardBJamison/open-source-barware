#!/usr/bin/env node
/**
 * Build customer program zips for Mac + Windows download.
 * Output: public/downloads/open-source-barware-program-mac.zip
 *         public/downloads/open-source-barware-program-win.zip
 */
import archiver from "archiver";
import {
  chmodSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const programDir = path.join(root, "program");
const outDir = path.join(root, "public", "downloads");

const LICENSE_SRC = path.join(root, "public", "downloads", "LICENSE.txt");

const PROGRAM_FILES = [
  "server.py",
  "invoice_parse.py",
  "requirements.txt",
  "osb_config.example.json",
  "README-INSTALL.txt",
  "LICENSE.txt",
  "VERSION.txt",
  "install.sh",
  "install.ps1",
  "Install.command",
  "Install.bat",
  "Start.command",
  "Start.bat",
  "Stop.command",
  "Stop.bat",
  "start-server.ps1",
  "scripts/windows-vc.ps1",
  "static/downloads/Bar-Inventory-Master.xlsx",
  "static/setup.html",
  "static/home.html",
  "static/api-guide.html",
  "static/standard-setups.html",
  "static/css/app.css",
  "static/js/osb-app.js",
];

function listFilesRecursive(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFilesRecursive(full, base));
    else out.push(path.relative(base, full));
  }
  return out;
}

const TEST_KIT_DIR = path.join(programDir, "test-kit");
const TEST_KIT_FILES = existsSync(TEST_KIT_DIR)
  ? listFilesRecursive(TEST_KIT_DIR).map((rel) => `test-kit/${rel.replace(/\\/g, "/")}`)
  : [];

function assertFiles() {
  const missing = PROGRAM_FILES.filter((f) => !existsSync(path.join(programDir, f)));
  if (!existsSync(LICENSE_SRC)) missing.push("public/downloads/LICENSE.txt (source for LICENSE.txt)");
  if (missing.length) throw new Error(`Missing program files:\n${missing.join("\n")}`);
}

function stageLicenseInProgramDir() {
  const dest = path.join(programDir, "LICENSE.txt");
  copyFileSync(LICENSE_SRC, dest);
}

async function zipProgram(archiveName, prefix) {
  const outPath = path.join(outDir, archiveName);
  if (existsSync(outPath)) unlinkSync(outPath);

  await new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    for (const rel of [...PROGRAM_FILES, ...TEST_KIT_FILES]) {
      archive.file(path.join(programDir, rel), { name: `${prefix}/${rel}` });
    }
    archive.finalize();
  });
  return outPath;
}

stageLicenseInProgramDir();
assertFiles();
for (const cmd of ["Install.command", "Start.command", "Stop.command"]) {
  try {
    chmodSync(path.join(programDir, cmd), 0o755);
  } catch {}
}
mkdirSync(outDir, { recursive: true });

const macZip = await zipProgram("open-source-barware-program-mac.zip", "open-source-barware-program");
const winZip = await zipProgram("open-source-barware-program-win.zip", "open-source-barware-program");

console.log("Program packages built:");
console.log(`  ${macZip}`);
console.log(`  ${winZip}`);