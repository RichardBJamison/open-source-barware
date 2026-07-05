/**
 * When NEXT_PUBLIC_DOWNLOADS_MANUAL_LOCK=true, strip program installer zips
 * from public/ so static export cannot serve them by direct URL.
 */
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const locked = process.env.NEXT_PUBLIC_DOWNLOADS_MANUAL_LOCK === "true";

const programZips = [
  "public/downloads/open-source-barware-program-mac.zip",
  "public/downloads/open-source-barware-program-win.zip",
];

if (!locked) {
  console.log("apply-download-lock: manual lock off — program zips stay in public/");
  process.exit(0);
}

for (const rel of programZips) {
  const absolute = path.join(root, rel);
  if (existsSync(absolute)) {
    unlinkSync(absolute);
    console.log(`apply-download-lock: removed ${rel}`);
  }
}

console.log("apply-download-lock: program installers withheld (manual lock on)");