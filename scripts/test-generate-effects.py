#!/usr/bin/env python3
"""测试生成前 3 个特效"""

import os
import sys

# 设置 API Key
os.environ["WAVESPEED_API_KEY"] = "a329907377c20848f126692adb8cd059"

# 导入主脚本
sys.path.insert(0, os.path.dirname(__file__))

# 导入并修改 EFFECTS 列表
import importlib.util
spec = importlib.util.spec_from_file_location("generator", "generate-video-effects-assets.py")
module = importlib.util.module_from_spec(spec)

# 只保留前 3 个特效进行测试
original_effects = [
    {"id": "kiss-me-ai", "name": "Kiss Me AI"},
    {"id": "muscle-surge", "name": "Muscle Surge"},
    {"id": "hulk", "name": "Hulk"},
]

# 替换 EFFECTS
module.EFFECTS = original_effects

# 加载并执行
spec.loader.exec_module(module)

if __name__ == "__main__":
    module.main()
