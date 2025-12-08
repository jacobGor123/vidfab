#!/usr/bin/env python3
"""
自动生成 Pixverse V5 特效资源脚本

功能：
1. 使用 Wavespeed API 为每个特效生成示例视频
2. 从视频中提取第一帧作为海报图片
3. 转换为所需格式（WebP, MP4）
4. 保存到指定目录

依赖：
pip install requests pillow opencv-python
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from typing import Dict, List, Optional
import cv2
from PIL import Image

# 配置
WAVESPEED_API_KEY = os.getenv("WAVESPEED_API_KEY", "a329907377c20848f126692adb8cd0594e1a1ebef19140b7369b79a69c800929")
WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3"
OUTPUT_DIR = Path(__file__).parent.parent / "static" / "video-effects"
TEST_IMAGE_URL = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80"  # 示例人物图片

# 所有 Pixverse V5 特效列表
EFFECTS = [
    {"id": "kiss-me-ai", "name": "Kiss Me AI"},
    {"id": "muscle-surge", "name": "Muscle Surge"},
    {"id": "hulk", "name": "Hulk"},
    {"id": "venom", "name": "Venom"},
    {"id": "squid-game", "name": "Squid Game"},
    {"id": "robot", "name": "Robot"},
    {"id": "the-tiger-touch", "name": "The Tiger Touch"},
    {"id": "hug", "name": "Hug"},
    {"id": "holy-wings", "name": "Holy Wings"},
    {"id": "microwave", "name": "Microwave"},
    {"id": "zombie-mode", "name": "Zombie Mode"},
    {"id": "baby-face", "name": "Baby Face"},
    {"id": "black-myth-wukong", "name": "Black Myth: Wukong"},
    {"id": "long-hair-magic", "name": "Long Hair Magic"},
    {"id": "leggy-run", "name": "Leggy Run"},
    {"id": "fin-tastic-mermaid", "name": "Fin-tastic Mermaid"},
    {"id": "punch-face", "name": "Punch Face"},
    {"id": "creepy-devil-smile", "name": "Creepy Devil Smile"},
    {"id": "thunder-god", "name": "Thunder God"},
    {"id": "eye-zoom-challenge", "name": "Eye Zoom Challenge"},
    {"id": "whos-arrested", "name": "Who's Arrested?"},
    {"id": "baby-arrived", "name": "Baby Arrived"},
    {"id": "werewolf-rage", "name": "Werewolf Rage"},
    {"id": "bald-swipe", "name": "Bald Swipe"},
    {"id": "boom-drop", "name": "BOOM DROP"},
    {"id": "huge-cutie", "name": "Huge Cutie"},
    {"id": "liquid-metal", "name": "Liquid Metal"},
    {"id": "sharksnap", "name": "Sharksnap!"},
    {"id": "dust-me-away", "name": "Dust Me Away"},
    {"id": "warmth-of-jesus", "name": "Warmth of Jesus"},
    {"id": "anything", "name": "Anything"},
]


class WavespeedEffectsGenerator:
    """Wavespeed 特效资源生成器"""

    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("WAVESPEED_API_KEY 环境变量未设置")

        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        # 创建输出目录
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        print(f"📁 输出目录: {OUTPUT_DIR}")

    def generate_video(self, effect_name: str, image_url: str = TEST_IMAGE_URL) -> Optional[str]:
        """
        使用 Wavespeed API 生成特效视频

        Returns:
            视频 URL 或 None
        """
        endpoint = f"{WAVESPEED_BASE_URL}/pixverse/pixverse-v5-effects"

        payload = {
            "effect": effect_name,
            "image": image_url,
            "resolution": "720p",
            "duration": 5,
            "aspect_ratio": "16:9"
        }

        try:
            print(f"🚀 提交特效生成请求: {effect_name}")
            response = requests.post(endpoint, headers=self.headers, json=payload)
            response.raise_for_status()

            data = response.json()
            request_id = data.get("data", {}).get("id")

            if not request_id:
                print(f"❌ 无法获取 request_id: {effect_name}")
                return None

            print(f"✅ 请求已提交，request_id: {request_id}")

            # 轮询获取结果
            return self.poll_result(request_id, effect_name)

        except Exception as e:
            print(f"❌ 生成失败 {effect_name}: {str(e)}")
            return None

    def poll_result(self, request_id: str, effect_name: str, max_wait: int = 300) -> Optional[str]:
        """
        轮询获取生成结果

        Args:
            request_id: 请求 ID
            effect_name: 特效名称
            max_wait: 最大等待时间（秒）

        Returns:
            视频 URL 或 None
        """
        endpoint = f"{WAVESPEED_BASE_URL}/predictions/{request_id}/result"
        start_time = time.time()

        while time.time() - start_time < max_wait:
            try:
                response = requests.get(endpoint, headers=self.headers)
                response.raise_for_status()

                data = response.json()
                status = data.get("data", {}).get("status")

                if status == "completed":
                    outputs = data.get("data", {}).get("outputs", [])
                    if outputs and len(outputs) > 0:
                        video_url = outputs[0]
                        print(f"✅ 生成完成: {effect_name}")
                        print(f"   视频 URL: {video_url}")
                        return video_url
                    else:
                        print(f"❌ 无输出结果: {effect_name}")
                        return None

                elif status == "failed":
                    error = data.get("data", {}).get("error", "Unknown error")
                    print(f"❌ 生成失败 {effect_name}: {error}")
                    return None

                else:
                    # 还在处理中
                    progress = data.get("data", {}).get("progress", 0)
                    print(f"⏳ 处理中 {effect_name}: {status} ({progress}%)")
                    time.sleep(10)  # 等待 10 秒后重试

            except Exception as e:
                print(f"❌ 轮询错误 {effect_name}: {str(e)}")
                time.sleep(5)

        print(f"⏰ 超时: {effect_name}")
        return None

    def download_video(self, video_url: str, effect_id: str) -> Optional[Path]:
        """
        下载视频文件

        Returns:
            本地视频文件路径或 None
        """
        output_path = OUTPUT_DIR / f"{effect_id}_video.mp4"

        try:
            print(f"⬇️  下载视频: {effect_id}")
            response = requests.get(video_url, stream=True)
            response.raise_for_status()

            with open(output_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            print(f"✅ 下载完成: {output_path}")
            return output_path

        except Exception as e:
            print(f"❌ 下载失败 {effect_id}: {str(e)}")
            return None

    def extract_poster(self, video_path: Path, effect_id: str) -> Optional[Path]:
        """
        从视频中提取最后一帧作为海报

        Returns:
            海报图片路径或 None
        """
        poster_path = OUTPUT_DIR / f"{effect_id}_poster.webp"

        try:
            print(f"🎨 提取海报: {effect_id}")

            # 使用 OpenCV 读取视频最后一帧
            cap = cv2.VideoCapture(str(video_path))

            # 获取总帧数
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            # 设置到最后一帧（如果总帧数为0，则读取第一帧）
            if total_frames > 1:
                cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames - 1)

            ret, frame = cap.read()
            cap.release()

            if not ret:
                print(f"❌ 无法读取视频帧: {effect_id}")
                return None

            # 转换 BGR 到 RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # 使用 PIL 保存为 WebP
            image = Image.fromarray(frame_rgb)
            image.save(poster_path, "WEBP", quality=85, method=6)

            print(f"✅ 海报生成完成: {poster_path} (最后一帧)")
            return poster_path

        except Exception as e:
            print(f"❌ 海报生成失败 {effect_id}: {str(e)}")
            return None

    def process_effect(self, effect: Dict[str, str]) -> bool:
        """
        处理单个特效：生成视频 + 提取海报

        Returns:
            是否成功
        """
        effect_id = effect["id"]
        effect_name = effect["name"]

        print(f"\n{'='*60}")
        print(f"处理特效: {effect_name} ({effect_id})")
        print(f"{'='*60}")

        # 检查是否已存在
        video_path = OUTPUT_DIR / f"{effect_id}_video.mp4"
        poster_path = OUTPUT_DIR / f"{effect_id}_poster.webp"

        if video_path.exists() and poster_path.exists():
            print(f"⏭️  资源已存在，跳过: {effect_id}")
            return True

        # 1. 生成视频
        video_url = self.generate_video(effect_name)
        if not video_url:
            return False

        # 2. 下载视频
        downloaded_video = self.download_video(video_url, effect_id)
        if not downloaded_video:
            return False

        # 3. 提取海报
        poster = self.extract_poster(downloaded_video, effect_id)
        if not poster:
            return False

        print(f"✅ {effect_id} 完成！")
        return True

    def process_all_effects(self, skip_existing: bool = True):
        """
        处理所有特效

        Args:
            skip_existing: 是否跳过已存在的资源
        """
        total = len(EFFECTS)
        success_count = 0
        failed_effects = []

        print(f"\n🎬 开始处理 {total} 个特效...")
        print(f"📝 测试图片: {TEST_IMAGE_URL}")
        print(f"💰 预计消费: ${total * 0.2:.2f} (720p, 5s)")
        print()

        for i, effect in enumerate(EFFECTS, 1):
            print(f"\n[{i}/{total}] 处理中...")

            try:
                success = self.process_effect(effect)
                if success:
                    success_count += 1
                else:
                    failed_effects.append(effect["name"])

                # 避免请求过快
                if i < total:
                    print(f"⏸️  等待 5 秒...")
                    time.sleep(5)

            except KeyboardInterrupt:
                print(f"\n\n⚠️  用户中断！已处理 {i-1}/{total}")
                break
            except Exception as e:
                print(f"❌ 意外错误: {str(e)}")
                failed_effects.append(effect["name"])

        # 总结报告
        print(f"\n\n{'='*60}")
        print(f"🎉 处理完成！")
        print(f"{'='*60}")
        print(f"✅ 成功: {success_count}/{total}")
        print(f"❌ 失败: {len(failed_effects)}/{total}")

        if failed_effects:
            print(f"\n失败的特效:")
            for name in failed_effects:
                print(f"  - {name}")

        print(f"\n📁 输出目录: {OUTPUT_DIR}")
        print(f"📊 生成文件数: {success_count * 2} 个")


def main():
    """主函数"""
    print("=" * 60)
    print("🎬 Pixverse V5 特效资源生成器")
    print("=" * 60)

    # 使用配置中的 API Key
    api_key = WAVESPEED_API_KEY
    if not api_key:
        print("❌ 错误: API Key 未配置")
        sys.exit(1)

    try:
        generator = WavespeedEffectsGenerator(api_key)
        generator.process_all_effects()

    except KeyboardInterrupt:
        print("\n\n⚠️  用户取消操作")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
