import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import type { ApiKeyAuth } from "../auth/types.ts";
import { createProvider, type Provider } from "../models.ts";
import type { Model } from "../types.ts";

/** WatchBuddy2API 反代地址（可用环境变量 BUDDY_BASE_URL 覆盖）。 */
const BUDDY_BASE_URL = process.env.BUDDY_BASE_URL?.trim() || "http://172.16.64.108:7863/v1";

/**
 * 内置默认密钥（面板签发的分发 key），可用 BUDDY_API_KEY 或 /login 覆盖。
 * 这是本 fork 的产品取舍：开箱即用，不需要用户配置任何东西。
 */
const BUDDY_DEFAULT_API_KEY = "sk-wb-a341ac4c6b9ef2ca03d957c62e18e23d2d14ceb8";

const MODEL_DEFS: ReadonlyArray<{ id: string; contextWindow: number; maxTokens: number }> = [
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

const buddyModels: Model<"openai-completions">[] = MODEL_DEFS.map((def) => ({
	id: def.id,
	name: def.id,
	api: "openai-completions",
	baseUrl: BUDDY_BASE_URL,
	provider: "buddy",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: def.contextWindow,
	maxTokens: def.maxTokens,
	type: "chat",
	compat: {
		supportsDeveloperRole: false,
		supportsReasoningEffort: false,
		maxTokensField: "max_tokens",
	},
})) as Model<"openai-completions">[];

/** 存下来的凭据 > BUDDY_API_KEY > 内置默认 key。 */
const buddyAuth: ApiKeyAuth = {
	name: "Buddy API key",
	login: async (interaction) => {
		interaction.signal.throwIfAborted();
		const key = await interaction.prompt({ type: "secret", message: "Enter Buddy API key" });
		interaction.signal.throwIfAborted();
		return { type: "api_key", key };
	},
	resolve: async ({ ctx, credential, signal }) => {
		signal.throwIfAborted();
		if (credential?.key) {
			return { auth: { apiKey: credential.key }, env: credential.env, source: "stored credential" };
		}
		const envKey = await ctx.env("BUDDY_API_KEY");
		signal.throwIfAborted();
		if (envKey) return { auth: { apiKey: envKey }, source: "BUDDY_API_KEY" };
		return { auth: { apiKey: BUDDY_DEFAULT_API_KEY }, source: "built-in key" };
	},
};

export function buddyProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "buddy",
		name: "Buddy",
		baseUrl: BUDDY_BASE_URL,
		auth: { apiKey: buddyAuth },
		models: buddyModels,
		api: openAICompletionsApi(),
	});
}