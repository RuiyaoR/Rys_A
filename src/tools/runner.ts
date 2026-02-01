import type { ToolRunner } from "../agent/types.js";
import { runShell } from "./shell.js";
import { readFileContent, writeFileContent, listDir } from "./filesystem.js";
import { browse } from "./browser.js";
import { memoryGet, memorySet } from "../memory/store.js";
import { emailList, emailRead, emailSend } from "./email.js";
import { travelSearch, travelCheckin } from "./travel.js";
import { researchSearch, researchSummarize } from "./research.js";

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
        const validActions = ["navigate", "extract", "click", "fill"] as const;
        if (!validActions.includes(action as (typeof validActions)[number])) {
          return `无效的 action，应为: ${validActions.join(", ")}`;
        }
        return browse({ action: action as (typeof validActions)[number], url, selector, value });
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
      case "email_read": {
        const index = args.index != null ? parseInt(String(args.index), 10) : 0;
        return emailRead(isNaN(index) ? 0 : index);
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
      default:
        return `未知工具: ${name}`;
    }
  } catch (e: unknown) {
    const err = e as Error;
    return `工具执行异常: ${err.message ?? String(e)}`;
  }
};
