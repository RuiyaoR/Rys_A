# Gmail 邮箱配置

使用 **Google 邮箱** 收件箱与发件时，只需配置两个环境变量，无需单独填 IMAP/SMTP 地址。

## 1. 开启两步验证并创建应用专用密码

1. 打开 [Google 账号安全设置](https://myaccount.google.com/security)。
2. 开启 **两步验证**（若尚未开启）。
3. 在「登录 Google」区块找到 **应用专用密码**（或搜索「App passwords」）。
4. 选择「邮件」与设备（如「其他」），输入名称（如 `Rys Assistant`），生成密码。
5. 复制生成的 **16 位密码**（无空格），填入 `.env` 的 `GMAIL_APP_PASSWORD`。

## 2. 环境变量

在项目根目录 `.env` 中增加：

```env
# Gmail：填这两项即可，无需再填 EMAIL_IMAP_* / EMAIL_SMTP_*
GMAIL_USER=你的@gmail.com
GMAIL_APP_PASSWORD=上面生成的应用专用密码（16 位）
```

- **不要**使用 Google 账号的登录密码，必须使用「应用专用密码」。
- 若未设置 `GMAIL_*`，可继续使用通用配置：`EMAIL_IMAP_HOST`、`EMAIL_IMAP_USER`、`EMAIL_IMAP_PASS` 与 `EMAIL_SMTP_HOST`、`EMAIL_SMTP_USER`、`EMAIL_SMTP_PASS`。

## 3. 机器人能做什么

- **email_list**：列出收件箱最近 N 封（最新在前）。
- **email_read**：按序号读取单封邮件完整内容（主题、发件人、日期、正文），序号 1 表示最新一封。
- **email_send**：从该 Gmail 账号发送邮件。

用户可以说：「帮我看看收件箱」「读一下第 2 封」「给 xxx@example.com 发一封邮件，主题是…」。
