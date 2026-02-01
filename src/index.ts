import express, { type Request, type Response } from "express";
import { config, assertRequiredEnv } from "./config.js";
import { handleWebhookBody, rawBodyMiddleware } from "./lark/webhook.js";
import { sendMessage } from "./lark/client.js";
import { runAgent } from "./agent/runner.js";
import { startScheduler } from "./cron/scheduler.js";

assertRequiredEnv();

const app = express();
app.use(express.json());
app.post("/webhook/lark", rawBodyMiddleware, async (req: Request, res: Response) => {
  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";
  const parsed = handleWebhookBody(rawBody);
  if (!parsed) {
    res.status(400).send("invalid");
    return;
  }
  if (parsed.type === "challenge") {
    res.json({ challenge: parsed.challenge });
    return;
  }
  res.status(200).send("ok");
  const { chatId, content, userId } = parsed.event;
  if (!content?.trim()) return;
  let reply: string;
  try {
    reply = await runAgent({ userId, chatId, userMessage: content });
  } catch (e: unknown) {
    const err = e as Error & { status?: number; code?: string };
    const msg = err.message ?? String(e);
    if (err.status === 401 || msg.includes("Incorrect API key")) {
      reply = "当前对话使用的 API Key 无效，请检查 .env 中的 DASHSCOPE_API_KEY 或 OPENAI_API_KEY。详见文档：百炼API-Key配置.md";
    } else if (err.status === 400 || msg.includes("Arrearage") || msg.includes("Access denied")) {
      reply = "当前账号欠费或权限受限，请在阿里云控制台检查账户余额与百炼服务状态。";
    } else if (msg.includes("Failed to launch") || msg.includes("browser process")) {
      reply = "浏览器启动失败（常见于服务器缺少依赖）。可设置 BROWSER_ENABLED=false 关闭浏览器能力，或按部署文档安装 Chrome 依赖。";
    } else {
      reply = `处理出错：${msg}`;
    }
  }
  try {
    await sendMessage({
      receiveId: chatId,
      receiveIdType: "chat_id",
      content: reply,
    });
  } catch (sendErr) {
    console.error("[Lark] 回复发送失败:", sendErr);
  }
});

startScheduler();

app.listen(config.port, () => {
  console.log(`[Rys] 服务已启动，端口 ${config.port}，飞书 Webhook: POST /webhook/lark`);
});
