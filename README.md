# wb2api-pi

把 **WatchBuddy2API** 反代注册成 [pi](https://github.com/badlogic/pi-mono)（`@earendil-works/pi-coding-agent`）的一个模型提供商，id 为 `wb2api`。

装完之后在 pi 里 `/model`（或 Ctrl+L）就能看到这批模型，也可以直接：

```bash
pi --model wb2api/deepseek-v4.1-flash
```

---

## 安装

需要先有 `pi`（没有就装：`npm i -g @earendil-works/pi-coding-agent`）。

```bash
pi install git:github.com/xxxxxxxxxfjx/workbuddy-pi
# 等价写法
pi install https://github.com/xxxxxxxxxfjx/workbuddy-pi
```

### 设置密钥（必须）

密钥由 pi 在请求时从环境变量读取，**不会写进任何文件**。

**Linux / macOS（bash / zsh）**

```bash
# 写进 shell 配置，之后每个终端都有效
echo 'export WB2API_API_KEY=sk-wb-你的key' >> ~/.bashrc    # zsh 用 ~/.zshrc
source ~/.bashrc
```

只想当前窗口生效：`export WB2API_API_KEY=sk-wb-你的key`

**Windows（PowerShell）**

```powershell
setx WB2API_API_KEY "sk-wb-你的key"   # 重开终端生效
# 或当前窗口：$env:WB2API_API_KEY='sk-wb-你的key'
```

### 反代地址不在本机时

默认地址是 `http://172.16.64.108:7863/v1`。要换（反代在别的机器/端口）：

```bash
export WB2API_BASE_URL=http://反代地址:7863/v1     # 结尾必须是 /v1
```

Windows：`setx WB2API_BASE_URL "http://反代地址:7863/v1"`

## 验证

```bash
pi --list-models | grep wb2api
pi -p --model wb2api/deepseek-v4.1-flash "只回复两个字：可用"
```

## 日常使用

```bash
pi                                    # 进去后 /model 选 wb2api 下的模型
pi --model wb2api/glm-5.3-flash       # 直接指定
```

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `WB2API_API_KEY` | 是 | 反代密钥（面板签发的 `sk-wb-…`） |
| `WB2API_BASE_URL` | 否 | 反代地址，默认 `http://172.16.64.108:7863/v1` |

## 卸载

```bash
pi remove workbuddy-pi     # 包名以 pi list 显示的为准
```

## 手动安装（不想用 pi install 时）

把本仓库的 `index.ts` 复制到扩展目录，pi 会自动发现（`/reload` 可热载）：

```bash
mkdir -p ~/.pi/agent/extensions
cp index.ts ~/.pi/agent/extensions/wb2api-pi.ts
```

## 排障

| 现象 | 原因 | 处理 |
|---|---|---|
| `/model` 里没有 `wb2api` | 扩展没加载 | `pi list` 看是否装上；`pi -e ./index.ts --list-models` 单独验证 |
| `401 invalid_api_key` | key 不对/停用 | 换面板里有效的 key；确认 `echo $WB2API_API_KEY` 有值 |
| `Authentication Fails, Your api key: ****xxxx is invalid`（带 request_id） | 打到了 DeepSeek 官方，不是反代 | 检查 `WB2API_BASE_URL` |
| 连接超时 / refused | 反代没起、不在同一网段、防火墙没放行 | `curl http://172.16.64.108:7863/healthz` 有 JSON 才算通 |
| `404` | 地址少了 `/v1` | `WB2API_BASE_URL` 必须以 `/v1` 结尾 |
