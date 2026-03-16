#!/bin/bash
# 发布单篇博客文章到生产环境
# 用法: ./scripts/publish-article.sh <json-file> [published|draft]
#
# 示例:
#   ./scripts/publish-article.sh discuss/blog-articles/my-article.json published
#   ./scripts/publish-article.sh discuss/blog-articles/my-article.json draft

set -e

FILE="${1}"
STATUS="${2:-published}"

if [ -z "$FILE" ]; then
  echo "错误: 必须指定文章 JSON 文件路径"
  echo "用法: $0 <json-file> [published|draft]"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "错误: 文件不存在: $FILE"
  exit 1
fi

echo ">> 发布文章: $FILE (status: $STATUS)"
pnpm tsx scripts/publish-custom-article.ts --file "$FILE" --status "$STATUS"
