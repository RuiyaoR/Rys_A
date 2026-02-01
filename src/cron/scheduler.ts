import { cronGetDue, cronRemoveById, type CronJob } from "./store.js";
import { sendMessage } from "../lark/client.js";

const INTERVAL_MS = 60 * 1000; // 每分钟

async function fireJob(job: CronJob): Promise<void> {
  try {
    await sendMessage({
      receiveId: job.chatId,
      receiveIdType: "chat_id",
      content: `⏰ 提醒：${job.message}`,
    });
  } catch (e) {
    console.error("[Cron] 发送提醒失败:", job.id, e);
  }
  if (job.at) {
    await cronRemoveById(job.id);
  }
}

async function tick(): Promise<void> {
  const now = new Date();
  const due = await cronGetDue(now);
  for (const job of due) {
    await fireJob(job);
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/** 启动提醒调度器：每分钟检查一次，到期的提醒会发到对应飞书会话 */
export function startScheduler(): void {
  if (intervalId != null) return;
  tick(); // 启动时先执行一次（一般不会有刚好到期的）
  intervalId = setInterval(tick, INTERVAL_MS);
  console.log("[Cron] 提醒调度器已启动，每 60 秒检查一次");
}

/** 停止调度器 */
export function stopScheduler(): void {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Cron] 提醒调度器已停止");
  }
}
