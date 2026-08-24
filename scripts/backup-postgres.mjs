import { mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const output = process.env.BACKUP_FILE ?? `backups/agentguard-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
await mkdir(output.split("/").slice(0, -1).join("/") || ".", { recursive: true });
await exec("pg_dump", ["--format=custom", "--file", output, databaseUrl]);
console.log(JSON.stringify({ status: "backup_created", file: output }, null, 2));
