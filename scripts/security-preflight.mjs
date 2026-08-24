import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const envExample = await readFile(".env.example", "utf8");
const failures = [];

if (!/ALLOW_MAINNET_EXECUTION=false/.test(envExample)) failures.push("mainnet execution must be disabled in .env.example");
if (/PRIVATE_KEY\s*=\s*[^\s#]+/i.test(envExample)) failures.push(".env.example must not contain a private key");
if (/^OKX_API_(KEY|SECRET|PASSPHRASE)=[ \t]*\S+/m.test(envExample)) failures.push(".env.example must not contain live OKX credentials");

const { stdout } = await exec("git", ["ls-files"]);
const tracked = stdout.trim().split("\n").filter(Boolean);
for (const file of tracked) {
  if (file === ".env.example" || file.includes("node_modules")) continue;
  if (/\.env($|\.)/.test(file) || /\.pem$|\.key$/.test(file)) failures.push(`secret-like file tracked: ${file}`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "failed", failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "passed", checks: ["mainnet default-off", "no credentials in env example", "no tracked secret-like files"] }, null, 2));
