import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { join, resolve } from "path";
import { config } from "../config.js";

const workspace = resolve(config.workspaceDir);

function resolvePath(raw: string): string {
  const p = raw.trim();
  if (p.startsWith("/")) return p;
  return join(workspace, p);
}

export async function readFileContent(path: string, encoding = "utf8"): Promise<string> {
  const full = resolvePath(path);
  try {
    return await readFile(full, encoding as BufferEncoding);
  } catch (e: unknown) {
    const err = e as { message?: string };
    return `读取失败: ${err.message ?? "Unknown"}`;
  }
}

export async function writeFileContent(
  path: string,
  content: string,
  append?: boolean
): Promise<string> {
  const full = resolvePath(path);
  try {
    await mkdir(resolve(full, ".."), { recursive: true });
    if (append) {
      const existing = await readFile(full, "utf8").catch(() => "");
      await writeFile(full, existing + content, "utf8");
    } else {
      await writeFile(full, content, "utf8");
    }
    return `已写入: ${full}`;
  } catch (e: unknown) {
    const err = e as { message?: string };
    return `写入失败: ${err.message ?? "Unknown"}`;
  }
}

export async function listDir(path: string): Promise<string> {
  const full = resolvePath(path);
  try {
    const entries = await readdir(full, { withFileTypes: true });
    const lines = entries.map((e) => (e.isDirectory() ? `[DIR]  ${e.name}` : `      ${e.name}`));
    return lines.length ? lines.join("\n") : "（空目录）";
  } catch (e: unknown) {
    const err = e as { message?: string };
    return `列出失败: ${err.message ?? "Unknown"}`;
  }
}
