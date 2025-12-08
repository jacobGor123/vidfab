#!/usr/bin/env python3
"""快速测试生成 1 个特效"""

import os
import time
import requests
from pathlib import Path

# 配置
API_KEY = "a329907377c20848f126692adb8cd0594e1a1ebef19140b7369b79a69c800929"
BASE_URL = "https://api.wavespeed.ai/api/v3"
OUTPUT_DIR = Path(__file__).parent.parent / "static" / "video-effects"
TEST_IMAGE = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80"

# 创建输出目录
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("🎬 测试生成 Kiss Me AI 特效")
print(f"📁 输出目录: {OUTPUT_DIR}\n")

# 1. 提交生成请求
print("1️⃣ 提交生成请求...")
response = requests.post(
    f"{BASE_URL}/pixverse/pixverse-v5-effects",
    headers=headers,
    json={
        "effect": "Kiss Me AI",
        "image": TEST_IMAGE,
        "resolution": "720p",
        "duration": 5,
        "aspect_ratio": "16:9"
    }
)

if response.status_code != 200:
    print(f"❌ 请求失败: {response.status_code}")
    print(response.text)
    exit(1)

data = response.json()
request_id = data.get("data", {}).get("id")
print(f"✅ 请求已提交: {request_id}\n")

# 2. 轮询结果
print("2️⃣ 等待生成完成（最多 5 分钟）...")
for i in range(30):  # 30 次 * 10 秒 = 5 分钟
    time.sleep(10)

    response = requests.get(
        f"{BASE_URL}/predictions/{request_id}/result",
        headers=headers
    )

    data = response.json()
    status = data.get("data", {}).get("status")
    progress = data.get("data", {}).get("progress", 0)

    if status == "completed":
        outputs = data.get("data", {}).get("outputs", [])
        if outputs:
            video_url = outputs[0]
            print(f"\n✅ 生成完成！")
            print(f"📹 视频 URL: {video_url}\n")

            # 3. 下载视频
            print("3️⃣ 下载视频...")
            video_path = OUTPUT_DIR / "kiss-me-ai_video.mp4"
            video_response = requests.get(video_url, stream=True)
            with open(video_path, "wb") as f:
                for chunk in video_response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"✅ 视频已保存: {video_path}\n")

            # 4. 提取海报
            print("4️⃣ 提取海报...")
            import cv2
            from PIL import Image

            cap = cv2.VideoCapture(str(video_path))
            ret, frame = cap.read()
            cap.release()

            if ret:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image = Image.fromarray(frame_rgb)
                poster_path = OUTPUT_DIR / "kiss-me-ai_poster.webp"
                image.save(poster_path, "WEBP", quality=85, method=6)
                print(f"✅ 海报已保存: {poster_path}\n")

                print("🎉 测试成功！所有功能正常工作。")
                print("\n现在可以运行完整脚本生成所有 31 个特效:")
                print("  export WAVESPEED_API_KEY='a329907377c20848f126692adb8cd059'")
                print("  python3 scripts/generate-video-effects-assets.py")
            break

    elif status == "failed":
        print(f"❌ 生成失败: {data.get('data', {}).get('error')}")
        break

    else:
        print(f"⏳ [{i+1}/30] {status} - {progress}%")

