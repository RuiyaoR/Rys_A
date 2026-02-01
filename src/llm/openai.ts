import OpenAI from "openai";
import { config } from "../config.js";
import type { ToolDefinition } from "../agent/types.js";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: config.llm.apiKey,
      baseURL: config.llm.baseURL,
    });
  }
  return client;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolCallResult {
  tool_call_id: string;
  content: string;
}

/**
 * 调用 OpenAI Chat Completions，支持 tool_calls；执行一轮（不自动循环）。
 * 返回 assistant 消息与 tool_calls（若有）；调用方负责执行工具并再次调用。
 */
export async function chatWithTools(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools: ToolDefinition[],
  maxTokens = 4096
): Promise<{
  assistantMessage: string;
  toolCalls: Array<{ id: string; name: string; arguments: string }>;
}> {
  const openai = getOpenAIClient();
  const toolDefs: OpenAI.Chat.Completions.ChatCompletionTool[] = tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters as OpenAI.Chat.Completions.ChatCompletionTool["function"]["parameters"],
    },
  }));

  const resp = await openai.chat.completions.create({
    model: config.llm.model,
    messages,
    tools: toolDefs.length ? toolDefs : undefined,
    max_tokens: maxTokens,
  });

  const choice = resp.choices?.[0];
  if (!choice?.message) {
    return { assistantMessage: "", toolCalls: [] };
  }

  const msg = choice.message;
  let assistantMessage = typeof msg.content === "string" ? msg.content : "";

  const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];
  if (msg.tool_calls) {
    for (const tc of msg.tool_calls) {
      if (tc.function?.name) {
        toolCalls.push({
          id: tc.id ?? "",
          name: tc.function.name,
          arguments: tc.function.arguments ?? "{}",
        });
      }
    }
  }

  return { assistantMessage, toolCalls };
}
