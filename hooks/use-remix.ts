import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

export interface RemixData {
  prompt: string
  imageUrl: string
  title?: string
}

export function useRemix() {
  const router = useRouter()

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }, [])

  const remixVideo = useCallback(async (data: RemixData) => {
    try {
      // Store remix data in sessionStorage for the Image-to-Video page
      const remixPayload = {
        prompt: data.prompt,
        imageUrl: data.imageUrl,
        title: data.title || 'Remixed Video',
        timestamp: Date.now()
      }

      sessionStorage.setItem('vidfab-remix-data', JSON.stringify(remixPayload))

      // Copy prompt to clipboard as backup
      const promptCopied = await copyToClipboard(data.prompt)

      // Navigate to Image-to-Video page
      router.push('/create?tool=image-to-video')

      // Show success toast
      toast({
        title: "Content copied for remix",
        description: `Prompt ${promptCopied ? 'and image' : ''} ready for editing. Redirecting to Image-to-Video...`,
        duration: 3000,
      })

    } catch (error) {
      console.error('Remix failed:', error)
      toast({
        title: "Remix failed",
        description: "Unable to copy content. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }, [router, copyToClipboard])

  const getRemixData = useCallback((): RemixData | null => {
    try {
      const stored = sessionStorage.getItem('vidfab-remix-data')
      if (!stored) return null

      const data = JSON.parse(stored)

      // Check if data is fresh (within 5 minutes)
      const now = Date.now()
      const age = now - (data.timestamp || 0)
      if (age > 5 * 60 * 1000) { // 5 minutes
        sessionStorage.removeItem('vidfab-remix-data')
        return null
      }

      return {
        prompt: data.prompt || '',
        imageUrl: data.imageUrl || '',
        title: data.title || ''
      }
    } catch (error) {
      console.error('Failed to get remix data:', error)
      return null
    }
  }, [])

  const clearRemixData = useCallback(() => {
    sessionStorage.removeItem('vidfab-remix-data')
  }, [])

  return {
    remixVideo,
    getRemixData,
    clearRemixData,
    copyToClipboard
  }
}