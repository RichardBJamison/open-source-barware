import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const downloadsDir = "public/downloads";
const downloadArchive = `${downloadsDir}/open-source-barware-download-package.zip`;
const sourceArchive = `${downloadsDir}/open-source-barware-source.zip`;

const downloadPackageFiles = [
  `${downloadsDir}/README.md`,
  `${downloadsDir}/LICENSE.txt`,
  `${downloadsDir}/NOTICE.md`,
  `${downloadsDir}/SOURCE-OFFER.md`,
  `${downloadsDir}/Bar-Inventory-Master.xlsx`,
  `${downloadsDir}/Quick-Count-Sheet.xlsx`,
  `${downloadsDir}/Variance-Calculator.xlsx`,
  `${downloadsDir}/Product-Database.xlsx`,
  `${downloadsDir}/master-prompt.md`,
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || `${command} failed`;
    throw new Error(detail.trim());
  }

  return result.stdout ?? "";
}

function removeIfPresent(file) {
  const absolute = path.join(root, file);
  if (existsSync(absolute)) {
    unlinkSync(absolute);
  }
}

function assertFiles(files) {
  const missing = files.filter((file) => !existsSync(path.join(root, file)));
  if (missing.length > 0) {
    throw new Error(`Missing package files:\n${missing.join("\n")}`);
  }
}

mkdirSync(path.join(root, downloadsDir), { recursive: true });
assertFiles(downloadPackageFiles);

removeIfPresent(downloadArchive);
run("zip", ["-q", "-X", "-j", downloadArchive, ...downloadPackageFiles], {
  stdio: "inherit",
});

const listedFiles = run("git", [
  "ls-files",
  "--cached",
  "--modified",
  "--others",
  "--exclude-standard",
]);

const excludedFromSource = new Set([downloadArchive, sourceArchive]);
const sourceFiles = Array.from(
  new Set(listedFiles.split(/\r?\n/).filter(Boolean)),
)
  .filter((file) => !excludedFromSource.has(file))
  .filter((file) => !file.startsWith(".git/"));

assertFiles(sourceFiles);
removeIfPresent(sourceArchive);
run("zip", ["-q", "-X", sourceArchive, ...sourceFiles], {
  stdio: "inherit",
});

console.log(`Wrote ${downloadArchive}`);
console.log(`Wrote ${sourceArchive}`);
