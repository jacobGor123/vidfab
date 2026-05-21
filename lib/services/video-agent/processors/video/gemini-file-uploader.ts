import { GoogleGenAI, FileState } from '@google/genai'
import { stat } from 'fs/promises'
import { sleep } from '../script/constants'

let genAI: GoogleGenAI | null = null

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured')
  }

  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey })
  }

  return genAI
}

export interface UploadedGeminiVideo {
  name: string
  uri: string
  mimeType: string
}

function getErrorStatus(error: any): number | undefined {
  const status = error?.status || error?.code
  return typeof status === 'number' ? status : undefined
}

function isRetryableUploadError(error: any): boolean {
  const status = getErrorStatus(error)
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) {
    return true
  }

  const message = String(error?.message || error || '')
  return /service unavailable|temporarily unavailable|timeout|timed out|econnreset|etimedout/i.test(message)
}

async function uploadOnce(
  ai: GoogleGenAI,
  filePath: string,
  mimeType: string
): Promise<UploadedGeminiVideo> {
  const uploaded = await ai.files.upload({
    file: filePath,
    config: {
      mimeType,
      displayName: 'vidfab-reference-video'
    }
  })

  const uploadedName = uploaded.name
  const uploadedUri = uploaded.uri

  if (!uploadedName || !uploadedUri) {
    throw new Error('Gemini File API did not return a usable file URI')
  }

  let file = uploaded
  for (let attempt = 0; attempt < 30; attempt++) {
    if (file.state === FileState.ACTIVE || !file.state) {
      const fileName = file.name || uploadedName
      const fileUri = file.uri || uploadedUri

      return {
        name: fileName,
        uri: fileUri,
        mimeType: file.mimeType || mimeType
      }
    }

    if (file.state === FileState.FAILED) {
      throw new Error(file.error?.message || 'Gemini failed to process uploaded video')
    }

    await sleep(2000)
    file = await ai.files.get({ name: uploadedName })
  }

  throw new Error('Timed out waiting for Gemini to process uploaded video')
}

export async function uploadVideoFileToGemini(
  filePath: string,
  mimeType = 'video/mp4'
): Promise<UploadedGeminiVideo> {
  const ai = getGenAI()
  const fileStat = await stat(filePath)
  const maxAttempts = Math.max(1, parseInt(process.env.GEMINI_FILE_UPLOAD_MAX_ATTEMPTS || '3', 10))
  let lastError: any

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log('[Gemini File Uploader] Uploading video file:', {
        attempt,
        maxAttempts,
        mimeType,
        sizeBytes: fileStat.size,
        sizeMB: Math.round((fileStat.size / 1024 / 1024) * 10) / 10
      })

      return await uploadOnce(ai, filePath, mimeType)
    } catch (error: any) {
      lastError = error
      const status = getErrorStatus(error)
      const retryable = isRetryableUploadError(error)

      console.warn('[Gemini File Uploader] Upload attempt failed:', {
        attempt,
        maxAttempts,
        status,
        retryable,
        message: error?.message || String(error)
      })

      if (!retryable || attempt >= maxAttempts) {
        break
      }

      await sleep(Math.min(15000, 2000 * attempt * attempt))
    }
  }

  const status = getErrorStatus(lastError)
  const details = lastError?.message || String(lastError || 'unknown error')
  throw new Error(
    `Gemini File API upload failed${status ? ` (status ${status})` : ''} after ${maxAttempts} attempt(s): ${details}`
  )
}

export async function deleteGeminiFile(name: string): Promise<void> {
  try {
    await getGenAI().files.delete({ name })
  } catch (error) {
    console.warn('[Gemini File Uploader] Failed to delete uploaded file:', error)
  }
}
