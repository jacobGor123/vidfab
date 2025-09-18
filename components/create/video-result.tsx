"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Download, 
  Share2, 
  Trash2, 
  RotateCcw, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  Maximize
} from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoResultProps {
  videoUrl: string
  prompt: string
  settings: {
    model: string
    duration: string
    resolution: string
    aspectRatio: string
    style: string
  }
  onRegenerateClick: () => void
}

export function VideoResult({ 
  videoUrl, 
  prompt, 
  settings, 
  onRegenerateClick 
}: VideoResultProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const handleDownload = async () => {
    // TODO: Implement actual download functionality
    console.log("Downloading video...", videoUrl)
    
    // Simulate download
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = `video-${Date.now()}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    // TODO: Implement share functionality
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My AI Generated Video',
          text: `Check out this video I created: "${prompt.slice(0, 100)}..."`,
          url: videoUrl,
        })
      } catch (error) {
        console.log('Error sharing:', error)
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(videoUrl)
    // TODO: Show toast notification
    console.log("Video URL copied to clipboard")
  }

  const handleDelete = () => {
    // TODO: Implement delete functionality with confirmation dialog
    console.log("Deleting video...", videoUrl)
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    // TODO: Control actual video playback
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    // TODO: Control actual video mute
  }

  return (
    <Card className="bg-gray-950 border-gray-800">
      <CardContent className="p-0">
        {/* Video Player */}
        <div className="relative group">
          <div 
            className={cn(
              "relative bg-gray-900 flex items-center justify-center overflow-hidden",
              settings.aspectRatio === "16:9" ? "aspect-video" : 
              settings.aspectRatio === "9:16" ? "aspect-[9/16]" : 
              "aspect-square"
            )}
          >
            {/* Placeholder Video - In production, this would be an actual video element */}
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
                <p className="text-gray-400 text-sm">Generated Video Preview</p>
              </div>
            </div>

            {/* Video Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-4 left-4 right-4 flex items-center space-x-4">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </Button>
                
                <div className="flex-1 bg-white/20 rounded-full h-1">
                  <div className="bg-brand-purple-DEFAULT h-1 rounded-full w-1/3"></div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Video Info & Actions */}
        <div className="p-6 space-y-4">
          {/* Video Details */}
          <div className="space-y-2">
            <p className="text-white font-medium line-clamp-2">{prompt}</p>
            <div className="flex flex-wrap gap-2 text-sm text-gray-400">
              <span className="px-2 py-1 bg-gray-800 rounded">{settings.model}</span>
              <span className="px-2 py-1 bg-gray-800 rounded">{settings.duration}</span>
              <span className="px-2 py-1 bg-gray-800 rounded">{settings.resolution}</span>
              <span className="px-2 py-1 bg-gray-800 rounded">{settings.aspectRatio}</span>
              <span className="px-2 py-1 bg-gray-800 rounded">{settings.style}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleDownload}
              className="bg-brand-purple-DEFAULT hover:bg-brand-purple-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              className="border-brand-cyan-DEFAULT/50 text-brand-cyan-DEFAULT hover:bg-brand-cyan-DEFAULT/10"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>

            <Button
              onClick={onRegenerateClick}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>

            <Button
              onClick={handleDelete}
              variant="ghost"
              className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>

          {/* Generation Info */}
          <div className="pt-2 border-t border-gray-800">
            <div className="text-xs text-gray-500 flex justify-between">
              <span>Generated on {new Date().toLocaleDateString()}</span>
              <span>Ready for download</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}