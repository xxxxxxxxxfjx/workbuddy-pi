#!/usr/bin/env bash
# Buddy（任意 OpenAI 兼容网关）的 pi 插件安装脚本 —— Linux / macOS / 服务器
#
# 用法：
#   bash install.sh <apiKey>                        # 默认名 work、地址 http://127.0.0.1:7863/v1
#   bash install.sh <apiKey> <baseUrl>              # 指定网关地址
#   bash install.sh <apiKey> <baseUrl> <名字>        # 指定供应商名字（pi 里显示 buddy-<名字>）
#
# 做完：pi 里 /model 会多出这个供应商；官方厂商（DeepSeek 等）不受影响。

set -euo pipefail

KEY="${1:-}"
BASE="${2:-http://127.0.0.1:7863/v1}"
NAME="${3:-work}"
REPO_SPEC="git:github.com:xxxxxxxxxfjx/workbuddy-pi"
REPO_RAW="https://raw.githubusercontent.com/xxxxxxxxxfjx/workbuddy-pi/main/index.ts"
AGENT_DIR="${BUDDY_AGENT_DIR:-$HOME/.pi/agent}"

if [ -z "$KEY" ]; then
  echo "用法: bash install.sh <apiKey> [baseUrl] [名字]" >&2
  exit 1
fi
case "$BASE" in
  */v1) ;;
  *) echo "地址必须以 /v1 结尾，当前是: $BASE" >&2; exit 1 ;;
esac
if ! command -v pi >/dev/null 2>&1; then
  echo "先安装 pi:  npm i -g @earendil-works/pi-coding-agent" >&2
  exit 1
fi

echo "==> 1/3 安装插件"
if ! GIT_CONFIG_COUNT=1 \
     GIT_CONFIG_KEY_0='url.ssh://git@github.com/.insteadOf' \
     GIT_CONFIG_VALUE_0='https://github.com/' \
     pi install "$REPO_SPEC"; then
  echo "    pi install 失败，改用单文件方式"
  mkdir -p "$AGENT_DIR/extensions"
  if ! curl -fsSL "$REPO_RAW" -o "$AGENT_DIR/extensions/buddy.ts"; then
    echo "    下载也失败：服务器访问不到 GitHub，请让提供者用 scp 传 index.ts" >&2
    exit 1
  fi
fi

echo "==> 2/3 添加供应商 $NAME（$BASE）"
# 用插件自带的 /buddy add：自动拉取模型清单、写配置、立刻注册
pi -p --no-session "/buddy add $NAME $BASE $KEY" 2>&1 | tail -3

echo "==> 3/3 验证"
if pi --list-models 2>/dev/null | grep -q "^buddy-"; then
  echo "    ✓ 已可用的 Buddy 模型："
  pi --list-models 2>/dev/null | grep -E '^buddy-' | head -5
  echo
  echo "完成：重启 pi（或 /reload），然后 /model → 选 buddy-${NAME} 下的模型"
else
  echo "    ✗ 没看到 buddy- 模型。检查网关：curl -sS -m 5 ${BASE%/v1}/healthz" >&2
  exit 1
fi
