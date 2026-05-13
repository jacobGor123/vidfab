/**
 * Video Agent - 人物 Prompt 生成服务
 *
 * 角色核心设定必须来自 script_analysis.characters，不再交给 LLM 改写。
 * 这里只做确定性的 prompt 派生：锁定核心外观 + 追加风格包装 + 负面词保护。
 */

import type { ScriptAnalysisResult } from '@/lib/types/video-agent'

/**
 * 图片风格配置 - 超强版本（方案 A）
 * 每个风格都有强制前缀 + 后缀 + 负面 prompt，确保风格完全统一
 */
export const IMAGE_STYLES = {
  realistic: {
    name: 'Realistic',
    description: 'Photorealistic, natural lighting',
    // 🔥 超强前缀：强制写实风格
    promptPrefix: 'Professional documentary photograph of',
    promptSuffix: 'hyper-realistic, RAW photo, DSLR, professional photography, natural lighting, real life, not illustrated, not cartoon, not 3d render, not animated, photorealistic, ultra realistic, high detail, 8k uhd, soft lighting, high quality, film grain, Fujifilm XT3, realistic textures',
    negativePromptExtra: '3d render, cgi, cartoon, anime, illustrated, painting, drawing, digital art, game art, stylized, cel shaded, comic style, animated, disney, pixar, dreamworks, adorable, cute, kawaii, chibi, unrealistic proportions, big eyes, simplified features'
  },
  anime: {
    name: 'Anime',
    description: 'Japanese animation style',
    // 🔥 超强前缀：强制动漫风格
    promptPrefix: 'Anime character,',
    promptSuffix: 'manga style, cel shaded, anime art style, Japanese animation, vibrant colors, by Makoto Shinkai, studio ghibli style, highly detailed, sharp lines, expressive eyes',
    negativePromptExtra: 'photograph, photo, real life, photorealistic, realistic, natural, documentary, film grain, DSLR, RAW, 3d render, cgi, western cartoon, disney, pixar'
  },
  fantasy: {
    name: 'Fantasy',
    description: 'Epic fantasy art style',
    // 🔥 超强前缀：强制奇幻风格
    promptPrefix: 'Epic fantasy art,',
    promptSuffix: 'magical, detailed, concept art, artstation, by greg rutkowski, dramatic lighting, vibrant colors, fantasy illustration, mystical atmosphere, high fantasy style',
    negativePromptExtra: 'photorealistic, photograph, real life, modern, contemporary, minimalist, plain, simple, boring'
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Futuristic sci-fi aesthetic',
    // 🔥 超强前缀：强制赛博朋克风格
    promptPrefix: 'Cyberpunk character,',
    promptSuffix: 'neon lights, futuristic, high tech, dystopian, sci-fi, blade runner style, synthwave, glowing elements, neon colors, cybernetic enhancements, urban future',
    negativePromptExtra: 'natural, organic, traditional, historical, medieval, fantasy, vintage, old-fashioned'
  },
  'oil-painting': {
    name: 'Oil Painting',
    description: 'Classic oil painting style',
    // 🔥 超强前缀：强制油画风格
    promptPrefix: 'Classical oil painting of',
    promptSuffix: 'fine art, brush strokes, canvas texture, renaissance style, museum quality, detailed, traditional painting technique, rich colors, artistic masterpiece',
    negativePromptExtra: 'photorealistic, photograph, digital art, 3d render, smooth, sharp, modern, contemporary'
  },
  '3d-render': {
    name: '3D Render',
    description: 'Modern 3D rendered',
    // 🔥 超强前缀：强制 3D 渲染风格
    promptPrefix: '3D rendered character,',
    promptSuffix: 'Pixar style, CGI, octane render, unreal engine, 3d model, highly detailed, smooth surfaces, sharp focus, studio lighting, ray tracing, trending on artstation, professional 3d art',
    negativePromptExtra: 'photograph, photo, real life, photorealistic, natural, documentary, film grain, DSLR, RAW, hand-drawn, sketchy, painted, illustrated, 2d art'
  },
  watercolor: {
    name: 'Watercolor',
    description: 'Soft watercolor painting',
    // 🔥 超强前缀：强制水彩风格
    promptPrefix: 'Watercolor painting of',
    promptSuffix: 'soft colors, artistic, flowing, delicate, pastel tones, hand painted, traditional art, watercolor texture, gentle brush strokes, dreamy atmosphere',
    negativePromptExtra: 'photorealistic, photograph, sharp, digital, 3d render, bold, intense, hard edges'
  },
  'comic-book': {
    name: 'Comic Book',
    description: 'Comic book illustration',
    // 🔥 超强前缀：强制漫画风格
    promptPrefix: 'Comic book character,',
    promptSuffix: 'bold lines, vibrant colors, halftone dots, graphic novel style, pop art, dynamic composition, comic book illustration, ink outlines, dramatic shading',
    negativePromptExtra: 'photorealistic, photograph, soft, blurry, watercolor, smooth gradients, realistic, natural'
  }
}

