# buddy-pi（WatchBuddy2API 反代的 pi 插件）

给 [pi](https://github.com/badlogic/pi-mono)（`@earendil-works/pi-coding-agent`）**新增一个厂商 `Buddy`**，指向 WatchBuddy2API 反代。

- pi 里原有的厂商（DeepSeek、OpenAI…）**完全不动**，照常走各自官方地址；
- 装完重启 pi，`/model` 里多出 `Buddy` 一组模型，选中即可提问。

```bash
pi --model buddy/deepseek-v4.1-flash
```

---

## 一键安装（Linux / macOS / 服务器）

```bash
bash install.sh sk-wb-你的key
# 反代地址不是默认的再加一个参数：
bash install.sh sk-wb-你的key http://反代地址:7863/v1
```

脚本做三件事：装插件 → 写 `~/.pi/agent/buddy.json`（地址+密钥，权限 600）→ 自检。

## 手动安装

```bash
# 1) 装插件
pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi
#    github https 连不上时让 git 走 ssh：
#    GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0='url.ssh://git@github.com/.insteadOf' \
#    GIT_CONFIG_VALUE_0='https://github.com/' pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi
#    完全访问不到 github：把 index.ts 拷到 ~/.pi/agent/extensions/buddy.ts

# 2) 写配置
mkdir -p ~/.pi/agent
printf '{\n  "baseUrl": "http://172.16.64.108:7863/v1",\n  "apiKey": "sk-wb-你的key"\n}\n' > ~/.pi/agent/buddy.json
chmod 600 ~/.pi/agent/buddy.json
```

## 配置来源（优先级从高到低）

1. 环境变量 `BUDDY_BASE_URL` / `BUDDY_API_KEY`
2. `~/.pi/agent/buddy.json`
3. 内置默认地址 `http://172.16.64.108:7863/v1`（key 交给 pi `auth.json` 里的 `buddy` 条目）

> pi 会隐藏"没有配置凭据"的厂商，所以 key 一定要给到（1 或 2）。官方厂商不受影响。

## 使用

```bash
pi                                 # 进去后 /model（Ctrl+L）→ Buddy → 选模型
pi --model buddy/glm-5.3-flash     # 直接指定
```

想把某个 Buddy 模型设为默认：`/model` 里选中后按 **Ctrl+S**。

## ⚠️ 不要把反代 key 填进 `/login`

`/login` 是给**官方厂商**用的。把反代 key 填进 DeepSeek 的 `/login`，它会被当成 `api.deepseek.com` 的凭据，提问时报：

```
401 Authentication Fails, Your api key: ****xxxx is invalid
```

反代只需要 `buddy.json`（或环境变量），与 `/login` 无关。误填过的话，用 `/logout` 清掉该官方厂商，或把 `~/.pi/agent/auth.json` 里对应条目改回官方 key。

## 网络前提

默认地址是提供者的局域网地址，先确认能连通：

```bash
curl -sS -m 5 http://172.16.64.108:7863/healthz ; echo
# 有 {"healthy":N,...} 才算通；超时 = 不同网段 / 防火墙没放行
```

跨网络时让提供者用 Cloudflare Tunnel / frp 暴露，然后：

```bash
bash install.sh sk-wb-你的key https://你的域名/v1
```

## 排障

| 现象 | 原因 | 处理 |
|---|---|---|
| `/model` 里没有 Buddy | 没读到 key（厂商被隐藏） | 检查 `~/.pi/agent/buddy.json` 的 `apiKey`；或设 `BUDDY_API_KEY` |
| 启动信息 Extensions 里也没本插件 | 没装上 | `pi list`；或改用"拷 index.ts 到 `~/.pi/agent/extensions/`" |
| `401 {"error":{"message":"missing or invalid API key"...}}` | 到反代了，key 不对/停用 | 换提供者给的有效 key |
| `Authentication Fails, Your api key: ****xxxx is invalid`（带 request_id） | 打到 DeepSeek 官方了 | 检查 `baseUrl`；别用 `/login` 配 |
| 超时 / refused | 反代没起 / 不同网段 / 防火墙 | 用上面的 curl 测 |
| `404` | 地址少了 `/v1` | `baseUrl` 必须以 `/v1` 结尾 |

## 更新 / 卸载

```bash
pi update --extensions       # 更新插件（模型清单变了也走这个）
pi remove workbuddy-pi       # 卸载（包名以 pi list 显示为准）
```
