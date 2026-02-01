import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";
import { config } from "../config.js";

let browser: Browser | null = null;
let page: Page | null = null;

async function getPage(): Promise<Page> {
  if (!config.tools.browserEnabled) {
    throw new Error("浏览器功能未开启（BROWSER_ENABLED=false）");
  }
  if (!page || !page.browser().connected) {
    if (browser) await browser.close();
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
  }
  return page;
}

export async function browse(params: {
  action: string;
  url?: string;
  selector?: string;
  value?: string;
}): Promise<string> {
  const { action, url, selector, value } = params;
  const p = await getPage();

  switch (action) {
    case "navigate": {
      if (!url) return "缺少参数 url";
      await p.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
      return `已打开: ${url}`;
    }
    case "extract": {
      const text = await p.evaluate(() => document.body?.innerText ?? "");
      return text.slice(0, 15000) || "（页面无文本）";
    }
    case "click": {
      if (!selector) return "缺少参数 selector";
      await p.waitForSelector(selector, { timeout: 5000 });
      await p.click(selector);
      return "已点击";
    }
    case "fill": {
      if (!selector) return "缺少参数 selector";
      await p.waitForSelector(selector, { timeout: 5000 });
      await p.type(selector, value ?? "", { delay: 50 });
      return "已填写";
    }
    default:
      return `未知 action: ${action}。支持: navigate, extract, click, fill`;
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}
