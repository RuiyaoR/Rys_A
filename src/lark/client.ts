import { config } from "../config.js";

type LarkClient = {
  im: { v1: { message: { create: (opts: unknown) => Promise<{ data?: { message_id?: string } }> } } };
};

let client: LarkClient | null = null;
let initPromise: Promise<LarkClient> | null = null;

async function initLarkClient(): Promise<LarkClient> {
  if (client) return client;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const lark = await import("@larksuiteoapi/node-sdk");
    const LarkClass = (lark as { default?: unknown; Lark?: unknown }).default ?? (lark as { Lark?: unknown }).Lark;
    if (typeof LarkClass !== "function") {
      throw new Error(
        "@larksuiteoapi/node-sdk 未正确导出 Lark。请确认已安装: npm install @larksuiteoapi/node-sdk"
      );
    }
    client = new (LarkClass as new (opts: {
      appId: string;
      appSecret: string;
      disableTokenCache: boolean;
    }) => LarkClient)({
      appId: config.lark.appId,
      appSecret: config.lark.appSecret,
      disableTokenCache: false,
    });
    return client;
  })();
  return initPromise;
}

export async function getLarkClient(): Promise<LarkClient> {
  return initLarkClient();
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