export type ImageStyle = keyof typeof IMAGE_STYLES

/**
 * 人物 Prompt 结果
 */
export interface CharacterPrompt {
  characterName: string
  prompt: string
  negativePrompt: string
}

const BASE_NEGATIVE_PROMPT = [
  'low quality',
  'blurry',
  'distorted',
  'deformed',
  'bad anatomy',
  'inconsistent',
  'multiple characters',
  'different character',
  'character variation',
  'watermark',
  'text',
  'signature',
  'out of frame'
]

export function parseCharacterSpec(character: string): {
  characterName: string
  coreDescription: string
} {
  const match = character.match(/^([^(]+)\s*\((.*)\)\s*$/)
  const characterName = (match ? match[1] : character).trim()
  const coreDescription = (match?.[2] || character).trim()

  return {
    characterName: characterName || character.trim(),
    coreDescription: coreDescription || character.trim()
  }
}

export function getDefaultCharacterPrompt(character: string): string {
  return parseCharacterSpec(character).coreDescription
}

function resolveImageStyle(imageStyle: string): ImageStyle {
  return IMAGE_STYLES[imageStyle as ImageStyle] ? imageStyle as ImageStyle : 'realistic'
}

export function getDefaultCharacterNegativePrompt(
  character: string,
  imageStyle: string = 'realistic'
): string {
  const { coreDescription } = parseCharacterSpec(character)
  return buildNegativePromptForCore(coreDescription, resolveImageStyle(imageStyle))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizePromptText(prompt: string): string {
  return prompt
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/,\s*\./g, '.')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/, '')
    .trim()
}

function removeKnownStyleDecorations(prompt: string): string {
  let cleanedPrompt = prompt

  Object.values(IMAGE_STYLES).forEach(styleConfig => {
    const prefix = styleConfig.promptPrefix.trim()
    const suffix = styleConfig.promptSuffix.trim()

    if (prefix) {
      cleanedPrompt = cleanedPrompt.replace(new RegExp(`^${escapeRegExp(prefix)}\\s*`, 'i'), '')
    }

    if (suffix) {
      cleanedPrompt = cleanedPrompt.replace(new RegExp(`,?\\s*${escapeRegExp(suffix)}\\s*$`, 'i'), '')
    }
  })

  return normalizePromptText(cleanedPrompt)
}

function appendUniqueTerms(existingPrompt: string, terms: string[]): string {
  const existingTerms = existingPrompt
    .split(',')
    .map(term => term.trim())
    .filter(Boolean)
  const lowerTerms = new Set(existingTerms.map(term => term.toLowerCase()))

  terms.forEach(term => {
    const normalizedTerm = term.trim()
    if (normalizedTerm && !lowerTerms.has(normalizedTerm.toLowerCase())) {
      existingTerms.push(normalizedTerm)
      lowerTerms.add(normalizedTerm.toLowerCase())
    }
  })

  return existingTerms.join(', ')
}

function promptContainsPositiveTerm(prompt: string, term: string): boolean {
  const normalizedPrompt = prompt.toLowerCase()
  const normalizedTerm = term.toLowerCase().trim()
  if (!normalizedTerm) return false

  const termPattern = new RegExp(`(^|[^a-z0-9])(${escapeRegExp(normalizedTerm)})(?=$|[^a-z0-9])`, 'g')
  let match: RegExpExecArray | null

  while ((match = termPattern.exec(normalizedPrompt)) !== null) {
    const termStart = match.index + match[1].length
    const prefix = normalizedPrompt.slice(Math.max(0, termStart - 16), termStart)

    if (!/\b(not|no|without)\s+$/.test(prefix) && !/\bnon[-\s]$/.test(prefix)) {
      return true
    }
  }

  return false
}

