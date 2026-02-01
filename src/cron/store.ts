import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";

export interface CronJob {
  id: string;
  userId: string;
  chatId: string;
  /** Cron 表达式，如 "0 9 * * *" 表示每天 9:00。与 at 二选一。 */
  cron?: string;
  /** 单次提醒时间（ISO 字符串）。与 cron 二选一。 */
  at?: string;
  message: string;
  createdAt: string;
}

export interface CronJobsData {
  jobs: CronJob[];
}

const dir = config.cronDir;
const filePath = join(dir, "jobs.json");

async function ensureDir(): Promise<void> {
  await mkdir(dir, { recursive: true });
}

async function readData(): Promise<CronJobsData> {
  await ensureDir();
  try {
    const raw = await readFile(filePath, "utf8");
    const data = JSON.parse(raw) as CronJobsData;
    if (!Array.isArray(data.jobs)) data.jobs = [];
    return data;
  } catch {
    return { jobs: [] };
  }
}

async function writeData(data: CronJobsData): Promise<void> {
  await ensureDir();
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

/** 列出用户的提醒（不传 userId 则列出全部，供调度器用） */
export async function cronList(userId?: string): Promise<CronJob[]> {
  const data = await readData();
  if (userId) {
    return data.jobs.filter((j) => j.userId === userId);
  }
  return data.jobs;
}

/** 新增提醒。cron 与 at 二选一：cron 为周期（如每天 9 点），at 为单次 ISO 时间。 */
export async function cronAdd(job: Omit<CronJob, "id" | "createdAt">): Promise<CronJob> {
  const data = await readData();
  const hasCron = !!job.cron?.trim();
  const hasAt = !!job.at?.trim();
  if (!hasCron && !hasAt) {
    throw new Error("必须提供 cron（周期）或 at（单次时间）");
  }
  if (hasCron && hasAt) {
    throw new Error("cron 与 at 只能二选一");
  }
  const created: CronJob = {
    ...job,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  data.jobs.push(created);
  await writeData(data);
  return created;
}

/** 删除提醒 */
export async function cronRemove(id: string, userId?: string): Promise<boolean> {
  const data = await readData();
  const idx = data.jobs.findIndex((j) => j.id === id && (userId == null || j.userId === userId));
  if (idx === -1) return false;
  data.jobs.splice(idx, 1);
  await writeData(data);
  return true;
}

/** 获取应在指定时间触发的任务（供调度器每分钟调用） */
export async function cronGetDue(now: Date): Promise<CronJob[]> {
  const data = await readData();
  const due: CronJob[] = [];
  const startOfMinute = new Date(now);
  startOfMinute.setSeconds(0, 0);
  const prevMinute = new Date(startOfMinute.getTime() - 1);

  for (const job of data.jobs) {
    if (job.at) {
      const atTime = new Date(job.at).getTime();
      if (atTime <= now.getTime()) due.push(job);
      continue;
    }
    if (job.cron) {
      try {
        const { parseExpression } = await import("cron-parser");
        const interval = parseExpression(job.cron, { currentDate: prevMinute });
        const nextRun = interval.next().getTime();
        if (nextRun <= startOfMinute.getTime()) due.push(job);
      } catch {
        // 无效 cron 忽略
      }
    }
  }
  return due;
}

/** 删除单次提醒（触发后调用） */
export async function cronRemoveById(id: string): Promise<boolean> {
  const data = await readData();
  const idx = data.jobs.findIndex((j) => j.id === id);
  if (idx === -1) return false;
  data.jobs.splice(idx, 1);
  await writeData(data);
  return true;
}
