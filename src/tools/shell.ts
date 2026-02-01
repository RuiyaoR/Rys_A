import { exec } from "child_process";
import { promisify } from "util";
import { resolve } from "path";
import { config } from "../config.js";

const execAsync = promisify(exec);
const allowedPaths = config.tools.shellAllowedPaths;

function isPathAllowed(cwd: string): boolean {
  const resolved = resolve(cwd);
  return allowedPaths.some((p) => resolved.startsWith(resolve(p)));
}

export async function runShell(
  command: string,
  cwd?: string
): Promise<string> {
  const workDir = cwd && cwd.trim() ? resolve(cwd) : process.cwd();
  if (!isPathAllowed(workDir)) {
    return `错误：工作目录不在白名单内。允许的路径：${allowedPaths.join(", ")}`;
  }
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workDir,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });
    const out = [stdout, stderr].filter(Boolean).join("\n").trim();
    return out || "（命令已执行，无输出）";
  } catch (e: unknown) {
    const err = e as { message?: string; stdout?: string; stderr?: string };
    const msg = err.message ?? "Unknown error";
    const out = [err.stdout, err.stderr].filter(Boolean).join("\n").trim();
    return `执行失败: ${msg}${out ? "\n" + out : ""}`;
  }
}
