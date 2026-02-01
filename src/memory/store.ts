import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { config } from "../config.js";

type MemoryData = Record<string, string>;

const dir = config.memoryDir;

async function ensureDir(): Promise<void> {
  await mkdir(dir, { recursive: true });
}

function userPath(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(dir, `user_${safe}.json`);
}

export async function memoryGet(userId: string, key?: string): Promise<string> {
  await ensureDir();
  const path = userPath(userId);
  let data: MemoryData = {};
  try {
    const raw = await readFile(path, "utf8");
    data = JSON.parse(raw) as MemoryData;
  } catch {
    // 文件不存在或无效
  }
  if (!key) {
    return Object.keys(data).length ? JSON.stringify(data, null, 2) : "（暂无记忆）";
  }
  const value = data[key];
  return value ?? "（无此键）";
}

export async function memorySet(userId: string, key: string, value: string): Promise<void> {
  await ensureDir();
  const path = userPath(userId);
  let data: MemoryData = {};
  try {
    const raw = await readFile(path, "utf8");
    data = JSON.parse(raw) as MemoryData;
  } catch {
    // ignore
  }
  data[key] = value;
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}
