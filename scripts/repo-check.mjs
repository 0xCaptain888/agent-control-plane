import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ignored = new Set([".git", "node_modules", "dist", "coverage", "scripts"]);
const forbidden = /planned|todo|not implemented|未完成/i;
const required = ["packages/control-plane/src/index.ts", "examples/okx-trade/src/demo.mjs", "apps/dashboard/src/index.html"];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path);
  }
  return files;
}

const files = await walk(process.cwd());
const failures = [];
for (const file of files) {
  if (!/\.(md|json|ts|mjs|html)$/.test(file)) continue;
  const content = await readFile(file, "utf8");
  if (forbidden.test(content)) failures.push(`${file}: contains unfinished marker`);
}
for (const file of required) {
  try { await readFile(join(process.cwd(), file)); } catch { failures.push(`${file}: required file missing`); }
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`repo-check passed (${files.length} files scanned)`);
