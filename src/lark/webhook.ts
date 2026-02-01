import type { Request, Response } from "express";
import { config } from "../config.js";
import { parseMessageContent } from "./client.js";

/** 飞书事件回调 body：URL 校验 */
export interface UrlVerificationBody {
  type: "url_verification";
  challenge: string;
}

/** 飞书事件回调 body：旧版 event_callback */
export interface EventCallbackBody {
  type?: "event_callback";
  event?: {
    type?: string;
    message?: {
      message_id?: string;
      chat_id?: string;
      open_chat_id?: string;
      content?: string;
      message_type?: string;
      sender_id?: { user_id?: string };
    };
    sender?: { sender_id?: { user_id?: string; open_id?: string }; sender_type?: string };
  };
  encrypt?: string;
}

/** 飞书 schema 2.0：header.event_type + event 体 */
export interface Schema20Body {
  schema?: string;
  header?: { event_type?: string; event_id?: string; token?: string };
  event?: {
    message?: { message_id?: string; chat_id?: string; open_chat_id?: string; content?: string };
    sender?: { sender_id?: { user_id?: string; open_id?: string }; sender_type?: string };
    open_chat_id?: string;
    message_id?: string;
    content?: string;
    open_id?: string;
  };
}

/** 飞书另一种格式：uuid + event（平铺或嵌套 message） */
export interface UuidEventBody {
  uuid?: string;
  event?: {
    open_chat_id?: string;
    chat_id?: string;
    message_id?: string;
    content?: string;
    msg_type?: string;
    chat_type?: string;
    message?: { content?: string };
    [key: string]: unknown;
  };
}

export interface ParsedMessageEvent {
  chatId: string;
  messageId: string;
  content: string;
  userId: string;
}

/**
 * 解析飞书 POST 请求 body，返回 URL 校验 challenge 或解析后的消息事件。
 * 若未开启加密，直接解析 JSON；若开启加密，需使用 SDK 解密（此处简化：先不解密，仅处理明文）。
 */
export function handleWebhookBody(rawBody: string): { type: "challenge"; challenge: string } | { type: "event"; event: ParsedMessageEvent } | null {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (body.type === "url_verification" && typeof (body as { challenge?: string }).challenge === "string") {
    return { type: "challenge", challenge: (body as { challenge: string }).challenge };
  }

  if ((body as EventCallbackBody).encrypt && config.lark.encryptKey) {
    console.warn("[Webhook] 收到加密事件，当前未实现解密");
    return null;
  }

  // ---------- Schema 2.0：{ schema: "2.0", header: { event_type: "im.message.receive_v1" }, event: { ... } }
  if ((body as Schema20Body).schema === "2.0") {
    const s20 = body as Schema20Body;
    const eventType = s20.header?.event_type ?? "";
    if (!eventType.includes("im.message.receive") || !s20.event) return null;
    const ev = s20.event;
    const senderType = ev.sender?.sender_type ?? "";
    if (senderType === "app") return null;
    const chatId = (ev.message?.open_chat_id ?? ev.message?.chat_id ?? ev.open_chat_id) ?? "";
    const messageId = (ev.message?.message_id ?? ev.message_id) ?? "";
    const rawContent = ev.message?.content ?? ev.content;
    const content = typeof rawContent === "string" ? parseMessageContent(rawContent) : "";
    const senderId = ev.sender?.sender_id;
    const userId = (typeof senderId?.user_id === "string" ? senderId.user_id : "") || (typeof senderId?.open_id === "string" ? senderId.open_id : "") || (typeof ev.open_id === "string" ? ev.open_id : "");
    if (!chatId || !content) return null;
    return { type: "event", event: { chatId, messageId, content, userId } };
  }

  // ---------- 格式：{ uuid, event: { open_chat_id, message_id, content 或 message.content, ... } }
  if ((body as UuidEventBody).uuid != null && (body as UuidEventBody).event) {
    const ev = (body as UuidEventBody).event!;
    const chatId = ev.open_chat_id ?? ev.chat_id ?? "";
    const messageId = ev.message_id ?? "";
    const rawContent = ev.content ?? ev.message?.content;
    const content = typeof rawContent === "string" ? parseMessageContent(rawContent) : "";
    if (!chatId || !content) return null;
    const uid = (ev as { employee_id?: string; open_id?: string }).employee_id ?? (ev as { open_id?: string }).open_id ?? "";
    return { type: "event", event: { chatId, messageId, content, userId: uid } };
  }

  // ---------- 旧版 event_callback：{ type: "event_callback", event: { type: "im.message.receive_v1", message, sender } }
  const cb = body as EventCallbackBody;
  if (cb.type !== "event_callback" || !cb.event) return null;
  const ev = cb.event;
  const eventType = ev.type ?? "";
  if (!eventType.includes("im.message.receive") || !ev.message) return null;
  const senderType = (ev as { sender?: { sender_type?: string } }).sender?.sender_type ?? "";
  if (senderType === "app") return null;
  const msg = ev.message as { chat_id?: string; open_chat_id?: string; message_id?: string; content?: string };
  const chatId = msg.chat_id ?? msg.open_chat_id ?? "";
  const messageId = msg.message_id ?? "";
  const content = msg.content ? parseMessageContent(msg.content) : "";
  const senderId = ev.sender?.sender_id ?? (ev as { message?: { sender_id?: { user_id?: string } } }).message?.sender_id;
  const sid = senderId as { user_id?: string; open_id?: string } | null | undefined;
  const userId = (typeof sid?.user_id === "string" ? sid.user_id : "") || (typeof sid?.open_id === "string" ? sid.open_id : "");
  if (!chatId || !content) return null;
  return { type: "event", event: { chatId, messageId, content, userId } };
}

/**
 * Express 中间件：将 raw body 挂到 req.rawBody（用于飞书签名校验与解析）
 */
export function rawBodyMiddleware(req: Request, res: Response, next: () => void): void {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    (req as Request & { rawBody?: string }).rawBody = Buffer.concat(chunks).toString("utf8");
    next();
  });
}
