import type { ToolDefinition } from "../agent/types.js";

export const toolDefinitions: ToolDefinition[] = [
  // --- 系统核心能力 ---
  {
    name: "shell_exec",
    description: "在受控环境下执行 Shell 命令。用于运行终端命令、脚本或管理进程。仅允许在白名单路径下执行。",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "要执行的命令，如 ls -la 或 node script.js" },
        cwd: { type: "string", description: "工作目录，需在白名单内，可选" },
      },
      required: ["command"],
    },
  },
  {
    name: "read_file",
    description: "读取文件内容。用于查看文档、配置或数据。",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "文件路径，相对工作区或绝对路径" },
        encoding: { type: "string", description: "编码，默认 utf8" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "写入或覆盖文件。用于创建文档、保存数据或写配置。",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "文件路径" },
        content: { type: "string", description: "要写入的内容" },
        append: { type: "string", description: "若为 true 则追加而非覆盖" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_dir",
    description: "列出目录下的文件和子目录。用于浏览文件系统、管理文件夹。",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "目录路径" },
      },
      required: ["path"],
    },
  },
  {
    name: "browse",
    description: "使用浏览器：打开网页、填表单、点击、提取页面文本。用于导航网站、抓取数据。需开启 BROWSER_ENABLED。",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", description: "navigate | extract | click | fill。navigate=打开URL，extract=提取当前页文本，click=点击选择器，fill=填写表单" },
        url: { type: "string", description: "仅 action=navigate 时使用" },
        selector: { type: "string", description: "仅 click 或 fill 时使用的 CSS 选择器" },
        value: { type: "string", description: "仅 fill 时使用的填写值" },
      },
      required: ["action"],
    },
  },
  {
    name: "memory_get",
    description: "读取用户的持久化记忆：偏好、过往摘要、习惯。用于记住用户喜好和上下文。",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "记忆键，如 preferences.summary 或 空表示读取全部" },
      },
    },
  },
  {
    name: "memory_set",
    description: "写入用户的持久化记忆。用于保存偏好、摘要或学习用户习惯。",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "记忆键" },
        value: { type: "string", description: "要保存的内容" },
      },
      required: ["key", "value"],
    },
  },
  // --- 应用：邮件（支持 Gmail：GMAIL_USER + GMAIL_APP_PASSWORD）---
  {
    name: "email_list",
    description:
      "列出收件箱中的邮件（最近 N 封，最新在前）。支持 Gmail 及其他 IMAP 邮箱。用于查看收件箱、让用户选一封再读。",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "string", description: "最多返回条数，默认 10" },
      },
    },
  },
  {
    name: "email_read",
    description:
      "按序号读取单封邮件的完整内容（主题、发件人、日期、正文）。序号 1 表示最新一封，与 email_list 列表顺序一致。先 email_list 再 email_read(index)。",
    parameters: {
      type: "object",
      properties: {
        index: { type: "string", description: "序号，1=最新一封" },
      },
      required: ["index"],
    },
  },
  {
    name: "email_send",
    description:
      "发送邮件。支持 Gmail 及其他 SMTP 邮箱。用于起草和发送回复。",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "收件人邮箱" },
        subject: { type: "string", description: "主题" },
        body: { type: "string", description: "正文（纯文本）" },
      },
      required: ["to", "subject", "body"],
    },
  },
  // --- 应用：旅行 ---
  {
    name: "travel_search",
    description: "搜索航班/酒店/行程信息（通过网页搜索）。用于查找航班、酒店优惠、行程。",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词，如 北京到上海 机票 或 三亚 酒店" },
      },
      required: ["query"],
    },
  },
  {
    name: "travel_checkin",
    description: "尝试打开常见航司值机页面或获取登机牌链接（通过浏览器导航）。用于航班值机。",
    parameters: {
      type: "object",
      properties: {
        airline_hint: { type: "string", description: "航司或值机页面关键词，如 国航 南航 东航" },
        booking_ref: { type: "string", description: "预订编号（若有）" },
      },
    },
  },
  // --- 应用：研究 ---
  {
    name: "research_search",
    description: "网页搜索并返回摘要。用于搜索、对比产品、查找信息。",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
        num_results: { type: "string", description: "返回条数，默认 5" },
      },
      required: ["query"],
    },
  },
  {
    name: "research_summarize",
    description: "对给定长文本进行摘要。用于总结文章、报告。",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "要摘要的文本" },
        max_length: { type: "string", description: "摘要最大字数，默认 500" },
      },
      required: ["text"],
    },
  },
];
