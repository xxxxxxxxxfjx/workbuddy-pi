# wb2api-pi

把 **WatchBuddy2API** 反代注册成 [pi](https://github.com/badlogic/pi-mono)（`@earendil-works/pi-coding-agent`）的一个模型提供商，id 为 `wb2api`。

装完之后，在 pi 里 `/model`（或 Ctrl+L）就能看到这批模型，也可以直接：

```bash
pi --model wb2api/deepseek-v4.1-flash
```

## 安装

```bash
pi install https://gitee.com/<你的用户名>/wb2api-pi
# 或
pi install git:github.com/<你的用户名>/wb2api-pi
```

然后设置密钥（pi 在请求时从环境变量解析，不会写进任何文件）：

```powershell
setx WB2API_API_KEY "sk-wb-你的key"   # 之后重开终端
```

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `WB2API_API_KEY` | 是 | 反代密钥（面板签发的 `sk-wb-…`） |
| `WB2API_BASE_URL` | 否 | 反代地址，默认 `http://172.16.64.108:7863/v1` |

## 验证

```bash
pi --list-models          # 应出现 wb2api 一组
pi -p --model wb2api/deepseek-v4.1-flash "只回复两个字：可用"
```

## 卸载

```bash
pi remove wb2api-pi
```
