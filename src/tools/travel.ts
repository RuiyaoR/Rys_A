import { browse } from "./browser.js";
import { config } from "../config.js";

/**
 * 旅行相关：搜索航班/酒店（通过浏览器打开搜索页并提取结果），或打开值机页
 */
export async function travelSearch(query: string): Promise<string> {
  if (!config.tools.browserEnabled) {
    return "未开启浏览器。请设置 BROWSER_ENABLED=true，或使用 research_search 做文字搜索。";
  }
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  await browse({ action: "navigate", url: searchUrl });
  const text = await browse({ action: "extract" });
  const summary = text.slice(0, 3000).replace(/\s+/g, " ").trim();
  return summary || "（未获取到内容）";
}

export async function travelCheckin(airlineHint?: string, bookingRef?: string): Promise<string> {
  if (!config.tools.browserEnabled) {
    return "未开启浏览器，无法打开值机页面。";
  }
  const hint = (airlineHint ?? "值机").trim();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(hint + " 在线值机")}`;
  await browse({ action: "navigate", url: searchUrl });
  const text = await browse({ action: "extract" });
  const snippet = text.slice(0, 2000).replace(/\s+/g, " ").trim();
  return (
    `已打开值机相关搜索页。${bookingRef ? ` 预订编号: ${bookingRef}` : ""}\n\n页面摘要:\n${snippet}`
  );
}
