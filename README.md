# buddy-pi —— 在 pi 里接入任意 OpenAI 兼容网关

一个 pi 扩展：用命令**新增/管理自定义模型供应商**（名字、网关地址、API Key 全部自己填），不用手写配置、不用改代码。

- pi 自带的官方厂商（DeepSeek、OpenAI…）**一点不动**，照常走各自官方地址；
- 代码里**零硬编码**：没有默认密钥，也没有写死的网关地址；
- 支持**多套网关并存**，每套一个名字。

---

## 安装

```bash
pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi
```

github 的 https 连不上时：

```bash
GIT_CONFIG_COUNT=1 \
GIT_CONFIG_KEY_0='url.ssh://git@github.com/.insteadOf' \
GIT_CONFIG_VALUE_0='https://github.com/' \
pi install git:github.com:xxxxxxxxxfjx/workbuddy-pi
```

装完重启 pi（或 `/reload`）。此时还没有任何供应商——用下面的命令添加。

## 添加供应商

进 pi，输入：

```
/buddy add
```

依次填写：**名称**（如 `work`，pi 里会显示为 `buddy-work`）→ **网关地址**（结尾 `/v1`）→ **API Key**。
插件会自动请求 `<地址>/models` 拉取模型清单并保存、**立刻注册**（不用重启）。

非交互式（脚本/批量）：

```
/buddy add work http://10.0.0.5:7863/v1 sk-wb-xxxx
```

## 其他命令

| 命令 | 作用 |
|---|---|
| `/buddy` | 菜单：添加 / 列出 / 测试 / 删除 |
| `/buddy list` | 列出已配置的供应商（key 以掩码显示） |
| `/buddy test work` | 请求一次该网关的 `/models`，验证地址与 key |
| `/buddy remove work` | 删除该供应商并注销 |

## 使用

```
/model                     # 选 buddy-work 下的模型（Ctrl+S 设为默认）
```

或命令行直指定：

```bash
pi --model buddy-work/deepseek-v4.1-flash
```

## 配置文件（可手改）

`~/.pi/agent/buddy.json`（权限 600）：

```json
{
  "version": 2,
  "providers": {
    "work": {
      "name": "work",
      "baseUrl": "http://10.0.0.5:7863/v1",
      "apiKey": "sk-wb-…",
      "models": [{ "id": "deepseek-v4.1-flash", "contextWindow": 1000000, "maxTokens": 393216 }]
    }
  }
}
```

> 旧的单供应商格式 `{ "baseUrl": "...", "apiKey": "..." }` 会被自动识别为名为 `default` 的供应商。

## 一键脚本（服务器/批量）

```bash
bash install.sh <apiKey> [baseUrl] [名字]
# 例：bash install.sh sk-wb-xxxx http://10.0.0.5:7863/v1 work
```

脚本 = `pi install` + `/buddy add` + 自检。

## 排障

| 现象 | 原因 | 处理 |
|---|---|---|
| `/model` 里没有 `buddy-*` | 还没添加供应商 / 插件没加载 | `/buddy list` 看；`/buddy add` 添加；`pi list` 确认插件已装 |
| `/buddy add` 报 `拉取失败：HTTP 401` | key 无效 | 换有效 key 再添加 |
| `/buddy add` 报 `HTTP 404` | 地址不对 | 地址以 `/v1` 结尾（插件会自动补 `/v1`，但别写成 `/v1/chat/completions` 之类） |
| 连接超时 | 网关没起 / 网络不通 / 防火墙 | `curl -sS -m 5 <地址去掉 /v1>/healthz` |
| 提问报 `401 invalid_api_key` | 网关不认识这把 key | 检查面板里该 key 是否启用 |
| 想换 key/地址 | 再次 `/buddy add work <新地址> <新key>`（会问是否覆盖） | 或直接编辑 `buddy.json` |

## 更新 / 卸载

```bash
pi update --extensions        # 更新插件
pi remove workbuddy-pi        # 卸载（供应商配置保留在 buddy.json，可自行删除）
```
