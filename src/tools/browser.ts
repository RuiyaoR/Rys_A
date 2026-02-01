import { config } from "../config.js";

export interface BrowseOptions {
  action: "navigate" | "extract" | "click" | "fill";
  url?: string;
  selector?: string;
  value?: string;
}

export async function browse(options: BrowseOptions): Promise<string> {
  if (!config.tools.browserEnabled) {
    return "未开启浏览器。请设置 BROWSER_ENABLED=true。";
  }
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      const { action, url, selector, value } = options;
      if (action === "navigate" && url) {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        return "已打开页面";
      }
      if (action === "extract") {
        const text = await page.evaluate(() => document.body?.innerText ?? "");
        return text;
      }
      if (action === "click" && selector) {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        return "已点击";
      }
      if (action === "fill" && selector && value !== undefined) {
        await page.type(selector, value, { delay: 50 });
        return "已填写";
      }
      return "未识别的 action 或缺少参数";
    } finally {
      await browser.close();
    }
  } catch (e: unknown) {
    const err = e as Error & { message?: string };
    const msg = err.message ?? String(e);
    if (
      msg.includes("Failed to launch") ||
      msg.includes("browser process") ||
      msg.includes("libatk") ||
      msg.includes("shared object")
    ) {
      return `浏览器启动失败（常见于服务器缺少依赖）。Ubuntu/Debian 可执行: sudo apt-get update && sudo apt-get install -y chromium-browser 或安装 Puppeteer 文档中的依赖。也可设置 BROWSER_ENABLED=false 关闭浏览器能力。`;
    }
    return `浏览器执行异常: ${msg}`;
  }
}
