import { config } from "../config.js";

/** 实际使用的 IMAP/SMTP 配置：优先 Gmail 快捷，否则用 EMAIL_IMAP_* / EMAIL_SMTP_* */
function getEmailConfig(): {
  imap: { host: string; user: string; pass: string };
  smtp: { host: string; user: string; pass: string };
} {
  const gmail = config.email.gmail.user && config.email.gmail.appPassword;
  if (gmail) {
    return {
      imap: {
        host: "imap.gmail.com",
        user: config.email.gmail.user,
        pass: config.email.gmail.appPassword,
      },
      smtp: {
        host: "smtp.gmail.com",
        user: config.email.gmail.user,
        pass: config.email.gmail.appPassword,
      },
    };
  }
  return {
    imap: {
      host: config.email.imap.host ?? "",
      user: config.email.imap.user ?? "",
      pass: config.email.imap.pass ?? "",
    },
    smtp: {
      host: config.email.smtp.host ?? "",
      user: config.email.smtp.user ?? "",
      pass: config.email.smtp.pass ?? "",
    },
  };
}

const cfg = getEmailConfig();
const hasImap = !!(cfg.imap.host && cfg.imap.user && cfg.imap.pass);
const hasSmtp = !!(cfg.smtp.host && cfg.smtp.user && cfg.smtp.pass);

const MAX_BODY_LEN = 8000;

export async function emailList(limit = 10): Promise<string> {
  if (!hasImap) {
    return "未配置邮件。Gmail 请设置 GMAIL_USER + GMAIL_APP_PASSWORD；其他邮箱请设置 EMAIL_IMAP_HOST / EMAIL_IMAP_USER / EMAIL_IMAP_PASS。";
  }
  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: cfg.imap.host,
      port: 993,
      secure: true,
      auth: { user: cfg.imap.user, pass: cfg.imap.pass },
    });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    const messages: string[] = [];
    try {
      const mailbox = client.mailbox;
      const exists =
        mailbox && typeof (mailbox as { exists?: number }).exists === "number"
          ? (mailbox as { exists: number }).exists
          : 0;
      if (exists === 0) {
        // 收件箱为空
      } else {
        const start = Math.max(1, exists - limit + 1);
        const range = `${start}:${exists}`;
        for await (const msg of client.fetch(range, { envelope: true })) {
          const env = msg.envelope;
          const subject = (env?.subject ?? "(无主题)").toString();
          const from = env?.from?.[0]?.address ?? "?";
          const date =
            env?.date instanceof Date ? env.date.toISOString() : "?";
          const seq = (msg as { seq?: number }).seq;
          messages.push(`[${seq ?? "?"}] ${date} | ${from} | ${subject}`);
        }
        messages.reverse(); // 最新在前，与 email_read 序号一致：1=最新
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return messages.length ? messages.join("\n") : "（收件箱为空）";
  } catch (e: unknown) {
    const err = e as { message?: string };
    return `读取邮件失败: ${err.message ?? "Unknown"}`;
  }
}

/** 读取单封邮件正文。index 为 1-based，1 表示最新一封（与 email_list 列表顺序一致）。 */
export async function emailRead(index: number): Promise<string> {
  if (!hasImap) {
    return "未配置邮件。请设置 GMAIL_USER + GMAIL_APP_PASSWORD 或 EMAIL_IMAP_*。";
  }
  if (index < 1) {
    return "请指定大于 0 的序号，1 表示最新一封。";
  }
  try {
    const { ImapFlow } = await import("imapflow");
    const { simpleParser } = await import("mailparser");
    const client = new ImapFlow({
      host: cfg.imap.host,
      port: 993,
      secure: true,
      auth: { user: cfg.imap.user, pass: cfg.imap.pass },
    });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    let result = "未找到该邮件";
    try {
      const mailbox = client.mailbox;
      const exists =
        mailbox && typeof (mailbox as { exists?: number }).exists === "number"
          ? (mailbox as { exists: number }).exists
          : 0;
      if (exists === 0) {
        result = "收件箱为空";
      } else {
        const seq = exists - index + 1;
        if (seq < 1) {
          result = `序号超出范围，收件箱共 ${exists} 封，请使用 1～${exists}。`;
        } else {
          const range = `${seq}:${seq}`;
          for await (const msg of client.fetch(range, {
            envelope: true,
            source: true,
          })) {
            const env = msg.envelope;
            const subject = (env?.subject ?? "(无主题)").toString();
            const from = env?.from?.[0]?.address ?? "?";
            const toList = (env?.to ?? [])
              .map((a: { address?: string }) => a.address)
              .filter(Boolean)
              .join(", ");
            const date =
              env?.date instanceof Date ? env.date.toISOString() : "?";
            let body = "";
            const raw = (msg as { source?: Buffer }).source;
            if (raw && raw.length > 0) {
              const parsed = await simpleParser(raw);
              body =
                parsed.text?.trim() ||
                (parsed.html ? stripHtml(parsed.html) : "") ||
                "（无正文）";
              if (body.length > MAX_BODY_LEN) {
                body = body.slice(0, MAX_BODY_LEN) + "\n…（已截断）";
              }
            } else {
              body = "（无法解析正文）";
            }
            result = `主题: ${subject}\n发件人: ${from}\n收件人: ${toList}\n日期: ${date}\n\n${body}`;
            break;
          }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return result;
  } catch (e: unknown) {
    const err = e as { message?: string };
    return `读取邮件失败: ${err.message ?? "Unknown"}`;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function emailSend(
  to: string,
  subject: string,
  body: string
): Promise<string> {
  if (!hasSmtp) {
    return "未配置发件。Gmail 请设置 GMAIL_USER + GMAIL_APP_PASSWORD；其他邮箱请设置 EMAIL_SMTP_HOST / USER / PASS。";
  }
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: 465,
      secure: true,
      auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
    });
    await transport.sendMail({
      from: cfg.smtp.user,
      to,
      subject,
      text: body,
    });
    return `已发送至 ${to}`;
  } catch (e: unknown) {
    const err = e as { message?: string };
    return `发送失败: ${err.message ?? "Unknown"}`;
  }
}
