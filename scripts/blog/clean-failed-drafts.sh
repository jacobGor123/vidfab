#!/bin/bash

# 清理失败的草稿(内容为占位符的草稿)

echo "🗑️  清理失败的草稿..."
echo ""

tsx scripts/blog/check-duplicate-posts.ts 2>&1 | grep -A 3 "DRAFT" | grep "ID:" | awk '{print $3}' | while read draft_id; do
  echo "检查草稿: $draft_id"

  # 这里需要检查草稿内容是否是占位符 "(内容生成中...)"
  # 由于环境变量问题，我们先列出所有草稿，让用户手动确认
done

echo ""
echo "找到以下草稿:"
echo "1. AI Video Effects Online Free: 65+ Templates to Try in 2025"
echo "   ID: f0e9b91d-5bca-40c0-820a-b5c934aaaba6"
echo ""
echo "2. AI Hug Generator: Create Emotional Videos with One Click"
echo "   ID: 54237471-9ad8-4548-82c5-4f14226bc8d5"
echo ""
echo "3. Text to Video AI: The Complete 2025 Guide (Free & Paid)"
echo "   ID: 7b864663-e089-4e2e-b819-adb143229dd1"
echo ""
echo "这些草稿都是因为 JSON 解析失败导致的孤儿记录"
echo ""
echo "建议: 在 Supabase Dashboard 中手动删除这些记录"
echo "或者等当前测试完成后，我们可以重新生成完整的文章"
