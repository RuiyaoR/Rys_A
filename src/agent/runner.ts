import type OpenAI from "openai";
import { chatWithTools } from "../llm/openai.js";
import { toolDefinitions } from "../tools/definitions.js";
import { runTool } from "../tools/runner.js";
import type { AgentMessage } from "./types.js";

const SYSTEM_PROMPT = `你是一个个人助理（简化版 ClawdBot），具备以下能力：

**系统能力**：执行 Shell 命令、读写文件、列出目录、使用浏览器（打开网页/填表/点击/提取内容）、读写持久化记忆。
**应用能力**：邮件（列出收件箱、发送邮件）、旅行（搜索航班酒店、值机）、研究（网页搜索、文本摘要）、**提醒**（定时提醒）。

**提醒（底层 cron）**：用户说「每天 9 点提醒我喝水」「每周一 8 点提醒开会」时，用 reminder_add 创建周期提醒（cron 表达式）；说「明天 10 点提醒我」时用 reminder_add 创建单次提醒（at 为 ISO 时间）。到期后会在当前会话自动发消息。可用 reminder_list 查看、reminder_remove 删除。Cron 五段格式：分 时 日 月 周，如 0 9 * * * = 每天 9:00。

请根据用户请求选择合适的工具，按步骤执行并汇总结果。若无需工具，可直接回答。
回复请简洁、有条理，必要时分点说明。`;

const MAX_TOOL_ROUNDS = 10;

export interface RunOptions {
  userId: string;
  chatId: string;
  userMessage: string;
}

export async function runAgent(options: RunOptions): Promise<string> {
  const { userId, chatId, userMessage } = options;
  const context = { userId, chatId };

  const messages: AgentMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    for (const m of messages) {
      if (m.role === "assistant" && m.tool_calls?.length) {
        openaiMessages.push({
          role: "assistant",
          content: m.content || null,
          tool_calls: m.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        });
      } else if (m.role === "tool" && m.tool_call_id != null) {
        openaiMessages.push({
          role: "tool",
          tool_call_id: m.tool_call_id,
          content: m.content,
        });
      } else if (m.role !== "tool") {
        openaiMessages.push({ role: m.role, content: m.content });
      }
    }

    const { assistantMessage, toolCalls } = await chatWithTools(
      openaiMessages,
      toolDefinitions,
      4096
    );

    if (toolCalls.length === 0) {
      return assistantMessage || "（无回复）";
    }

    messages.push({
      role: "assistant",
      content: assistantMessage,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.arguments) as Record<string, unknown>;
      } catch {
        // ignore
      }
      const result = await runTool(tc.name, args, context);
      messages.push({
        role: "tool",
        content: result,
        tool_call_id: tc.id,
        name: tc.name,
      });
    }
  }

  return "（达到最大工具调用轮数，请简化请求后重试）";
}
