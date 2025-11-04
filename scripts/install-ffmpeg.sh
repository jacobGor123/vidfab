#!/bin/bash

###############################################################################
# FFmpeg 安装脚本
# 用于在 EC2 服务器上安装 ffmpeg，以支持视频压缩功能
###############################################################################

set -e

echo "========================================"
echo "FFmpeg 安装脚本"
echo "========================================"
echo ""

# 检查是否已安装
if command -v ffmpeg &> /dev/null; then
    echo "✅ ffmpeg 已安装"
    ffmpeg -version | head -1
    echo ""
    read -p "是否重新安装？(y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "跳过安装"
        exit 0
    fi
fi

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo "❌ 无法检测操作系统"
    exit 1
fi

echo "检测到操作系统: $OS $VER"
echo ""

# 根据操作系统安装
case $OS in
    ubuntu|debian)
        echo "📦 使用 apt 安装 ffmpeg..."
        sudo apt-get update
        sudo apt-get install -y ffmpeg
        ;;

    amzn|amazonlinux)
        echo "📦 使用 yum 安装 ffmpeg..."
        # Amazon Linux 2 需要启用 EPEL
        if [[ $VER == "2" ]]; then
            echo "启用 EPEL 仓库..."
            sudo amazon-linux-extras install epel -y
        fi
        sudo yum install -y ffmpeg
        ;;

    centos|rhel)
        echo "📦 使用 yum 安装 ffmpeg..."
        # CentOS/RHEL 需要 EPEL
        echo "启用 EPEL 仓库..."
        sudo yum install -y epel-release
        sudo yum install -y ffmpeg
        ;;

    fedora)
        echo "📦 使用 dnf 安装 ffmpeg..."
        sudo dnf install -y ffmpeg
        ;;

    darwin)
        echo "📦 使用 Homebrew 安装 ffmpeg..."
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew 未安装，请先安装 Homebrew"
            echo "访问 https://brew.sh 获取安装说明"
            exit 1
        fi
        brew install ffmpeg
        ;;

    *)
        echo "❌ 不支持的操作系统: $OS"
        echo ""
        echo "请手动安装 ffmpeg："
        echo "  - Ubuntu/Debian: sudo apt-get install ffmpeg"
        echo "  - CentOS/RHEL: sudo yum install epel-release && sudo yum install ffmpeg"
        echo "  - macOS: brew install ffmpeg"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "安装完成！"
echo "========================================"
echo ""

# 验证安装
if command -v ffmpeg &> /dev/null; then
    echo "✅ ffmpeg 安装成功"
    echo ""
    echo "版本信息："
    ffmpeg -version | head -3
    echo ""
    echo "🎉 现在可以使用视频压缩功能了！"
else
    echo "❌ ffmpeg 安装失败"
    exit 1
fi
