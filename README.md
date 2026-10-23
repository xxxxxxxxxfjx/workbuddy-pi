# buddy-pi —— 给 pi 加一个 Buddy 厂商（任意 OpenAI 兼容网关）

一条命令装完，`/model` 里多一个 **Buddy** 厂商，用来接**任意 OpenAI 兼容网关**（默认 `http://127.0.0.1:7863/v1`）。

- **pi 自带的官方厂商（DeepSeek、OpenAI…）一点不动**，照常走各自官方地址；
- 仓库里**不含任何密钥**，地址也不写死：用环境变量或 `~/.pi/agent/buddy.json` 配。

---

## 安装

```bash
pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi
```

github 的 https 连不上（国内常见）：

```bash
GIT_CONFIG_COUNT=1 \
GIT_CONFIG_KEY_0='url.ssh://git@github.com/.insteadOf' \
GIT_CONFIG_VALUE_0='https://github.com/' \
pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi
```

完全访问不到 github：把 `index.ts` 拷到 `~/.pi/agent/extensions/buddy.ts`。

## 配置

**1）网关地址**

```bash
export BUDDY_BASE_URL=http://你的网关:7863/v1     # 结尾必须 /v1
```

或用配置文件 `~/.pi/agent/buddy.json`：

```json
{ "baseUrl": "http://你的网关:7863/v1" }
```

**2）API 密钥**（`auth.json` 里的 `buddy` 条目 > 环境变量 > `buddy.json`）

```bash
export BUDDY_API_KEY=sk-xxx
```

或写进 `~/.pi/agent/buddy.json`（和 baseUrl 放一起）：

```json
{ "baseUrl": "http://你的网关:7863/v1", "apiKey": "sk-xxx" }
```

> 没有配置密钥时，Buddy 的模型**不会出现在 `/model` 里**（pi 的既有行为：未配置凭据的厂商隐藏）。
> 扩展形态不参与 pi 的 `/login`；想用 `/login` 填 key 请看本仓库的 `pi-fork` 分支（pi 源码定制版）。

## 验证

```bash
pi --list-models | grep '^buddy'                    # 应列出模型
pi --model buddy/deepseek-v4.1-flash "只回复两个字：可用"
```

## 使用

```bash
pi                                  # 进交互界面 → /model（Ctrl+L）→ Buddy → 选模型
pi --model buddy/glm-5.3-flash      # 或直接指定
```

首次加载且已配置密钥时，插件会把 Buddy 设为默认模型（只做一次，之后尊重你在 `/model` 里的选择；标记文件 `~/.pi/agent/.buddy-default-set`）。

## 换模型清单

`index.ts` 里的 `MODELS` 数组，每条形如：

```ts
{ id: "glm-5.3", contextWindow: 1000000, maxTokens: 131072 }
```

`contextWindow` / `maxTokens` 取网关 `GET /v1/models` 返回的 `context_length` / `max_output_tokens`。
改完 push，使用者执行 `pi update --extensions`。

## 排障

| 现象 | 原因 | 处理 |
|---|---|---|
| `/model` 里没有 Buddy | 没配密钥（厂商被隐藏）或插件没加载 | 配 `BUDDY_API_KEY`/`buddy.json`；`pi list` 确认已装；重启 pi 或 `/reload` |
| `401 {"error":{"message":"missing or invalid API key",…}}` | 到网关但 key 无效 | 换有效 key |
| `Authentication Fails, Your api key: ****xxxx is invalid`（带 request_id） | 打到上游官方 API 了，不是你的网关 | 检查 `BUDDY_BASE_URL` |
| 超时 / refused | 网关没起 / 不同网段 / 防火墙 | `curl -sS -m 5 <baseUrl 去掉 /v1>/healthz` |
| `404` | 地址少了 `/v1` | `BUDDY_BASE_URL` 必须以 `/v1` 结尾 |

## 更新 / 卸载

```bash
pi update --extensions
pi remove workbuddy-pi
```
