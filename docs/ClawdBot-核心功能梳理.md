# ClawdBot（OpenClaw）核心功能梳理

> ClawdBot 是**能实际执行任务**的 AI 助手，而不仅是“谈论”任务。  
> 官方：<https://howtouseclawdbot.com/features.html> | 文档：<https://docs.clawd.bot/>

---

## 一、系统层核心能力（Core Capabilities）

| 能力 | 说明 |
|------|------|
| **浏览器控制** | 导航网站、填表单、点击按钮、提取数据，像真人一样使用网页 |
| **文件系统** | 读写与整理文件、创建文档、处理数据、管理文件夹 |
| **Shell 命令** | 在聊天里执行终端命令、跑脚本、管理进程 |
| **持久化记忆** | 记住偏好、历史对话，并学习你的使用习惯 |

---

## 二、应用层功能（What You Can Do）

### 生产力

- **邮件**：读/总结收件箱、起草与发送回复、归档/标签/整理、搜索邮件  
- **日历**：查看日程、创建事件/会议、设置提醒、查找空闲时间  
- **任务管理**：待办列表、提醒、项目跟踪、笔记  

### 旅行

- 航班值机、查机票/酒店优惠、获取登机牌、跟踪预订  

### 智能家居

- 控制灯光、调节温控、锁门/解锁、执行场景/例行  

### 研究

- 网页搜索、产品对比、文章摘要、信息查找  

---

## 三、聊天与接入平台（Chat Platforms）

通过常用 IM 使用 ClawdBot：

- **WhatsApp**：个人/群聊、语音、文件  
- **Telegram**：Bot、频道、内联键盘、大文件  
- **Discord**：服务器、私信、Slash 命令  
- **Slack**：工作区、频道、线程  
- **Signal**：端到端加密  
- **iMessage**：与苹果生态集成  

另有 **WebChat**（基于 WebSocket 的网页聊天界面）。

---

## 四、集成生态（Integrations）

- **生产力**：Gmail、Google Calendar、Outlook、Notion、Obsidian、Todoist、Linear、Jira、Trello  
- **开发**：GitHub、GitLab、VS Code、Docker、AWS、终端  
- **社交与媒体**：Twitter/X、Spotify、YouTube、Reddit、RSS  
- **智能家居**：Home Assistant、Philips Hue、Nest、Ring、智能插座  

---

## 五、可扩展性（Extensibility）

- **社区技能**：从 [ClawdHub](https://clawdhub.com) 安装现成技能  
- **自定义插件**：按需求开发自己的集成  
- **自创建技能**：ClawdBot 可在需要时动态创建新技能  

---

## 六、技术特性（Technical Details）

- **自托管**：运行在你自己的机器上  
- **自有 API Key**：使用你自己的 AI 服务商凭证（如 OpenAI、Anthropic）  
- **可配置权限**：可配置对系统资源的访问范围  
- **开源**：代码可在 GitHub 查看  

### AI 模型支持

- **Anthropic Claude**（推荐）  
- **OpenAI GPT**（含 GPT-4 等）  
- **本地模型**：通过 Ollama 运行 Llama、Mistral 等  

---

## 七、架构要点（Gateway Architecture）

- **单一 Gateway**：一个长期运行的 Gateway 进程统一管理所有聊天面（WhatsApp、Telegram、Slack、Discord、Signal、iMessage、WebChat 等）。  
- **控制端**：macOS 应用、CLI、Web 管理界面通过 **WebSocket** 连接 Gateway（默认 `127.0.0.1:18789`）。  
- **Node**：macOS/iOS/Android/无头设备以 `role: node` 连接同一 Gateway，提供设备能力（如画布、相机、屏幕录制、定位等）。  
- **配对与信任**：新设备需配对审批，本地连接可自动通过；远程可通过 Tailscale、VPN 或 SSH 隧道访问。  

---

## 八、小结

ClawdBot 的核心可以概括为：

1. **能执行**：浏览器、文件、Shell、记忆，形成“可操作”的 AI 助手。  
2. **多入口**：IM + WebChat + CLI + 本地 App，按场景选择。  
3. **可扩展**：技能、插件、自建技能，便于定制。  
4. **隐私与可控**：自托管、自有 API、可配置访问，数据和权限在你手中。  

如需更细的功能说明（如某条聊天渠道、某个插件或 Gateway 配置），可对照官方文档：<https://docs.clawd.bot/>。
