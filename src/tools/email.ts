import { config } from "../config.js";

// 可选：使用 nodemailer + imap2。为减少依赖，先用占位实现；配置齐全时可接入真实 IMAP/SMTP。
const hasImap =
  config.email.imap.host && config.email.imap.user && config.email.imap.pass;
const hasSmtp =
  config.email.smtp.host && config.email.smtp.user && config.email.smtp.pass;

export async function emailList(limit = 10): Promise<string> {
  if (!hasImap) {
    return "未配置邮件（请设置 EMAIL_IMAP_HOST / USER / PASS）。";
  }
  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: config.email.imap.host,
      port: 993,
      secure: true,
      auth: { user: config.email.imap.user, pass: config.email.imap.pass },
    });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    const messages: string[] = [];
    try {
      const exists = client.mailbox.exists;
      const start = Math.max(1, exists - limit + 1);
      const range = `${start}:${exists}`;
      for await (const msg of client.fetch(range, { envelope: true })) {
        const env = msg.envelope;
        const subject = (env?.subject ?? "(无主题)").toString();
        const from = env?.from?.[0]?.address ?? "?";
        const date = env?.date instanceof Date ? env.date.toISOString() : "?";
        messages.push(`${date} | ${from} | ${subject}`);
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

export async function emailSend(to: string, subject: string, body: string): Promise<string> {
  if (!hasSmtp) {
    return "未配置 SMTP（请设置 EMAIL_SMTP_HOST / USER / PASS）。";
  }
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: 465,
      secure: true,
      auth: { user: config.email.smtp.user, pass: config.email.smtp.pass },
    });
    await transport.sendMail({
      from: config.email.smtp.user,
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