function filterNegativeTermsAgainstPrompt(prompt: string, terms: string[]): string[] {
  return terms.filter(term => !promptContainsPositiveTerm(prompt, term))
}

function buildNegativePromptForCore(coreDescription: string, imageStyle: ImageStyle): string {
  const lowerCore = coreDescription.toLowerCase()
  const negativeTerms = [...BASE_NEGATIVE_PROMPT]

  if (/\b(adult|mature)\b/.test(lowerCore)) {
    negativeTerms.push('baby', 'infant', 'child', 'cub', 'juvenile', 'toddler')
  }
  if (/\b(young|child|kid|baby|infant|cub|juvenile|toddler)\b/.test(lowerCore)) {
    negativeTerms.push('old', 'elderly', 'aged', 'senior', 'mature adult')
  }
  if (/\b(tall|large|giant|massive|huge|obese|fat|overweight|pear-shaped)\b/.test(lowerCore)) {
    negativeTerms.push('short', 'small', 'tiny', 'miniature', 'petite', 'skinny', 'thin', 'slim')
  }
  if (/\b(muscular|strong|powerful|stocky|broad)\b/.test(lowerCore)) {
    negativeTerms.push('skinny', 'thin', 'weak', 'slim', 'slender', 'fragile')
  }
  if (/\b(fierce|intimidating|aggressive|menacing|scary)\b/.test(lowerCore)) {
    negativeTerms.push('gentle', 'sweet', 'friendly', 'harmless')
  }

  const styleConfig = IMAGE_STYLES[imageStyle]
  if (styleConfig?.negativePromptExtra) {
    negativeTerms.push(
      ...filterNegativeTermsAgainstPrompt(
        coreDescription,
        styleConfig.negativePromptExtra.split(',').map(term => term.trim())
      )
    )
  }

  return appendUniqueTerms('', negativeTerms)
}

export function enforceCharacterPromptStyle(
  prompt: string,
  negativePrompt: string,
  imageStyle: string
): {
  prompt: string
  negativePrompt: string
} {
  const styleConfig = IMAGE_STYLES[imageStyle as ImageStyle]
  if (!styleConfig) {
    console.warn(`[Character Prompt] Unknown style: ${imageStyle}, using prompt as-is`)
    return { prompt, negativePrompt }
  }

  const corePrompt = removeKnownStyleDecorations(prompt)
  const finalPrompt = normalizePromptText(
    `${styleConfig.promptPrefix} ${corePrompt}, ${styleConfig.promptSuffix}`
  )
  const finalNegativePrompt = appendUniqueTerms(
    negativePrompt,
    filterNegativeTermsAgainstPrompt(
      corePrompt,
      styleConfig.negativePromptExtra.split(',').map(term => term.trim())
    )
  )

  return {
    prompt: finalPrompt,
    negativePrompt: finalNegativePrompt
  }
}

/**
 * 生成人物 Prompts
 * @param scriptAnalysis 脚本分析结果
 * @param imageStyle 图片风格
 * @returns 每个人物的生图 prompt
 */
export async function generateCharacterPrompts(
  scriptAnalysis: ScriptAnalysisResult,
  imageStyle: ImageStyle
): Promise<CharacterPrompt[]> {
  console.log('[Character Prompt Generator] Starting generation', {
    characters: scriptAnalysis.characters,
    imageStyle
  })

  const characterPrompts = (scriptAnalysis.characters || []).map(character => {
    const { coreDescription } = parseCharacterSpec(character)
    const basePrompt = normalizePromptText(
      `${coreDescription}, full-body character reference, centered composition, clear visible face and body, neutral pose, consistent character design`
    )
    const baseNegativePrompt = buildNegativePromptForCore(coreDescription, imageStyle)

    return {
      characterName: character,
      prompt: basePrompt,
      negativePrompt: baseNegativePrompt
    }
  })

  console.log('[Character Prompt Generator] Deterministic prompts generated:', {
    count: characterPrompts.length
  })

  return characterPrompts
}
