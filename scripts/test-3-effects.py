#!/usr/bin/env python3
"""测试生成前 3 个特效"""

import os
import sys

# 设置 API Key
os.environ["WAVESPEED_API_KEY"] = "a329907377c20848f126692adb8cd0594e1a1ebef19140b7369b79a69c800929"

# 导入主脚本
sys.path.insert(0, os.path.dirname(__file__))

from pathlib import Path
exec_path = Path(__file__).parent / "generate-video-effects-assets.py"

# 读取并修改
with open(exec_path, "r") as f:
    code = f.read()

# 替换 EFFECTS 列表为只包含前 3 个
original_effects_section = """# 所有 Pixverse V5 特效列表
EFFECTS = ["""

test_effects_section = """# 测试：只生成前 3 个特效
EFFECTS = [
    {"id": "kiss-me-ai", "name": "Kiss Me AI"},
    {"id": "muscle-surge", "name": "Muscle Surge"},
    {"id": "hulk", "name": "Hulk"},
]

# 原始完整列表（已注释）
_ORIGINAL_EFFECTS = ["""

code = code.replace(original_effects_section, test_effects_section, 1)

# 执行代码
exec(code)
