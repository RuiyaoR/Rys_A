import "dotenv/config";

const get = (key: string, def = ""): string => (process.env[key] ?? def).trim();

export const config = {
  port: parseInt(get("PORT", "3000"), 10),
  lark: {
    appId: get("LARK_APP_ID"),
    appSecret: get("LARK_APP_SECRET"),
    verificationToken: get("LARK_VERIFICATION_TOKEN"),
    encryptKey: get("LARK_ENCRYPT_KEY"),
  },
  // 大模型：阿里云百炼 或 OpenAI
  // 阿里云百炼 OpenAI 兼容：https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope
  llm: {
    apiKey: get("DASHSCOPE_API_KEY") || get("OPENAI_API_KEY"),
    baseURL: get("DASHSCOPE_API_KEY")
      ? (get("DASHSCOPE_BASE_URL") || "https://dashscope-us.aliyuncs.com/compatible-mode/v1")
      : (get("OPENAI_BASE_URL") || undefined),
    model: get("DASHSCOPE_MODEL") || get("OPENAI_MODEL") || "qwen-plus",
  },
  email: {
    imap: {
      host: get("EMAIL_IMAP_HOST"),
      user: get("EMAIL_IMAP_USER"),
      pass: get("EMAIL_IMAP_PASS"),
    },
    smtp: {
      host: get("EMAIL_SMTP_HOST"),
      user: get("EMAIL_SMTP_USER"),
      pass: get("EMAIL_SMTP_PASS"),
    },
    /** Gmail 快捷：设置 GMAIL_USER + GMAIL_APP_PASSWORD 即用 imap.gmail.com / smtp.gmail.com */
    gmail: {
      user: get("GMAIL_USER"),
      appPassword: get("GMAIL_APP_PASSWORD"),
    },
  },
  search: {
    apiKey: get("SEARCH_API_KEY"),
    apiUrl: get("SEARCH_API_URL"),
  },
  tools: {
    shellAllowedPaths: get("SHELL_ALLOWED_PATHS")
      ? get("SHELL_ALLOWED_PATHS").split(",").map((p) => p.trim())
      : [process.cwd(), "/tmp"],
    browserEnabled: get("BROWSER_ENABLED", "true").toLowerCase() === "true",
  },
  workspaceDir: get("WORKSPACE_DIR") || "./workspace",
  memoryDir: get("MEMORY_DIR") || "./data/memory",
  cronDir: get("CRON_DIR") || "./data/cron",
} as const;

export function assertRequiredEnv(): void {
  if (!config.lark.appId || !config.lark.appSecret) {
    throw new Error("请设置 LARK_APP_ID 和 LARK_APP_SECRET");
  }
  if (!config.llm.apiKey) {
    throw new Error("请设置 DASHSCOPE_API_KEY 或 OPENAI_API_KEY");
  }
  if (config.llm.baseURL?.includes("dashscope") && !/^sk-[a-zA-Z0-9-]+$/.test(config.llm.apiKey)) {
    console.warn(
      "[配置] 百炼 API Key 通常以 sk- 开头，请从 https://bailian.console.aliyun.com 获取并填入 .env 的 DASHSCOPE_API_KEY"
    );
  }
}
