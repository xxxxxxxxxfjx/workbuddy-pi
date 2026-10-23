# pi 定制版：内置 `buddy` 网关厂商

在 [earendil-works/pi-mono](https://github.com/earendil-works/pi-mono) 上的定制 fork，只加了一件事：

> 内置一个名为 **Buddy** 的模型厂商，用来接**任意 OpenAI 兼容网关**（默认指向本机 `http://127.0.0.1:7863/v1`，例如自建的多账号反代）。

- 其余厂商（DeepSeek / OpenAI / Anthropic…）**完全保持上游行为**；
- 仓库里**不含任何密钥**：用 pi 自带的 `/login` 填，或用环境变量；
- 网关地址**不写死**：`BUDDY_BASE_URL` 环境变量为准。

## 安装

```bash
git clone --depth 1 -b pi-fork <本仓库地址> pi-buddy
cd pi-buddy
npm install --ignore-scripts      # 跳过 canvas 原生编译（需要 python；本定制版用不到）
npm run build
npm i -g ./packages/coding-agent
```

## 配置

**1）网关地址**（默认 `http://127.0.0.1:7863/v1`）

```bash
export BUDDY_BASE_URL=http://你的网关:7863/v1     # 结尾必须 /v1
```

**2）API 密钥**（两种任选）

```bash
# 方式 A：在 pi 里登录（推荐，存进 auth.json，可多把切换）
pi
/login          →  Sign in with an API key  →  Buddy  →  粘贴 key

# 方式 B：环境变量
export BUDDY_API_KEY=sk-xxx
```

> 没有配置密钥时，Buddy 的模型**不会出现在 `/model` 里**（pi 的既有行为：未配置凭据的厂商隐藏）。

## 使用

```bash
pi                 # 进交互界面 → /model → Buddy → 选模型（Ctrl+S 设为默认）
pi --model buddy/deepseek-v4.1-flash "你好"
```

## 改动清单

| 文件 | 改动 |
|---|---|
| `packages/ai/src/providers/buddy.ts` | **新增**：`buddy` 厂商定义（模型清单、`BUDDY_BASE_URL`、`apiKey` 登录流程） |
| `packages/ai/src/providers/all.ts` | 注册 `buddyProvider()` |
| `packages/ai/src/env-api-keys.ts` | 增加 `buddy: "BUDDY_API_KEY"` |
| `README-BUDDY.md` | 本文件 |

模型清单在 `buddy.ts` 的 `MODEL_DEFS` 里；网关的模型变了就改这个数组。

## 许可

跟随上游（MIT）。本仓库仅新增上述文件，未改动其他逻辑。