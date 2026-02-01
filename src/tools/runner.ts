import type { ToolRunner } from "../agent/types.js";
import { runShell } from "./shell.js";
import { readFileContent, writeFileContent, listDir } from "./filesystem.js";
import { browse } from "./browser.js";
import { memoryGet, memorySet } from "../memory/store.js";
import { emailList, emailSend } from "./email.js";
import { travelSearch, travelCheckin } from "./travel.js";
import { researchSearch, researchSummarize } from "./research.js";
import { cronAdd, cronList, cronRemove } from "../cron/store.js";

export const runTool: ToolRunner = async (name, args, context) => {
  const { userId, chatId } = context;
  try {
    switch (name) {
      case "shell_exec": {
        const command = String(args.command ?? "");
        const cwd = args.cwd != null ? String(args.cwd) : undefined;
        return runShell(command, cwd);
      }
      case "read_file": {
        const path = String(args.path ?? "");
        const encoding = args.encoding != null ? String(args.encoding) : "utf8";
        return readFileContent(path, encoding);
      }
      case "write_file": {
        const path = String(args.path ?? "");
        const content = String(args.content ?? "");
        const append = args.append === true || args.append === "true";
        return writeFileContent(path, content, append);
      }
      case "list_dir": {
        const path = String(args.path ?? "");
        return listDir(path);
      }
      case "browse": {
        const action = String(args.action ?? "");
        const url = args.url != null ? String(args.url) : undefined;
        const selector = args.selector != null ? String(args.selector) : undefined;
        const value = args.value != null ? String(args.value) : undefined;
        return browse({ action, url, selector, value });
      }
      case "memory_get": {
        const key = args.key != null ? String(args.key) : undefined;
        return memoryGet(userId, key);
      }
      case "memory_set": {
        const key = String(args.key ?? "");
        const value = String(args.value ?? "");
        await memorySet(userId, key, value);
        return "已保存记忆";
      }
      case "email_list": {
        const limit = args.limit != null ? parseInt(String(args.limit), 10) : 10;
        return emailList(isNaN(limit) ? 10 : limit);
      }
      case "email_send": {
        const to = String(args.to ?? "");
        const subject = String(args.subject ?? "");
        const body = String(args.body ?? "");
        return emailSend(to, subject, body);
      }
      case "travel_search": {
        const query = String(args.query ?? "");
        return travelSearch(query);
      }
      case "travel_checkin": {
        const airlineHint = args.airline_hint != null ? String(args.airline_hint) : undefined;
        const bookingRef = args.booking_ref != null ? String(args.booking_ref) : undefined;
        return travelCheckin(airlineHint, bookingRef);
      }
      case "research_search": {
        const query = String(args.query ?? "");
        const numResults = args.num_results != null ? String(args.num_results) : "5";
        return researchSearch(query, parseInt(numResults, 10) || 5);
      }
      case "research_summarize": {
        const text = String(args.text ?? "");
        const maxLength = args.max_length != null ? String(args.max_length) : "500";
        return researchSummarize(text, parseInt(maxLength, 10) || 500);
      }
      case "reminder_add": {
        const message = String(args.message ?? "").trim();
        if (!message) return "提醒内容不能为空";
        const cron = args.cron != null ? String(args.cron).trim() : undefined;
        const at = args.at != null ? String(args.at).trim() : undefined;
        const job = await cronAdd({
          userId,
          chatId,
          message,
          cron: cron || undefined,
          at: at || undefined,
        });
        if (job.at) {
          return `已添加单次提醒，时间：${job.at}。到期会在此会话发送：「${job.message}」`;
        }
        return `已添加周期提醒（${job.cron}）。到期会在此会话发送：「${job.message}」`;
      }
      case "reminder_list": {
        const jobs = await cronList(userId);
        if (jobs.length === 0) return "当前没有任何提醒。";
        return jobs
          .map(
            (j) =>
              `- id: ${j.id}\n  规则: ${j.cron ?? j.at ?? "?"}\n  内容: ${j.message}`
          )
          .join("\n");
      }
      case "reminder_remove": {
        const id = String(args.id ?? "").trim();
        if (!id) return "请提供要删除的提醒 id";
        const ok = await cronRemove(id, userId);
        return ok ? "已删除该提醒。" : "未找到该 id 的提醒或无权删除。";
      }
      default:
        return `未知工具: ${name}`;
    }
  } catch (e: unknown) {
    const err = e as Error;
    return `工具执行异常: ${err.message ?? String(e)}`;
  }
};
