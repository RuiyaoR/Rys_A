/**
 * 工具定义：名称、描述、参数 JSON Schema（OpenAI function calling 格式）
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties?: Record<string, { type: string; description?: string; items?: unknown }>;
    required?: string[];
  };
}

/**
 * 工具实现：根据 name 和 arguments 执行并返回字符串结果
 */
export type ToolRunner = (
  name: string,
  args: Record<string, unknown>,
  context: { userId: string; chatId: string }
) => Promise<string>;

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: Array<{ id: string; name: string; arguments: string }>;
  tool_call_id?: string;
  name?: string;
}
