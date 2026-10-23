#!/usr/bin/env bash
# Buddy（WatchBuddy2API 反代）的 pi 插件一键安装 —— Linux / macOS / 服务器
#
# 用法：
#   bash install.sh sk-wb-你的key
#   bash install.sh sk-wb-你的key http://反代地址:7863/v1
#
# 做完：pi 里 /model 会多出一个厂商 Buddy，选中即可提问。官方 DeepSeek 等厂商不受影响。

set -euo pipefail

KEY="${1:-${BUDDY_API_KEY:-}}"
BASE="${2:-${BUDDY_BASE_URL:-http://172.16.64.108:7863/v1}}"
AGENT_DIR="${BUDDY_AGENT_DIR:-$HOME/.pi/agent}"
REPO_SPEC="git:github.com:xxxxxxxxxfjx/workbuddy-pi"
REPO_RAW="https://raw.githubusercontent.com/xxxxxxxxxfjx/workbuddy-pi/main/index.ts"

if [ -z "$KEY" ]; then
  echo "用法: bash install.sh sk-wb-你的key [http://反代地址:7863/v1]" >&2
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

echo "==> 2/3 写入 $AGENT_DIR/buddy.json"
mkdir -p "$AGENT_DIR"
node -e '
const fs = require("node:fs");
const path = require("node:path");
const [dir, baseUrl, apiKey] = process.argv.slice(1);
const file = path.join(dir, "buddy.json");
fs.writeFileSync(file, JSON.stringify({ baseUrl, apiKey }, null, 2) + "\n", { mode: 0o600 });
console.log("    " + file);
' -- "$AGENT_DIR" "$BASE" "$KEY"

echo "==> 3/3 验证"
if pi --list-models 2>/dev/null | grep -q '^buddy'; then
  echo "    ✓ 已出现 Buddy 厂商的模型："
  pi --list-models 2>/dev/null | grep -E '^buddy' | head -5
  echo
  echo "完成。用法："
  echo "  pi                          # 进去后 /model 选 Buddy 下的模型"
  echo "  pi --model buddy/deepseek-v4.1-flash"
else
  echo "    ✗ 没看到 buddy 模型。先确认网络：curl -sS -m 5 ${BASE%/v1}/healthz" >&2
  exit 1
fi
