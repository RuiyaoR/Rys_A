import type { Request, Response } from "express";
import { config } from "../config.js";
import { parseMessageContent } from "./client.js";

/** 飞书事件回调 body：URL 校验 */
export interface UrlVerificationBody {
  type: "url_verification";
  challenge: string;
}

/** 飞书事件回调 body：事件推送（可能被加密） */
export interface EventCallbackBody {
  type?: "event_callback";
  event?: {
    type?: string;
    message?: {
      message_id?: string;
      chat_id?: string;
      content?: string;
      message_type?: string;
      sender_id?: { user_id?: string };
    };
    sender?: { sender_id?: { user_id?: string }; sender_type?: string };
  };
  encrypt?: string;
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
  let body: UrlVerificationBody | EventCallbackBody;
  try {
    body = JSON.parse(rawBody) as UrlVerificationBody | EventCallbackBody;
  } catch {
    return null;
  }

  if (body.type === "url_verification" && "challenge" in body) {
    return { type: "challenge", challenge: body.challenge };
  }

  // 加密时 body 为 { encrypt: "..." }，需解密；此处仅处理未加密或已由网关解密的 event_callback
  const cb = body as EventCallbackBody;
  if (cb.encrypt && config.lark.encryptKey) {
    // 若配置了 Encrypt Key，需解密；SDK 通常提供 decrypt 方法，此处返回 null 提示需解密
    console.warn("[Webhook] 收到加密事件，当前未实现解密，请在前置中间件中解密后再解析");
    return null;
  }

  if (cb.type !== "event_callback" || !cb.event) return null;
  const ev = cb.event;
  const eventType = ev.type ?? "";
  if (!eventType.includes("im.message.receive") || !ev.message) return null;

  const chatId = ev.message.chat_id ?? "";
  const messageId = ev.message.message_id ?? "";
  const content = ev.message.content ? parseMessageContent(ev.message.content) : "";
  const senderId = ev.sender?.sender_id ?? (ev as { message?: { sender_id?: { user_id?: string } } }).message?.sender_id;
  const userId = (typeof senderId?.user_id === "string" ? senderId.user_id : "") || "";

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
