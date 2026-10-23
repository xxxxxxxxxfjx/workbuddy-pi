/**
 * Buddy → pi 的模型提供商（provider id: `buddy`）
 *
 * 给**任意 OpenAI 兼容网关**（默认本机 `http://127.0.0.1:7863/v1`）在 pi 里加一个厂商。
 * 不碰 pi 内置的 deepseek / openai 等官方厂商，它们照常走各自官方地址。
 *
 * 安装：`pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi`
 *       （或把本文件放进 ~/.pi/agent/extensions/buddy.ts）
 *
 * 地址与密钥的取值顺序（仓库里不含任何密钥）：
 *   1) 环境变量 BUDDY_BASE_URL / BUDDY_API_KEY
 *   2) 配置文件 ~/.pi/agent/buddy.json  { "baseUrl": "...", "apiKey": "..." }
 *   3) 内置默认地址 http://127.0.0.1:7863/v1（密钥无默认值）
 *
 * 没有配置密钥时模型不会被 pi 列出（pi 隐藏未配置凭据的厂商）。
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROVIDER_ID = "buddy";
const DEFAULT_MODEL = "deepseek-v4.1-flash";

/** 内置默认地址：本机 7863（OpenAI 兼容），用 BUDDY_BASE_URL 覆盖。 */
const DEFAULT_BASE_URL = "http://127.0.0.1:7863/v1";

const AGENT_DIR = process.env.BUDDY_AGENT_DIR ?? join(homedir(), ".pi", "agent");
const SET_DEFAULT_MARKER = join(AGENT_DIR, ".buddy-default-set");

/** 读取 ~/.pi/agent/buddy.json（不存在/损坏都当没有）。 */
function readLocalConfig(): { baseUrl?: string; apiKey?: string } {
  try {
    const parsed = JSON.parse(readFileSync(join(AGENT_DIR, "buddy.json"), "utf8"));
    return {
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : undefined,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : undefined,
    };
  } catch {
    return {};
  }
}

const local = readLocalConfig();
const BASE_URL = process.env.BUDDY_BASE_URL?.trim() || local.baseUrl || DEFAULT_BASE_URL;
const API_KEY = process.env.BUDDY_API_KEY?.trim() || local.apiKey;

/** 网关 /v1/models 下发的模型（contextWindow / maxTokens 取自上游声明）。 */
const MODELS: Array<{ id: string; contextWindow: number; maxTokens: number }> = [
  { id: "hy3", contextWindow: 192000, maxTokens: 64000 },
  { id: "step-5-preview", contextWindow: 1000000, maxTokens: 64000 },
  { id: "glm-5.3-flash", contextWindow: 1000000, maxTokens: 131072 },
  { id: "space-bunny", contextWindow: 1000000, maxTokens: 128000 },
  { id: "deepseek-v4.1-flash", contextWindow: 1000000, maxTokens: 393216 },
  { id: "hy3-x", contextWindow: 192000, maxTokens: 64000 },
  { id: "minimax-m3", contextWindow: 512000, maxTokens: 524288 },
  { id: "deepseek-v4-flash", contextWindow: 1000000, maxTokens: 50000 },
  { id: "hy4-preview", contextWindow: 1000000, maxTokens: 64000 },
  { id: "glm-5.1", contextWindow: 200000, maxTokens: 48000 },
  { id: "glm-5.2", contextWindow: 1000000, maxTokens: 131072 },
  { id: "glm-5.3", contextWindow: 1000000, maxTokens: 131072 },
  { id: "glm-5v-turbo", contextWindow: 200000, maxTokens: 64000 },
  { id: "kimi-k2.6", contextWindow: 256000, maxTokens: 32000 },
  { id: "kimi-k2.7", contextWindow: 256000, maxTokens: 32000 },
  { id: "deepseek-v4-pro", contextWindow: 1000000, maxTokens: 393216 },
  { id: "kimi-k2.8-preview", contextWindow: 1000000, maxTokens: 131072 },
  { id: "kimi-k3", contextWindow: 1000000, maxTokens: 1048576 },
];

export default function (pi: ExtensionAPI) {
  pi.registerProvider(PROVIDER_ID, {
    name: "Buddy",
    baseUrl: BASE_URL,
    // 没配置密钥就不写 apiKey —— pi 会把该厂商的模型隐藏，直到用户配置
    ...(API_KEY ? { apiKey: API_KEY } : {}),
    api: "openai-completions",
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: false,
      maxTokensField: "max_tokens",
    },
    models: MODELS.map((m) => ({
      id: m.id,
      name: m.id,
      reasoning: false,
      input: ["text"] as Array<"text" | "image">,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: m.contextWindow,
      maxTokens: m.maxTokens,
    })),
  });

  /**
   * 首次加载时把 Buddy 设为默认模型（只做一次，之后尊重用户在 /model 里的选择）。
   * 没配密钥时 pi.setModel 会失败，什么也不做。
   */
  pi.on("session_start", async (_event, ctx) => {
    if (existsSync(SET_DEFAULT_MARKER)) return;
    try {
      const current = ctx.model as { provider?: string } | undefined;
      if (current?.provider === PROVIDER_ID) {
        writeFileSync(SET_DEFAULT_MARKER, new Date().toISOString());
        return;
      }
      const registry = ctx.modelRegistry as { find?: (p: string, m: string) => unknown } | undefined;
      const model = registry?.find?.(PROVIDER_ID, DEFAULT_MODEL);
      if (!model) return;
      const ok = await pi.setModel(model as never);
      if (ok) writeFileSync(SET_DEFAULT_MARKER, new Date().toISOString());
    } catch {
      // 失败不影响插件本身；用户手动 /model 选即可
    }
  });
}
