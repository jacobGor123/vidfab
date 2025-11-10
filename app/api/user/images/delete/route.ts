/**
 * Delete Image API
 * API endpoint for image deletion
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"
import { supabaseAdmin, TABLES } from "@/lib/supabase"

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Delete image API called')

    // Get session
    const session = await getServerSession(authConfig)

    if (!session?.user?.uuid) {
      console.error('❌ No valid session')
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get image ID from request
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      console.error('❌ No image ID provided')
      return NextResponse.json(
        { success: false, error: "Image ID is required" },
        { status: 400 }
      )
    }

    const userId = session.user.uuid
    console.log(`🔍 Deleting image: ${imageId} for user: ${userId}`)

    // First, check if image exists and belongs to user
    const { data: existingImage, error: fetchError } = await supabaseAdmin
      .from(TABLES.USER_IMAGES)
      .select('*')
      .eq('id', imageId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching image:', fetchError)
      return NextResponse.json(
        { success: false, error: `Error fetching image: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!existingImage) {
      console.error('❌ Image not found or does not belong to user')
      return NextResponse.json(
        { success: false, error: "Image not found or access denied" },
        { status: 404 }
      )
    }

    console.log(`✅ Image found:`, {
      id: existingImage.id,
      status: existingImage.status,
      prompt: existingImage.prompt?.substring(0, 50) + '...'
    })

    // Delete the image record (hard delete for images, unlike soft delete for videos)
    const { error: deleteError } = await supabaseAdmin
      .from(TABLES.USER_IMAGES)
      .delete()
      .eq('id', imageId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('❌ Error deleting image:', deleteError)
      return NextResponse.json(
        { success: false, error: `Delete failed: ${deleteError.message}` },
        { status: 500 }
      )
    }

    console.log(`✅ Image deleted successfully`)

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
      data: {
        imageId,
        previousStatus: existingImage.status
      }
    })

  } catch (error) {
    console.error("❌ Delete image API error:", error)
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
