/**
 * Image Status API Route
 * 根据 requestId 前缀路由到对应 provider：
 *   byteplus:<id>  → 查 DB（同步生成，已完成）
 *   wavespeed:<id> → 调 Wavespeed API 轮询状态
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin, TABLES } from "@/lib/supabase"
import { checkImageStatus } from "@/lib/services/wavespeed-image-api"

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const rawId = params.requestId
    if (!rawId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 })
    }

    // 解析 provider 前缀（兼容旧格式：无前缀视为 byteplus）
    const colonIdx = rawId.indexOf(":")
    const provider = colonIdx !== -1 ? rawId.slice(0, colonIdx) : "byteplus"
    const nativeId = colonIdx !== -1 ? rawId.slice(colonIdx + 1) : rawId

    // ─── Wavespeed：调 API 轮询真实状态 ───────────────────────────
    if (provider === "wavespeed") {
      const statusResult = await checkImageStatus(nativeId)
      const status = statusResult.data.status   // 'processing' | 'completed' | 'failed'
      const outputs = statusResult.data.outputs || []

      console.log(`📊 Wavespeed image status [${nativeId}]: ${status}, outputs=${outputs.length}`)

      // 完成时顺手入库
      if (status === "completed" && outputs.length > 0) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/image/store`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: session.user.uuid,
              userEmail: session.user.email || "unknown@vidfab.ai",
              wavespeedRequestId: rawId,
              originalUrl: outputs[0],
              settings: { generationType: "text-to-image" }
            })
          })
        } catch (e) {
          console.error("⚠️ Wavespeed image storage error:", e)
        }
      }

      return NextResponse.json({
        success: true,
        data: { id: rawId, status, outputs }
      })
    }

    // ─── BytePlus：同步生成，查 DB 即可 ──────────────────────────
    const { data: imageRecord } = await supabaseAdmin
      .from(TABLES.USER_IMAGES)
      .select("id, storage_url, status, created_at")
      .eq("wavespeed_request_id", rawId)
      .eq("user_id", session.user.uuid)
      .maybeSingle()

    if (imageRecord) {
      return NextResponse.json({
        success: true,
        data: {
          id: rawId,
          status: "completed",
          outputs: [imageRecord.storage_url],
          created_at: imageRecord.created_at
        }
      })
    }

    // 刚生成还未入库（BytePlus 同步，极少发生）
    console.log(`⚠️ BytePlus image ${rawId} not yet in database`)
    return NextResponse.json({
      success: true,
      data: { id: rawId, status: "completed", outputs: [] }
    })

  } catch (error) {
    console.error(`❌ Image status check failed for ${params.requestId}:`, error)
    return NextResponse.json(
      { error: "Status check failed", message: (error as Error).message },
      { status: 500 }
    )
  }
}
