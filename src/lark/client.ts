import { createRequire } from "node:module";
import { config } from "../config.js";

const require = createRequire(import.meta.url);

type LarkClient = {
  im: { v1: { message: { create: (opts: unknown) => Promise<{ data?: { message_id?: string } }> } } };
};

let client: LarkClient | null = null;

function getLarkClass(): new (opts: { appId: string; appSecret: string; disableTokenCache: boolean }) => LarkClient {
  // SDK 可能导出 Client（具名）或 Lark，用 require 加载后按优先级取
  const mod = require("@larksuiteoapi/node-sdk");
  const candidates = [
    mod?.Client,  // 新版 SDK 常用具名导出 Client
    mod?.Lark,
    mod?.default,
    typeof mod === "function" ? mod : null,
  ].filter((x): x is Function => typeof x === "function");
  const LarkClass = candidates[0];
  if (!LarkClass) {
    const keys = typeof mod === "object" && mod !== null ? Object.keys(mod).join(", ") : "非对象";
    throw new Error(
      `@larksuiteoapi/node-sdk 未找到 Client/Lark 类。导出的键: ${keys}。请确认已安装: npm install @larksuiteoapi/node-sdk`
    );
  }
  return LarkClass as new (opts: { appId: string; appSecret: string; disableTokenCache: boolean }) => LarkClient;
}

export async function getLarkClient(): Promise<LarkClient> {
  if (client) return client;
  const LarkClass = getLarkClass();
  client = new LarkClass({
    appId: config.lark.appId,
    appSecret: config.lark.appSecret,
    disableTokenCache: false,
  });
  return client;
}

export interface SendMessageOptions {
  receiveId: string;
  receiveIdType: "chat_id" | "user_id" | "open_id";
  content: string;
  msgType?: "text" | "post";
}

export async function sendMessage(opts: SendMessageOptions): Promise<string | null> {
  const larkClient = await getLarkClient();
  const body = {
    receive_id: opts.receiveId,
    msg_type: "text" as const,
    content: JSON.stringify({ text: opts.content }),
  };
  const resp = await larkClient.im.v1.message.create({
    params: { receive_id_type: opts.receiveIdType },
    data: body,
  });
  if (!resp.data?.message_id) {
    console.error("[Lark] send message failed:", resp);
    return null;
  }
  return resp.data.message_id;
}

export function parseMessageContent(content: string): string {
  try {
    const obj = JSON.parse(content) as { text?: string };
    return (obj?.text ?? content).trim();
  } catch {
    return content.trim();
  }
}
