/**
 * WatchBuddy2API → pi 模型提供商（provider id: `wb2api`）
 *
 * 用法：把本文件放进 `C:\Users\<你>\.pi\agent\extensions\` 即生效（pi 自动发现），
 * 或在 pi 启动时 `pi -e 路径\wb2api-pi.ts`。
 *
 * 需要的环境变量：
 *   WB2API_API_KEY   （必填）反代的密钥：面板签发的 sk-wb-… 或提供者的 config.json api_key
 *   WB2API_BASE_URL  （可选）反代地址，默认 http://172.16.64.108:7863/v1
 *
 * 之后在 pi 里：/model（或 Ctrl+L）→ 选 wb2api 下的模型；也可直接
 *   pi --model wb2api/deepseek-v4.1-flash
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** 反代根地址：/v1 结尾（OpenAI 兼容协议）。 */
const BASE_URL = process.env.WB2API_BASE_URL ?? "http://172.16.64.108:7863/v1";

/**
 * 密钥来源有两种，任选其一（pi 的 auth.json 优先于环境变量）：
 *   1) ~/.pi/agent/auth.json 里 `"wb2api": { "type": "api_key", "key": "sk-wb-…" }`（推荐，不依赖 shell）
 *   2) 环境变量 WB2API_API_KEY
 * 有环境变量时用它；没有就不写 apiKey，交给 auth.json 解析。
 */
const API_KEY = process.env.WB2API_API_KEY?.trim();

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
    // 只有真的设了环境变量才写 apiKey；否则省略，让 pi 去 auth.json 里找
    ...(API_KEY ? { apiKey: API_KEY } : {}),
    api: "openai-completions",
    // 反代是 OpenAI 兼容层，不需要 developer 角色 / reasoning_effort，输出上限用 max_tokens
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
