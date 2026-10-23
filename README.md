# wb2api-pi

把 **WatchBuddy2API** 反代注册成 [pi](https://github.com/badlogic/pi-mono)（`@earendil-works/pi-coding-agent`）的一个模型提供商，id 为 `wb2api`。

装完之后在 pi 里 `/model`（Ctrl+L）就能看到这批模型：

```bash
pi --model wb2api/deepseek-v4.1-flash
```

---

## 1. 安装

```bash
# 前提：有 node / npm / git；没装 pi 就先装
npm i -g @earendil-works/pi-coding-agent

pi install git:github.com/xxxxxxxxxfjx/workbuddy-pi
```

> **网络提示**：国内网络经常连不上 GitHub 的 HTTPS（`Failed to connect github.com:443`）。两种办法：
>
> ```bash
> # 办法一：让 git 这次走 SSH（需已配好 GitHub SSH key：ssh -T git@github.com 能出 Hi ...）
> GIT_CONFIG_COUNT=1 \
> GIT_CONFIG_KEY_0='url.ssh://git@github.com/.insteadOf' \
> GIT_CONFIG_VALUE_0='https://github.com/' \
> pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi
>
> # 办法二：完全不用 GitHub——把 index.ts 拷到扩展目录即可
> mkdir -p ~/.pi/agent/extensions
> cp index.ts ~/.pi/agent/extensions/wb2api-pi.ts
> ```

## 2. 配密钥（必须，否则模型不会出现在 `/model` 里）

pi 只显示"已经配好密钥"的 provider。密钥两种给法，**任选其一**：

### 方式 A：写进 `auth.json`（推荐，不依赖 shell 环境）

编辑 `~/.pi/agent/auth.json`（没有就新建），加一条：

```json
{
  "wb2api": { "type": "api_key", "key": "sk-wb-你的key" }
}
```

如果文件里已经有别的内容（例如 `deepseek`），就在里面**并列加一行**，保持 JSON 合法，例如：

```json
{
  "deepseek": { "type": "api_key", "key": "sk-..." },
  "wb2api": { "type": "api_key", "key": "sk-wb-你的key" }
}
```

### 方式 B：环境变量

```bash
echo 'export WB2API_API_KEY=sk-wb-你的key' >> ~/.bashrc   # zsh 用 ~/.zshrc
source ~/.bashrc
```

Windows：`setx WB2API_API_KEY "sk-wb-你的key"`（重开终端生效）

> systemd 常驻服务用 unit 里的 `Environment=WB2API_API_KEY=...`，不能靠 shell。

## 3. 验证

```bash
pi --list-models | grep wb2api          # 应列出 18 个模型
pi -p --model wb2api/deepseek-v4.1-flash "你好"
```

如果 `--list-models` 里没有 wb2api，先看第 4 节的"没有 wb2api"那一行。

## 4. 反代地址

默认 `http://172.16.64.108:7863/v1`。反代不在这台机器上就改：

```bash
export WB2API_BASE_URL=http://反代地址:7863/v1     # 结尾必须是 /v1
```

**先确认网络能通**（局域网地址只有同网段才行）：

```bash
curl -sS -m 5 http://172.16.64.108:7863/healthz ; echo
# 返回 {"healthy":N,...} 才算通；超时 = 网络/防火墙问题
```

## 5. 日常使用

```bash
pi                                   # 进去后 /model 选 wb2api 下的模型
pi --model wb2api/glm-5.3-flash      # 或者命令行直接指定
```

## 6. 卸载

```bash
pi remove workbuddy-pi        # 包名以 pi list 显示的为准
```

## 7. 排障

| 现象 | 原因 | 处理 |
|---|---|---|
| `/model` 里没有 wb2api（插件已出现在启动信息的 Extensions 里） | 没配密钥 → 模型被过滤 | 做第 2 节（auth.json 最省事） |
| 启动信息里 Extensions 也没有 wb2api | 插件没装上/没加载 | `pi list` 查看；或改用"拷 index.ts 到 `~/.pi/agent/extensions/`" |
| `401 invalid_api_key` | key 不对/停用 | 换面板里有效的 key；确认 auth.json 里的 key 没写错 |
| `Authentication Fails, Your api key: ****xxxx is invalid`（带 request_id） | 打到了 DeepSeek 官方，不是反代 | 检查 `WB2API_BASE_URL` |
| 连接超时 / refused | 反代没起、不同网段、防火墙没放行 | 用第 4 节的 curl 命令测 |
| `404` | 地址少了 `/v1` | `WB2API_BASE_URL` 必须以 `/v1` 结尾 |
| 装的时候 github 连不上 | GitHub HTTPS 被墙 | 用第 1 节的两个办法 |
