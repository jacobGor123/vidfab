#!/bin/bash

# 解析视频数据的运行脚本
# Run & Debug script for video data parsing

echo "正在解析视频模板数据..."

# 创建输出目录
mkdir -p data/templates

# 运行解析脚本
node scripts/parse-video-data.js > data/templates/video-templates-raw.json

echo "解析完成！结果已保存到 data/templates/video-templates-raw.json"