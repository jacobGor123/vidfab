#!/bin/bash

echo "=========================================="
echo "测试 1: 第一次运行 (应该选择 P0 主题)"
echo "=========================================="
tsx scripts/blog/test-auto-generate.ts --auto 2>&1 | grep -E "(选题完成|标题:|Slug:|草稿占位|文章已|发布成功)" | head -20

echo ""
echo "=========================================="
echo "测试 2: 第二次运行 (应该选择不同的主题)"
echo "=========================================="
tsx scripts/blog/test-auto-generate.ts --auto 2>&1 | grep -E "(选题完成|标题:|Slug:|草稿占位|文章已|发布成功)" | head -20

echo ""
echo "=========================================="
echo "检查数据库中的文章"
echo "=========================================="
tsx scripts/blog/check-duplicate-posts.ts
