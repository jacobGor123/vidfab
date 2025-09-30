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
          <AlertDialogTitle className="text-white">视频数量已达上限</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            您已经创建了20个视频，这是当前的最大限制。
            <br />
            <br />
            请删除一些旧视频后再继续创建新视频。点击任意视频右上角的 × 按钮即可删除。
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  )
}