import { GoogleGenAI, FileState } from '@google/genai'
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

export async function uploadVideoFileToGemini(
  filePath: string,
  mimeType = 'video/mp4'
): Promise<UploadedGeminiVideo> {
  const ai = getGenAI()
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

export async function deleteGeminiFile(name: string): Promise<void> {
  try {
    await getGenAI().files.delete({ name })
  } catch (error) {
    console.warn('[Gemini File Uploader] Failed to delete uploaded file:', error)
  }
}
