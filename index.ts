/**
 * Buddy → pi 的模型提供商（provider id: `buddy`）
 *
 * 只做一件事：把 WatchBuddy2API 反代注册成一个**独立的厂商 `buddy`**。
 * 不碰 pi 内置的 deepseek / openai 等官方厂商，它们照常走官方地址。
 *
 * 安装：`pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi`
 *       （或把本文件放进 ~/.pi/agent/extensions/buddy.ts）
 *
 * 地址与密钥的取值顺序：
 *   1) 环境变量 BUDDY_BASE_URL / BUDDY_API_KEY
 *   2) 配置文件 ~/.pi/agent/buddy.json（install.sh 会写）
 *         { "baseUrl": "http://172.16.64.108:7863/v1", "apiKey": "sk-wb-…" }
 *   3) 内置默认地址；key 没有则交给 pi 的 auth.json 里的 `buddy` 条目
 *
 * 拿到 key 后模型才会出现在 /model 里（pi 隐藏未配置凭据的厂商）。
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROVIDER_ID = "buddy";
const DEFAULT_BASE_URL = "http://172.16.64.108:7863/v1";

/** 读取 ~/.pi/agent/buddy.json（不存在/损坏都当没有）。 */
function readLocalConfig(): { baseUrl?: string; apiKey?: string } {
  try {
    const agentDir = process.env.BUDDY_AGENT_DIR ?? join(homedir(), ".pi", "agent");
    const parsed = JSON.parse(readFileSync(join(agentDir, "buddy.json"), "utf8"));
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
  pi.registerProvider(PROVIDER_ID, {
    name: "Buddy",
    baseUrl: BASE_URL,
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
}
