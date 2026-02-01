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
      res.status(400).send("Bad Request");
      return;
    }

    const parsed = handleWebhookBody(rawBody);
    if (!parsed) {
      res.status(200).send("ok");
      return;
    }

    if (parsed.type === "challenge") {
      res.json({ challenge: parsed.challenge });
      return;
    }

    res.status(200).send("ok");

    const { chatId, content, userId } = parsed.event;
    if (!content.trim()) return;

    try {
      const reply = await runAgent({ userId, chatId, userMessage: content });
      await sendMessage({
        receiveId: chatId,
        receiveIdType: "chat_id",
        content: reply.slice(0, 4000),
      });
    } catch (e) {
      console.error("[Agent] run error:", e);
      await sendMessage({
        receiveId: chatId,
        receiveIdType: "chat_id",
        content: `处理出错: ${(e as Error).message}`,
      });
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
