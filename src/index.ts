import express from "express";
import { mkdir } from "fs/promises";
import { config, assertRequiredEnv } from "./config.js";
import { rawBodyMiddleware, handleWebhookBody } from "./lark/webhook.js";
import { sendMessage } from "./lark/client.js";
import { runAgent } from "./agent/runner.js";

async function main() {
  assertRequiredEnv();

  await mkdir(config.workspaceDir, { recursive: true });
  await mkdir(config.memoryDir, { recursive: true });

  const app = express();
  app.post("/lark/webhook", rawBodyMiddleware, async (req, res) => {
    const rawBody = (req as express.Request & { rawBody?: string }).rawBody ?? "";
    if (!rawBody) {
      console.warn("[Webhook] 收到空 body");
      res.status(400).send("Bad Request");
      return;
    }

    const parsed = handleWebhookBody(rawBody);
    if (!parsed) {
      console.warn("[Webhook] 解析失败或非消息事件，body 前 200 字符:", rawBody.slice(0, 200));
      res.status(200).send("ok");
      return;
    }

    if (parsed.type === "challenge") {
      console.log("[Webhook] URL 校验成功");
      res.json({ challenge: parsed.challenge });
      return;
    }

    res.status(200).send("ok");

    const { chatId, content, userId } = parsed.event;
    if (!content.trim()) {
      console.warn("[Webhook] 消息内容为空，跳过");
      return;
    }
    console.log("[Webhook] 收到消息 chatId=%s userId=%s content=%s", chatId, userId, content.slice(0, 50));

    try {
      const reply = await runAgent({ userId, chatId, userMessage: content });
      await sendMessage({
        receiveId: chatId,
        receiveIdType: "chat_id",
        content: reply.slice(0, 4000),
      });
      console.log("[Webhook] 已回复 chatId=%s", chatId);
    } catch (e) {
      console.error("[Webhook] Agent 或发消息失败:", e);
      try {
        await sendMessage({
          receiveId: chatId,
          receiveIdType: "chat_id",
          content: `处理出错: ${(e as Error).message}`,
        });
      } catch (sendErr) {
        console.error("[Webhook] 发送错误提示失败:", sendErr);
      }
    }
  });

  app.listen(config.port, () => {
    console.log(`Rys Assistant 已启动，飞书回调: http://0.0.0.0:${config.port}/lark/webhook`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
