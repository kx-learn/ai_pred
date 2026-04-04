#!/usr/bin/env bash
# 在 Linux / macOS / Git Bash 下部署 dist 到服务器。
#
# 用法:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
#   DEPLOY_HOST=1.2.3.4 ./scripts/deploy.sh
#
# 环境变量:
#   DEPLOY_HOST   默认 111.229.25.160
#   DEPLOY_USER   默认 ubuntu
#   DEPLOY_PATH   默认 /home/project2/dist
#   SKIP_BUILD=1  仅上传已有 dist，不执行 npm
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEPLOY_HOST="${DEPLOY_HOST:-111.229.25.160}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/project2/dist}"

echo "==> 项目目录: $ROOT"
echo "==> 目标: ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"

if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  echo "==> npm install..."
  npm install
  echo "==> npm run build..."
  npm run build
else
  echo "==> 已跳过构建 (SKIP_BUILD=1)"
fi

if [[ ! -f "$ROOT/dist/index.html" ]]; then
  echo "错误: dist/index.html 不存在" >&2
  exit 1
fi

echo "==> rsync 上传..."
rsync -avz --delete "$ROOT/dist/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "==> 完成。服务器上如需重载 Nginx:"
echo "    sudo nginx -t && sudo systemctl reload nginx"
