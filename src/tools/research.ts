import { config } from "../config.js";
import { browse } from "./browser.js";

/**
 * 研究：网页搜索（可用外部 API 或浏览器）；摘要用 LLM 在 agent 里做或简单截断
 */
export async function researchSearch(query: string, numResults = 5): Promise<string> {
  const num = Math.min(20, Math.max(1, parseInt(String(numResults), 10) || 5));
  if (config.search.apiKey && config.search.apiUrl) {
    try {
      const url = `${config.search.apiUrl}?q=${encodeURIComponent(query)}&num=${num}`;
      const res = await fetch(url, {
        headers: { "X-API-Key": config.search.apiKey } as Record<string, string>,
      });
      const data = (await res.json()) as { organic?: Array<{ title?: string; snippet?: string }> };
      const list = data.organic ?? [];
      const lines = list.slice(0, num).map((o, i) => `${i + 1}. ${o.title ?? ""}\n   ${o.snippet ?? ""}`);
      return lines.join("\n\n") || "（无结果）";
    } catch (e: unknown) {
      const err = e as { message?: string };
      return `搜索 API 失败: ${err.message ?? "Unknown"}`;
    }
  }
  if (config.tools.browserEnabled) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    await browse({ action: "navigate", url: searchUrl });
    const text = await browse({ action: "extract" });
    return text.slice(0, 6000).replace(/\s+/g, " ").trim() || "（未获取到内容）";
  }
  return "未配置搜索 API 且未开启浏览器。请设置 SEARCH_API_KEY/SEARCH_API_URL 或 BROWSER_ENABLED=true。";
}

/**
 * 简单摘要：截断或交给 LLM。此处做简单截断，复杂摘要可由 Agent 调用 LLM。
 */
export function researchSummarize(text: string, maxLength = 500): string {
  const max = Math.min(2000, Math.max(100, parseInt(String(maxLength), 10) || 500));
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max) + "...";
}
