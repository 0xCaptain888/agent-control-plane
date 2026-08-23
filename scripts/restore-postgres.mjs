import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
const backupFile = process.env.BACKUP_FILE;
if (!databaseUrl || !backupFile) throw new Error("DATABASE_URL and BACKUP_FILE are required");
if (process.env.CONFIRM_RESTORE !== "yes") throw new Error("set CONFIRM_RESTORE=yes to restore a database");
await exec("pg_restore", ["--clean", "--if-exists", "--dbname", databaseUrl, backupFile]);
console.log(JSON.stringify({ status: "restore_completed", file: backupFile }, null, 2));
