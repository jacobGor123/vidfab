/**
 * 版本检查 API - 用于确认线上环境运行的代码版本
 */
import { NextResponse } from "next/server"
import { execSync } from "child_process"

export async function GET() {
  try {
    // 获取当前 git commit
    let gitCommit = "unknown"
    let gitBranch = "unknown"
    let gitDate = "unknown"

    try {
      gitCommit = execSync("git rev-parse HEAD").toString().trim()
      gitBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim()
      gitDate = execSync("git log -1 --format=%cd").toString().trim()
    } catch (error) {
      console.log("Git command failed, possibly in Docker without .git")
    }

    // 检查关键文件的内容标记
    const fs = require('fs')
    const path = require('path')

    let hasCredentialsFix = false
    try {
      const videoGenPath = path.join(process.cwd(), 'hooks/use-video-generation.tsx')
      const videoGenContent = fs.readFileSync(videoGenPath, 'utf-8')
      hasCredentialsFix = videoGenContent.includes("credentials: 'include'")
    } catch (error) {
      console.log("Failed to read hook file")
    }

    return NextResponse.json({
      version: {
        gitCommit: gitCommit.substring(0, 8),
        gitCommitFull: gitCommit,
        gitBranch,
        gitDate,
        buildTime: process.env.BUILD_TIME || "unknown",
        nodeEnv: process.env.NODE_ENV,
      },
      fixes: {
        credentialsIncludeFix: hasCredentialsFix,
        expectedCommit: "17a79b9e", // 我们的修复提交
      },
      environment: {
        dockerEnv: !!process.env.DOCKER_ENVIRONMENT,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        nextAuthCookieSecure: process.env.NEXTAUTH_COOKIE_SECURE,
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get version info",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
