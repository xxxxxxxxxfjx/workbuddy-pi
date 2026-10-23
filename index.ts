/**
 * Buddy —— 在 pi 里接入任意 OpenAI 兼容网关（多供应商、可视化添加）
 *
 * 设计原则：代码里**零硬编码**。地址、密钥、模型清单全部来自命令与配置文件。
 *
 * 配置文件：~/.pi/agent/buddy.json（权限 600）
 *   {
 *     "version": 2,
 *     "providers": {
 *       "work": { "name": "WorkBuddy", "baseUrl": "http://host:7863/v1",
 *                 "apiKey": "sk-…", "models": [{ "id": "glm-5.3", "contextWindow": 1000000, "maxTokens": 131072 }] }
 *     }
 *   }
 *
 * 命令：
 *   /buddy                      菜单（添加 / 列表 / 测试 / 删除）
 *   /buddy add                  交互式添加：名称 → 地址 → key（自动拉取模型清单）
 *   /buddy add <名字> <地址> <key>   非交互式（脚本/批量/CI 用）
 *   /buddy list                 列出已配置的供应商
 *   /buddy test <名字>          请求一次 <地址>/models 验证
 *   /buddy remove <名字>        删除并注销
 *
 * 每个供应商在 pi 里的 provider id 是 `buddy-<名字>`，选模型时写成
 *   pi --model buddy-work/deepseek-v4.1-flash
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const AGENT_DIR = process.env.BUDDY_AGENT_DIR ?? join(homedir(), ".pi", "agent");
const CONFIG_PATH = join(AGENT_DIR, "buddy.json");
const PROVIDER_PREFIX = "buddy-";
const DEFAULT_BASE_URL = "http://127.0.0.1:7863/v1";
const FALLBACK_CONTEXT_WINDOW = 1_000_000;
const FALLBACK_MAX_TOKENS = 64_000;

interface ModelDef {
  id: string;
  contextWindow: number;
  maxTokens: number;
}

interface Entry {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: ModelDef[];
}

interface Config {
  version: 2;
  providers: Record<string, Entry>;
}

/** 命令上下文里用到的最小 UI 接口（interactive / print 两种模式都有）。 */
interface CmdCtx {
  hasUI?: boolean;
  ui: {
    input(title: string, placeholder?: string): Promise<string | undefined>;
    select(title: string, options: string[]): Promise<string | undefined>;
    confirm(title: string, message: string): Promise<boolean>;
    notify(message: string, type?: "info" | "warning" | "error"): void;
  };
}

// ---------------------------------------------------------------- 配置读写

function emptyConfig(): Config {
  return { version: 2, providers: {} };
}

/** 读取配置；兼容旧的单供应商格式 { baseUrl, apiKey }。 */
function readConfig(): Config {
  let raw: string;
  try {
    raw = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return emptyConfig();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyConfig();
  }
  if (!parsed || typeof parsed !== "object") return emptyConfig();
  const obj = parsed as Record<string, unknown>;

  // 旧格式：{ baseUrl, apiKey, models? }
  if (!obj.providers && typeof obj.baseUrl === "string") {
    const legacy: Entry = {
      name: typeof obj.name === "string" ? obj.name : "Buddy",
      baseUrl: obj.baseUrl,
      apiKey: typeof obj.apiKey === "string" ? obj.apiKey : "",
      models: Array.isArray(obj.models) ? (obj.models as ModelDef[]) : [],
    };
    return { version: 2, providers: { default: legacy } };
  }

  const providers: Record<string, Entry> = {};
  const src = (obj.providers ?? {}) as Record<string, unknown>;
  for (const [slug, value] of Object.entries(src)) {
    if (!value || typeof value !== "object") continue;
    const e = value as Record<string, unknown>;
    if (typeof e.baseUrl !== "string" || !e.baseUrl) continue;
    providers[slug] = {
      name: typeof e.name === "string" && e.name ? e.name : slug,
      baseUrl: e.baseUrl,
      apiKey: typeof e.apiKey === "string" ? e.apiKey : "",
      models: Array.isArray(e.models) ? (e.models as ModelDef[]) : [],
    };
  }
  return { version: 2, providers };
}

