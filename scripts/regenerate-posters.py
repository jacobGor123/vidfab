#!/usr/bin/env python3
"""
重新生成所有特效的海报图片（提取视频最后一帧）

使用场景：
1. 已有视频文件，需要重新生成海报
2. 修改了海报提取逻辑（如从第一帧改为最后一帧）
"""

import os
import sys
from pathlib import Path
import cv2
from PIL import Image

# 配置
VIDEO_DIR = Path(__file__).parent.parent / "static" / "video-effects"

def extract_last_frame(video_path: Path) -> Path:
    """
    从视频中提取最后一帧并保存为 WebP

    Args:
        video_path: 视频文件路径

    Returns:
        海报图片路径
    """
    effect_id = video_path.stem.replace("_video", "")
    poster_path = video_path.parent / f"{effect_id}_poster.webp"

    try:
        print(f"🎨 提取海报: {effect_id}")

        # 使用 OpenCV 读取视频最后一帧
        cap = cv2.VideoCapture(str(video_path))

        # 获取总帧数
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"   总帧数: {total_frames}")

        # 设置到最后一帧
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

        # 获取文件大小
        size_kb = poster_path.stat().st_size / 1024
        print(f"✅ 海报已保存: {poster_path.name} ({size_kb:.1f} KB)")

        return poster_path

    except Exception as e:
        print(f"❌ 提取失败 {effect_id}: {str(e)}")
        return None


def main():
    print("=" * 60)
    print("🎨 重新生成所有特效海报（提取最后一帧）")
    print("=" * 60)
    print(f"📁 视频目录: {VIDEO_DIR}")
    print()

    # 检查目录是否存在
    if not VIDEO_DIR.exists():
        print(f"❌ 错误：目录不存在 {VIDEO_DIR}")
        sys.exit(1)

    # 获取所有视频文件
    video_files = sorted(VIDEO_DIR.glob("*_video.mp4"))
    total = len(video_files)

    if total == 0:
        print("❌ 错误：未找到任何视频文件")
        sys.exit(1)

    print(f"📹 找到 {total} 个视频文件")
    print()

    # 确认操作
    response = input(f"确认重新生成 {total} 个海报图片？[y/N] ")
    if response.lower() != 'y':
        print("已取消操作")
        sys.exit(0)

    print()

    # 处理所有视频
    success_count = 0
    failed_files = []

    for i, video_path in enumerate(video_files, 1):
        print(f"[{i}/{total}] 处理: {video_path.name}")

        result = extract_last_frame(video_path)
        if result:
            success_count += 1
        else:
            failed_files.append(video_path.name)

        print()

    # 总结
    print("=" * 60)
    print("📊 处理完成")
    print("=" * 60)
    print(f"✅ 成功: {success_count}/{total}")
    print(f"❌ 失败: {len(failed_files)}/{total}")

    if failed_files:
        print()
        print("失败的文件:")
        for name in failed_files:
            print(f"  - {name}")
    else:
        print()
        print("🎉 所有海报已成功重新生成！")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  用户取消操作")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}")
        sys.exit(1)
