"use client"

/**
 * Video Limit Dialog Component
 * 视频数量限制提示对话框
 */

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface VideoLimitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VideoLimitDialog({ open, onOpenChange }: VideoLimitDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Video Limit Reached</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            You have reached the maximum limit of 20 videos in the preview area.
            <br />
            <br />
            To continue creating new videos, please delete some old videos by clicking the × button at the top-right corner of any video card.
            <br />
            <br />
            Note: All your videos are safely stored and can be accessed in the "My Assets" section.
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  )
}