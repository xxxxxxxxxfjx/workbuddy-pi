#!/usr/bin/env bash
# WatchBuddy2API 的 pi 插件一键安装（Linux / macOS）
#
# 用法：
#   bash install.sh sk-wb-你的key
#   bash install.sh sk-wb-你的key http://反代地址:7863/v1
#
# 做三件事：
#   1) pi install 本插件（GitHub HTTPS 不通时自动改走 SSH；再不行就退回"拷单文件"）
#   2) 写 ~/.pi/agent/wb2api.json（插件从这个文件读地址和密钥，不依赖 shell 环境变量）
#   3) 验证：列出 wb2api 的模型

set -euo pipefail

KEY="${1:-${WB2API_API_KEY:-}}"
BASE="${2:-${WB2API_BASE_URL:-http://172.16.64.108:7863/v1}}"
AGENT_DIR="${WB2API_AGENT_DIR:-$HOME/.pi/agent}"
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
  echo "    pi install 失败，改用单文件方式（放进 extensions 目录）"
  mkdir -p "$AGENT_DIR/extensions"
  if ! curl -fsSL "$REPO_RAW" -o "$AGENT_DIR/extensions/wb2api-pi.ts"; then
    echo "    单文件下载也失败：服务器访问不到 GitHub，请让提供者用 scp 传 index.ts 过来" >&2
    exit 1
  fi
fi

echo "==> 2/3 写入配置 $AGENT_DIR/wb2api.json"
mkdir -p "$AGENT_DIR"
node -e '
const fs = require("node:fs");
const path = require("node:path");
const [dir, baseUrl, apiKey] = process.argv.slice(1);
const file = path.join(dir, "wb2api.json");
fs.writeFileSync(file, JSON.stringify({ baseUrl, apiKey }, null, 2) + "\n", { mode: 0o600 });
console.log("    " + file);
' -- "$AGENT_DIR" "$BASE" "$KEY"

echo "==> 3/3 验证"
pi --list-models 2>/dev/null | grep -q wb2api && {
  echo "    ✓ 看到 wb2api 模型："
  pi --list-models 2>/dev/null | grep wb2api | head -5
  echo
  echo "完成。用法：pi  （进去后 /model 选 wb2api 下的模型）"
  echo "      或：pi --model wb2api/deepseek-v4.1-flash"
} || {
  echo "    ✗ 模型没出现。先确认网络能到反代：curl -sS -m 5 ${BASE%/v1}/healthz" >&2
  exit 1
}
