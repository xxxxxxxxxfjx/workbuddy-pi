# buddy-pi —— 给 pi 加一个 Buddy 厂商（WatchBuddy2API 反代）

一条命令装完，重启 pi 就能用。**pi 自带的官方厂商（DeepSeek、OpenAI…）一点不动**，照常走官方地址。

```bash
pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi
# 重启 pi  →  /model 里出现 Buddy → 选一个模型 → 直接提问
```

插件自己带着反代地址和密钥，**不需要额外配置文件、不需要 `/login`、不需要设环境变量**。

---

## 安装

```bash
# 正常情况
pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi

# 如果 github 的 https 连不上（国内常见）
GIT_CONFIG_COUNT=1 \
GIT_CONFIG_KEY_0='url.ssh://git@github.com/.insteadOf' \
GIT_CONFIG_VALUE_0='https://github.com/' \
pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi

# 如果服务器完全访问不到 github：把 index.ts 拷进扩展目录
mkdir -p ~/.pi/agent/extensions && cp index.ts ~/.pi/agent/extensions/buddy.ts
```

装完**重启 pi**（或在 pi 里 `/reload`），然后直接对话即可——**第一次启动插件会自动把默认模型设为 Buddy**（`buddy/deepseek-v4.1-flash`，只设一次，之后你在 `/model` 里的选择优先）。

想手动切换：

```
/model  →  Buddy → deepseek-v4.1-flash      （Ctrl+S 可设为默认）
/model  →  deepseek → …                      （官方厂商，需官方 key）
```

验证（可选）：

```bash
pi --list-models | grep '^buddy'            # 应列出 18 个模型
pi --model buddy/deepseek-v4.1-flash "你好"
```

## 换地址 / 换密钥（可选）

插件内置的默认值够用；要覆盖就按下面优先级（高的优先）：

1. 环境变量

```bash
export BUDDY_BASE_URL=http://反代地址:7863/v1
export BUDDY_API_KEY=sk-wb-你自己的key
```

2. 配置文件 `~/.pi/agent/buddy.json`

```json
{ "baseUrl": "http://反代地址:7863/v1", "apiKey": "sk-wb-你自己的key" }
```

3. 插件内置默认值（`index.ts` 里的 `DEFAULT_BASE_URL` / `DEFAULT_API_KEY`）

> 地址结尾必须是 `/v1`。

## 网络前提

内置地址是提供者的局域网地址，先确认能连通：

```bash
curl -sS -m 5 http://172.16.64.108:7863/healthz ; echo
# 有 {"healthy":N,...} 才算通；超时 = 不同网段 / 防火墙没放行
```

跨网络用时让提供者用 Cloudflare Tunnel / frp 暴露，再设 `BUDDY_BASE_URL=https://域名/v1`。

## ⚠️ 不要把反代 key 填进 `/login`

`/login` 是给**官方厂商**用的。填进 DeepSeek 的 `/login` 会被当成 `api.deepseek.com` 的凭据，提问就报：

```
401 Authentication Fails, Your api key: ****xxxx is invalid
```

本插件只用 `buddy` 这个新厂商，与 `/login` 无关。

## 排障

| 现象 | 原因 | 处理 |
|---|---|---|
| `/model` 里没有 Buddy | 插件没加载 | `pi list` 看是否装上；重启 pi 或 `/reload`；也可改用拷贝 `index.ts` 的方式 |
| `401 {"error":{"message":"missing or invalid API key",...}}` | 到反代了，内置 key 被停用/轮换过 | 找提供者要新 key，用 `BUDDY_API_KEY` 或 `buddy.json` 覆盖 |
| `Authentication Fails, Your api key: ****xxxx is invalid`（带 request_id） | 打到 DeepSeek 官方了 | 检查 `BUDDY_BASE_URL`，别用 `/login` 配 |
| 超时 / refused | 反代没起 / 不同网段 / 防火墙 | 用上面的 curl 测 |
| `404` | 地址少了 `/v1` | `BUDDY_BASE_URL` 必须以 `/v1` 结尾 |

## 更新 / 卸载

```bash
pi update --extensions      # 更新插件（模型清单变化也走这个）
pi remove workbuddy-pi      # 卸载（包名以 pi list 显示为准）
```
