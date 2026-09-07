/**
 * Best-effort JSON files under .data/ for local demo persistence.
 * On Vercel the deploy filesystem is read-only, so writes are skipped
 * and callers keep an in-memory copy for that instance.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function dataFile(name: string): string {
  return path.join(process.cwd(), ".data", name);
}

export async function readJsonRecord<T>(
  file: string,
): Promise<Record<string, T>> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as Record<string, T>;
  } catch {
    return {};
  }
}

export async function writeJsonRecord(
  file: string,
  value: unknown,
): Promise<void> {
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(value, null, 2), "utf8");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (
      code === "ENOENT" ||
      code === "EROFS" ||
      code === "EACCES" ||
      code === "EPERM"
    ) {
      return;
    }
    throw error;
  }
}
