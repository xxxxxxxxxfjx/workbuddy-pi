# pi 定制版（内置 Buddy 厂商）

本仓库是在 [earendil-works/pi-mono](https://github.com/earendil-works/pi-mono) 上的**定制 fork**，唯一改动：内置一个名为 **Buddy** 的模型厂商，指向 WatchBuddy2API 反代（`http://172.16.64.108:7863/v1`，OpenAI 兼容协议）。

- 其余厂商（DeepSeek / OpenAI / Anthropic…）**完全保持上游行为**，走各自官方地址；
- Buddy 的密钥已内置（可用 `BUDDY_API_KEY` 覆盖，或用 `/login` 选 Buddy 存到 `auth.json`）；
- 反代地址可用环境变量 `BUDDY_BASE_URL` 覆盖（结尾必须 `/v1`）。

## 安装（同事用）

```bash
git clone --depth 1 -b pi-fork https://github.com/xxxxxxxxxfjx/workbuddy-pi.git pi-buddy
cd pi-buddy
npm install --ignore-scripts        # 跳过 canvas 原生编译（本定制版不需要它）
npm run build
npm i -g ./packages/coding-agent    # 全局安装成 pi 命令
```

> GitHub HTTPS 不通时改用 SSH：`git clone --depth 1 -b pi-fork git@github.com:xxxxxxxxxfjx/workbuddy-pi.git pi-buddy`

## 使用

```bash
pi                                  # 进入交互模式
/model                              # → Buddy → deepseek-v4.1-flash（Ctrl+S 设为默认）
pi --model buddy/deepseek-v4.1-flash "你好"     # 或命令行直接指定
```

## 改了哪里

| 文件 | 改动 |
|---|---|
| `packages/ai/src/providers/buddy.ts` | **新增**：Buddy provider（18 个模型、内置地址与密钥、`BUDDY_API_KEY` 覆盖） |
| `packages/ai/src/providers/all.ts` | 注册 `buddyProvider()` |
| `packages/ai/src/env-api-keys.ts` | 加 `buddy: "BUDDY_API_KEY"` |

## 网络前提

反代默认是提供者的局域网地址，先确认能通：

```bash
curl -sS -m 5 http://172.16.64.108:7863/healthz ; echo
```

跨网络时让提供者用 Cloudflare Tunnel / frp 暴露，然后：

```bash
export BUDDY_BASE_URL=https://你的域名/v1
```