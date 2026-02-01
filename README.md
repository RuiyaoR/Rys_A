# Rys Assistant — 简化版 ClawdBot 个人助理

接入**飞书（Lark）**的简化版 ClawdBot：具备系统核心能力（浏览器、文件、Shell、记忆），并支持**邮件、旅行、研究**等应用能力。

## 能力概览

| 类别 | 能力 | 说明 |
|------|------|------|
| **系统** | 浏览器 | 打开网页、填表、点击、提取内容（Puppeteer） |
| | 文件系统 | 读/写/列出目录（工作区内） |
| | Shell | 在白名单路径下执行命令 |
| | 持久化记忆 | 按用户存储偏好与上下文 |
| **应用** | 邮件 | 列出收件箱、发送邮件（需配置 IMAP/SMTP） |
| | 旅行 | 搜索航班酒店、打开值机相关页面 |
| | 研究 | 网页搜索、文本摘要 |

## 环境要求

- Node.js >= 18
- 飞书开放平台应用（机器人 + 事件订阅）
- 大模型 API Key：推荐 [阿里云百炼](https://bailian.console.aliyun.com)（DashScope），或 OpenAI

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写：

```bash
cp .env.example .env
```

必填：

- `LARK_APP_ID` / `LARK_APP_SECRET` — 飞书应用凭证
- `LARK_VERIFICATION_TOKEN` — 事件订阅「校验 Token」
- **`DASHSCOPE_API_KEY`** — [阿里云百炼](https://bailian.console.aliyun.com) API Key（推荐，使用 [OpenAI 兼容接口](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope)）；或 `OPENAI_API_KEY`

可选：

- `DASHSCOPE_MODEL` — 百炼模型，如 `qwen-plus`、`qwen-turbo`、`qwen-max`（默认 `qwen-plus`）
- 邮件：`EMAIL_IMAP_*`、`EMAIL_SMTP_*`
- 搜索 API：`SEARCH_API_KEY`、`SEARCH_API_URL`
- `BROWSER_ENABLED=true` — 开启浏览器自动化（默认 true）
- `SHELL_ALLOWED_PATHS` — Shell 白名单路径，逗号分隔
- `WORKSPACE_DIR` — 文件工具工作区，默认 `./workspace`
- `MEMORY_DIR` — 记忆存储目录，默认 `./data/memory`
- `PORT` — 服务端口，默认 3000

### 3. 飞书应用配置

1. 打开 [飞书开放平台](https://open.feishu.cn)，创建企业自建应用。
2. 在「权限与范围」中开通：
   - 以应用身份发消息
   - 获取与发送单聊、群组消息
   - 接收消息（`im:message:receive_v1` 等，按控制台提示勾选）
3. 在「事件订阅」中：
   - 请求地址：`https://你的域名/lark/webhook`（本地开发可用 ngrok 等暴露）
   - 订阅「接收消息」相关事件
   - 若开启加密，填写 Encrypt Key 并配置 `LARK_ENCRYPT_KEY`
4. 发布版本并启用；在需要使用的群聊/单聊中「添加机器人」。

### 4. 启动服务

```bash
# 开发（热重载）
npm run dev

# 生产
npm run build && npm start
```

服务默认监听 `http://0.0.0.0:3000`，飞书回调地址为：`http://你的主机:3000/lark/webhook`。

### 在阿里云服务器上部署

在阿里云 ECS 等 Linux 上常驻运行、配置 Nginx/HTTPS、飞书回调等，见 **[部署-阿里云服务器](./docs/部署-阿里云服务器.md)**。

## 使用示例

在已添加机器人的飞书会话中直接发消息即可，例如：

- 「帮我列出当前目录下的文件」→ 使用 `list_dir`
- 「记住我喜欢用 dark mode」→ 使用 `memory_set`
- 「搜索一下北京到上海明天的机票」→ 使用 `travel_search` / 研究搜索
- 「总结这段文字：……」→ 使用 `research_summarize`
- 「打开百度」→ 使用 `browse`（需开启浏览器）

## 项目结构

```
src/
├── index.ts           # 入口、HTTP 与 webhook 路由
├── config.ts          # 环境配置
├── lark/              # 飞书：客户端、webhook 解析、发消息
├── agent/             # Agent 循环、消息与 tool 格式
├── llm/               # OpenAI 调用与 tool calling
├── tools/             # 工具定义与实现（shell/文件/浏览器/记忆/邮件/旅行/研究）
└── memory/            # 持久化记忆存储
```

## 安全与权限

- Shell：仅在 `SHELL_ALLOWED_PATHS` 下执行，默认含当前目录与 `/tmp`。
- 文件：读写限定在 `WORKSPACE_DIR` 及子路径。
- 浏览器：需显式开启 `BROWSER_ENABLED`；建议在受控环境运行。
- 飞书：建议生产环境使用 HTTPS 并校验请求来源。

## 参考

- [ClawdBot 核心功能梳理](./docs/ClawdBot-核心功能梳理.md)
- [飞书开放平台 - 消息与事件](https://open.feishu.cn/document)
- [阿里云百炼 - OpenAI 兼容](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope)
- [百炼控制台 API-KEY](https://bailian.console.aliyun.com)
- [OpenAI API - Chat Completions (Tools)](https://platform.openai.com/docs/guides/function-calling)