function writeConfig(cfg: Config): void {
  mkdirSync(AGENT_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(cfg, null, 2)}\n`, { mode: 0o600 });
}

// ---------------------------------------------------------------- 工具

/** 通知：交互模式走 UI，非交互（-p）同时打印到标准输出，便于脚本查看。 */
function say(ctx: CmdCtx, message: string, type: "info" | "warning" | "error" = "info"): void {
  try {
    ctx.ui.notify(message, type);
  } catch {
    /* 某些模式下没有 UI 实现 */
  }
  if (ctx.hasUI === false) console.log(message);
}

function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "buddy";
}

function maskKey(key: string): string {
  if (!key) return "(未设置)";
  if (key.length <= 8) return "*".repeat(key.length);
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

/** 从网关 GET <baseUrl>/models 拉模型清单（OpenAI 格式）。 */
async function fetchModels(baseUrl: string, apiKey: string): Promise<ModelDef[]> {
  const url = `${baseUrl.replace(/\/+$/, "")}/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`GET ${url} → HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: unknown };
  const data = Array.isArray(json.data) ? json.data : [];
  const models: ModelDef[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    if (typeof m.id !== "string" || !m.id) continue;
    models.push({
      id: m.id,
      contextWindow: typeof m.context_length === "number" ? m.context_length : FALLBACK_CONTEXT_WINDOW,
      maxTokens: typeof m.max_output_tokens === "number" ? m.max_output_tokens : FALLBACK_MAX_TOKENS,
    });
  }
  if (models.length === 0) throw new Error(`${url} 没有返回任何模型（data 为空）`);
  return models;
}

/** 把一条配置注册成 pi 的 provider。 */
function registerEntry(pi: ExtensionAPI, slug: string, e: Entry): void {
  pi.registerProvider(`${PROVIDER_PREFIX}${slug}`, {
    name: e.name || slug,
    baseUrl: e.baseUrl,
    ...(e.apiKey ? { apiKey: e.apiKey } : {}),
    api: "openai-completions",
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: false,
      maxTokensField: "max_tokens",
    },
    models: e.models.map((m) => ({
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

// ---------------------------------------------------------------- 子命令

async function addProvider(pi: ExtensionAPI, ctx: CmdCtx, args: string): Promise<void> {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  let display = "";
  let baseUrl = "";
  let apiKey = "";

  if (parts.length >= 3) {
    // 非交互：/buddy add <名字> <地址> <key>
    display = parts[0]!;
    baseUrl = parts[1]!;
    apiKey = parts[2]!;
  } else {
    const name = await ctx.ui.input("供应商名称（例如 WorkBuddy）", "WorkBuddy");
    if (!name) return say(ctx, "已取消");
    display = name;
    const url = await ctx.ui.input("网关地址（OpenAI 兼容，结尾 /v1）", DEFAULT_BASE_URL);
    if (!url) return say(ctx, "已取消");
    baseUrl = url;
    const key = await ctx.ui.input("API Key（sk-…）", "sk-…");
    if (!key) return say(ctx, "已取消");
    apiKey = key;
  }

  const slug = slugify(display);
  baseUrl = normalizeBaseUrl(baseUrl);

  const cfg = readConfig();
  if (cfg.providers[slug]) {
    const overwrite = await ctx.ui.confirm("已存在同名供应商", `buddy-${slug} 已配置，覆盖它吗？`);
    if (!overwrite) return say(ctx, "保留原配置");
  }

  say(ctx, `正在从 ${baseUrl}/models 拉取模型清单…`);
  let models: ModelDef[];
  try {
    models = await fetchModels(baseUrl, apiKey);
  } catch (error) {
    return say(ctx, `拉取失败：${(error as Error).message}`, "error");
  }

  cfg.providers[slug] = { name: display, baseUrl, apiKey, models };
  writeConfig(cfg);
  registerEntry(pi, slug, cfg.providers[slug]!);
  say(ctx, `已添加 buddy-${slug}（${models.length} 个模型）→ 现在可用 /model 选择`);
}

function listProviders(ctx: CmdCtx): void {
  const cfg = readConfig();
  const entries = Object.entries(cfg.providers);
  if (entries.length === 0) return say(ctx, "还没有配置任何供应商，用 /buddy add 添加", "warning");
  for (const [slug, e] of entries) {
    say(ctx, `buddy-${slug}  ${e.name}  ${e.baseUrl}  key=${maskKey(e.apiKey)}  模型 ${e.models.length} 个`);
  }
}

async function pickSlug(ctx: CmdCtx, action: string): Promise<string | undefined> {
  const cfg = readConfig();
  const slugs = Object.keys(cfg.providers);
  if (slugs.length === 0) {
    say(ctx, "还没有配置任何供应商，用 /buddy add 添加", "warning");
    return undefined;
  }
  return (await ctx.ui.select(`选择要${action}的供应商`, slugs)) ?? undefined;
}

async function testProvider(ctx: CmdCtx, slug: string): Promise<void> {
  const entry = readConfig().providers[slug];
  if (!entry) return say(ctx, `没有 buddy-${slug}`, "error");
  try {
    const models = await fetchModels(entry.baseUrl, entry.apiKey);
    say(ctx, `buddy-${slug} 正常：${models.length} 个模型（${entry.baseUrl}）`);
  } catch (error) {
    say(ctx, `buddy-${slug} 失败：${(error as Error).message}`, "error");
  }
}

async function removeProvider(pi: ExtensionAPI, ctx: CmdCtx, slug: string): Promise<void> {
  const cfg = readConfig();
  if (!cfg.providers[slug]) return say(ctx, `没有 buddy-${slug}`, "error");
  const ok = await ctx.ui.confirm("确认删除", `删除 buddy-${slug}（${cfg.providers[slug]!.baseUrl}）？`);
  if (!ok) return;
  delete cfg.providers[slug];
  writeConfig(cfg);
  pi.unregisterProvider(`${PROVIDER_PREFIX}${slug}`);
  say(ctx, `已删除 buddy-${slug}`);
}

// ---------------------------------------------------------------- 插件入口

export default function (pi: ExtensionAPI) {
  // 启动时把配置里已有的供应商注册进 pi
  for (const [slug, entry] of Object.entries(readConfig().providers)) {
    registerEntry(pi, slug, entry);
  }

  pi.registerCommand("buddy", {
    description: "管理 Buddy 网关供应商：add / list / test / remove",
    getArgumentCompletions: (prefix: string) => {
      const actions = ["add", "list", "test", "remove"];
      return actions
        .filter((a) => a.startsWith(prefix.trim()))
        .map((a) => ({ value: a, label: a, description: `buddy ${a}` }));
    },
    handler: async (args, ctx) => {
      const ui = ctx as unknown as CmdCtx;
      const [action, ...rest] = args.trim().split(/\s+/).filter(Boolean);

      if (!action) {
        const choice = await ui.ui.select("Buddy 网关管理", [
          "添加供应商 (add)",
          "列出已配置 (list)",
          "测试连通性 (test)",
          "删除供应商 (remove)",
        ]);
        if (!choice) return;
        if (choice.startsWith("添加")) return addProvider(pi, ui, "");
        if (choice.startsWith("列出")) return listProviders(ui);
        if (choice.startsWith("测试")) {
          const slug = await pickSlug(ui, "测试");
          if (slug) await testProvider(ui, slug);
          return;
        }
        const slug = await pickSlug(ui, "删除");
        if (slug) await removeProvider(pi, ui, slug);
        return;
      }

      if (action === "add") return addProvider(pi, ui, rest.join(" "));
      if (action === "list") return listProviders(ui);
      if (action === "test") {
        const slug = rest[0] ?? (await pickSlug(ui, "测试"));
        if (slug) await testProvider(ui, slug);
        return;
      }
      if (action === "remove") {
        const slug = rest[0] ?? (await pickSlug(ui, "删除"));
        if (slug) await removeProvider(pi, ui, slug);
        return;
      }
      return say(ui, `未知子命令：${action}（可用 add / list / test / remove）`, "error");
    },
  });
}

/** 配置文件的绝对路径（供外部脚本/测试读取）。 */
export const configPath = (): string => CONFIG_PATH;
