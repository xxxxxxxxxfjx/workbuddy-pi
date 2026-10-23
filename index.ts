/**
 * WatchBuddy2API → pi 模型提供商（provider id: `wb2api`）
 *
 * 安装：`pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi`
 *       （或把本文件放进 ~/.pi/agent/extensions/wb2api-pi.ts）
 *
 * 密钥与地址的三个来源，优先级从高到低：
 *   1) 环境变量 WB2API_BASE_URL / WB2API_API_KEY
 *   2) 配置文件 ~/.pi/agent/wb2api.json（install.sh 会自动写这个文件）
 *         { "baseUrl": "http://172.16.64.108:7863/v1", "apiKey": "sk-wb-…" }
 *   3) 内置默认：baseUrl = http://172.16.64.108:7863/v1；key 交给 pi 的 auth.json
 *
 * 只要拿到 key（1 或 2），模型就会出现在 /model 里；否则 pi 会把它们隐藏。
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_BASE_URL = "http://172.16.64.108:7863/v1";

/** 读取 ~/.pi/agent/wb2api.json（不存在或损坏都当没有）。 */
function readLocalConfig(): { baseUrl?: string; apiKey?: string } {
  try {
    const agentDir = process.env.WB2API_AGENT_DIR ?? join(homedir(), ".pi", "agent");
    const raw = readFileSync(join(agentDir, "wb2api.json"), "utf8");
    const parsed = JSON.parse(raw);
    return {
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : undefined,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : undefined,
    };
  } catch {
    return {};
  }
}

const local = readLocalConfig();
const BASE_URL = process.env.WB2API_BASE_URL?.trim() || local.baseUrl || DEFAULT_BASE_URL;
const API_KEY = process.env.WB2API_API_KEY?.trim() || local.apiKey;

/** 反代 /v1/models 下发的模型（contextWindow / maxTokens 取自上游声明）。 */
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
  pi.registerProvider("wb2api", {
    name: "WatchBuddy2API",
    baseUrl: BASE_URL,
    // 有 key 就带上（模型才会出现在 /model 里）；没有则留给 pi 的 auth.json
    ...(API_KEY ? { apiKey: API_KEY } : {}),
    api: "openai-completions",
    // 反代是 OpenAI 兼容层：不需要 developer 角色与 reasoning_effort，输出上限用 max_tokens
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
}
