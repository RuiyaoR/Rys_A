import express, { type Request, type Response } from "express";
import { config, assertRequiredEnv } from "./config.js";
import { handleWebhookBody, rawBodyMiddleware } from "./lark/webhook.js";
import { sendMessage } from "./lark/client.js";
import { runAgent } from "./agent/runner.js";

assertRequiredEnv();

const app = express();
// 飞书 webhook 必须先拿到原始 body，再解析；若先走 express.json() 会消费掉 body，导致 rawBody 为空
app.post("/webhook/lark", rawBodyMiddleware, async (req: Request, res: Response) => {
  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";
  if (!rawBody || rawBody.length === 0) {
    console.warn("[Webhook] body 为空，请确认 webhook 路由在 express.json() 之前注册");
    res.status(200).send("ok");
    return;
  }
  const parsed = handleWebhookBody(rawBody);
  if (!parsed) {
    console.warn("[Webhook] 解析失败或非消息事件，body 前 500 字符:", rawBody.slice(0, 500));
    res.status(200).send("ok");
    return;
  }
  if (parsed.type === "challenge") {
    console.log("[Webhook] URL 校验，返回 challenge");
    res.json({ challenge: parsed.challenge });
    return;
  }
  res.status(200).send("ok");
  const { chatId, content, userId } = parsed.event;
  console.log("[Webhook] 收到消息 chatId=%s userId=%s content=%s", chatId, userId, content?.slice(0, 50));
  if (!content?.trim()) {
    console.warn("[Webhook] content 为空，跳过处理");
    return;
  }
  let reply: string;
  try {
    reply = await runAgent({ userId, chatId, userMessage: content });
    console.log("[Webhook] Agent 回复长度:", reply?.length ?? 0);
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
    const msgId = await sendMessage({
      receiveId: chatId,
      receiveIdType: "chat_id",
      content: reply,
    });
    if (msgId) {
      console.log("[Webhook] 已发送回复 message_id=%s", msgId);
    } else {
      console.error("[Lark] 回复发送失败：API 未返回 message_id");
    }
  } catch (sendErr) {
    console.error("[Lark] 回复发送失败:", sendErr);
  }
});

app.use(express.json());

app.listen(config.port, () => {
  console.log(`[Rys] 服务已启动，端口 ${config.port}，飞书 Webhook: POST /webhook/lark`);
});
