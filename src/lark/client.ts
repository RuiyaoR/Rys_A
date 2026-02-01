import { createRequire } from "node:module";
import { config } from "../config.js";

const require = createRequire(import.meta.url);
// 使用 require 避免 ESM namespace 导入导致的类型错误；SDK 可能导出 default 或直接导出类
const LarkModule = require("@larksuiteoapi/node-sdk");
const Lark = (typeof LarkModule?.default === "function" ? LarkModule.default : LarkModule) as new (opts: {
  appId: string;
  appSecret: string;
  disableTokenCache: boolean;
}) => { im: { v1: { message: { create: (opts: unknown) => Promise<{ data?: { message_id?: string } }> } } } };

let client: { im: { v1: { message: { create: (opts: unknown) => Promise<{ data?: { message_id?: string } }> } } } } | null = null;

export function getLarkClient(): { im: { v1: { message: { create: (opts: unknown) => Promise<{ data?: { message_id?: string } }> } } } } {
  if (!client) {
    client = new Lark({
      appId: config.lark.appId,
      appSecret: config.lark.appSecret,
      disableTokenCache: false,
    });
  }
  return client;
}

export interface SendMessageOptions {
  receiveId: string;
  receiveIdType: "chat_id" | "user_id" | "open_id";
  content: string;
  msgType?: "text" | "post";
}

/**
 * 发送文本消息到飞书会话
 * receiveId 一般为 chat_id（群/单聊），receiveIdType 为 "chat_id"
 */
export async function sendMessage(opts: SendMessageOptions): Promise<string | null> {
  const larkClient = getLarkClient();
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

/**
 * 解析飞书「接收消息」事件中的文本内容
 * event.message.content 为 JSON 字符串，如 {"text":"用户输入"}
 */
export function parseMessageContent(content: string): string {
  try {
    const obj = JSON.parse(content) as { text?: string };
    return (obj?.text ?? content).trim();
  } catch {
    return content.trim();
  }
}
