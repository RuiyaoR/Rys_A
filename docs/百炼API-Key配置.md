# 百炼 API Key 配置（解决 401 invalid_api_key）

出现 **401 Incorrect API key provided** 时，按下面步骤检查。

## 1. 获取正确的 API Key

1. 打开 **阿里云百炼控制台**：<https://bailian.console.aliyun.com>
2. 登录后进入 **API-KEY** 或 **密钥管理** 页面
3. 点击 **创建 API 密钥**，名称随意
4. 创建后会显示一串 **以 `sk-` 开头的密钥**，**只显示一次**，请立即复制保存

注意：

- 必须是 **百炼/灵积（DashScope）** 的 API Key，不是别的产品的密钥
- 北京、新加坡等地域的 Key 可能不同，请用当前地域控制台里创建的 Key

## 2. 在服务器上配置

在服务器项目目录的 `.env` 中设置（不要有多余空格或引号）：

```env
DASHSCOPE_API_KEY=sk-你复制的完整密钥
```

保存后重启：

```bash
pm2 restart rys-assistant
```

## 3. 常见错误

| 情况 | 处理 |
|------|------|
| 复制时多了空格或换行 | 重新复制，确保整行只有 `DASHSCOPE_API_KEY=sk-xxx` |
| 用了别的产品的 Key | 到百炼控制台重新创建并复制 |
| Key 已删除或过期 | 在控制台新建 Key 并更新 .env |
| .env 未生效 | 确认在 **项目根目录**（有 package.json 的目录），重启 PM2 |

## 4. 官方文档

- 获取 API Key：<https://help.aliyun.com/zh/model-studio/get-api-key>
- OpenAI 兼容接口说明：<https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope>
