/**
 * Delete Video API
 * Direct API endpoint for video deletion with enhanced logging
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"
import { UserVideosDB } from "@/lib/database/user-videos"
import { supabaseAdmin, TABLES } from "@/lib/supabase"

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Delete video API called')

    // Get session
    const session = await getServerSession(authConfig)

    if (!session?.user?.uuid) {
      console.error('❌ No valid session')
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get video ID from request
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      console.error('❌ No video ID provided')
      return NextResponse.json(
        { success: false, error: "Video ID is required" },
        { status: 400 }
      )
    }

    const userId = session.user.uuid
    console.log(`🔍 Deleting video: ${videoId} for user: ${userId}`)

    // First, check if video exists and belongs to user
    const { data: existingVideo, error: fetchError } = await supabaseAdmin
      .from(TABLES.USER_VIDEOS)
      .select('*')
      .eq('id', videoId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching video:', fetchError)
      return NextResponse.json(
        { success: false, error: `Error fetching video: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!existingVideo) {
      console.error('❌ Video not found or does not belong to user')
      return NextResponse.json(
        { success: false, error: "Video not found or access denied" },
        { status: 404 }
      )
    }

    console.log(`✅ Video found:`, {
      id: existingVideo.id,
      status: existingVideo.status,
      prompt: existingVideo.prompt?.substring(0, 50) + '...'
    })

    // Perform soft delete (deleted_at 用于 7 天回收站期 + cron 物理删 S3)
    const nowIso = new Date().toISOString()
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from(TABLES.USER_VIDEOS)
      .update({
        status: 'deleted',
        deleted_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', videoId)
      .eq('user_id', userId)
      .select()

    if (updateError) {
      console.error('❌ Error updating video status:', updateError)
      return NextResponse.json(
        { success: false, error: `Delete failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log(`✅ Update result:`, updateResult)

    // Verify the deletion
    const { data: verifyVideo, error: verifyError } = await supabaseAdmin
      .from(TABLES.USER_VIDEOS)
      .select('*')
      .eq('id', videoId)
      .eq('user_id', userId)
      .single()

    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError)
    } else {
      console.log(`🔍 Video after deletion:`, {
        id: verifyVideo.id,
        status: verifyVideo.status,
        updated_at: verifyVideo.updated_at
      })
    }

    return NextResponse.json({
      success: true,
      message: "Video deleted successfully",
      data: {
        videoId,
        previousStatus: existingVideo.status,
        newStatus: 'deleted',
        updateResult
      }
    })

  } catch (error) {
    console.error("❌ Delete video API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}