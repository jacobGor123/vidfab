/**
 * Video Agent - 人物 Prompt 自动生成服务
 * 使用 Gemini 3 Pro 根据脚本分析结果为每个人物生成专业的生图 prompt
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ScriptAnalysisResult } from '@/lib/types/video-agent'
import { MODEL_NAME } from './processors/script/constants'

// 初始化 Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

const GEMINI_MODEL = MODEL_NAME

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

/**
 * 构建 Prompt 生成任务
 */
function buildCharacterPromptGenerationTask(
  scriptAnalysis: ScriptAnalysisResult,
  imageStyle: ImageStyle
): string {
  const styleConfig = IMAGE_STYLES[imageStyle]
  const characters = scriptAnalysis.characters || []
  const shots = scriptAnalysis.shots || []

  // 🔥 收集每个人物在分镜中的描述
  // 关键修改：拆分人物名称和核心特征
  const characterContexts = characters.map(char => {
    // 提取人物名称和核心特征
    // 格式: "Tiger (tall, majestic, adult tiger, fierce expression)"
    const match = char.match(/^([^(]+)\s*\(([^)]+)\)$/)
    const characterName = match ? match[1].trim() : char
    const coreFeatures = match ? match[2].trim() : ''

    const appearances = shots
      .filter(shot => shot.characters?.includes(char))
      .map(shot => ({
        shotNumber: shot.shot_number,
        description: shot.description,
        action: shot.character_action,
        mood: shot.mood
      }))

    return {
      fullName: char,  // 完整名称（包含特征）
      characterName,   // 仅名称
      coreFeatures,    // 核心特征
      appearances
    }
  })

  return `# 任务: 为视频人物生成专业的生图 Prompt

你是一位资深的 AI 图像生成专家。请根据视频脚本分析结果，为每个人物生成高质量的生图 prompt。

## 视频信息

**剧情风格**: ${scriptAnalysis.story_style}
**图片风格**: ${styleConfig.name} (${styleConfig.description})
**人物列表**: ${characters.join(', ')}

## 人物信息（核心特征 + 场景参考）

${characterContexts.map(ctx => `
### ${ctx.characterName}

**🔥 核心特征（必须严格遵守，不得修改）**:
${ctx.coreFeatures || '(无特征描述，需根据场景推断)'}

**场景参考（仅用于调整姿态/表情/动作，不应改变核心外观特征）**:
${ctx.appearances.map(app => `
- **Shot ${app.shotNumber}**
  - 场景描述: ${app.description}
  - 角色动作: ${app.action}
  - 情绪氛围: ${app.mood}
`).join('\n')}

**⚠️ 重要提示**: 场景描述和情绪氛围**仅供参考**，用于生成符合场景的姿态和表情，但**绝对不能**改变"核心特征"中描述的年龄、体型、外观等基本属性。
`).join('\n')}

## Prompt 生成要求

### 1. 核心原则（极其重要！）

- **🔥 严格复刻**: 必须 100% 遵守"核心特征"中的所有描述，不得根据场景氛围、情绪、动作等因素修改人物的年龄、体型、外观等核心属性
- **场景适配**: "场景参考"仅用于调整人物的姿态、表情、动作，**绝不能**改变人物本身的外观特征
- **一致性第一**: 确保同一人物在所有分镜中保持外观一致
- **🔥 风格中性（新增规则）**: **你只需要描述角色的客观物理特征，不要添加任何风格相关的词汇！**
  - ❌ **禁止添加审美评价词**: adorable, cute, beautiful, stunning, gorgeous, charming, lovely, elegant, graceful, majestic (除非核心特征明确包含)
  - ❌ **禁止添加风格关键词**: realistic, photorealistic, anime style, 3d render, painted, illustrated, cartoon (这些会由代码自动添加)
  - ✅ **只描述客观特征**: 颜色、尺寸、形状、材质、位置等可观察的物理属性
  - 例如：
    - ❌ 错误: "adorable brown puppy" → ✅ 正确: "brown puppy"
    - ❌ 错误: "beautiful young woman" → ✅ 正确: "young woman"
    - ❌ 错误: "realistic photograph of" → ✅ 正确: (直接省略，代码会自动添加)
- **细节丰富**: 包含足够的视觉细节（外貌、服装、特征），但只描述客观可见的特征
- **英文输出**: 所有 prompt 必须是英文

### 1.1 ❌ 禁止事项（必须严格遵守）

以下行为是**绝对禁止**的：

- ❌ **禁止根据场景氛围修改年龄**:
  - 例如：看到 "playful scene" 就将 "adult tiger" 改为 "baby tiger"
  - 例如：看到 "cute atmosphere" 就将 "elderly wizard" 改为 "young wizard"

- ❌ **禁止根据情绪修改体型**:
  - 例如：看到 "Happy, Joyful" 就将 "muscular warrior" 改为 "slim, cute warrior"
  - 例如：看到 "Sad" 就将 "strong giant" 改为 "weak, skinny giant"

- ❌ **禁止根据动作修改外观**:
  - 例如：看到 "playing with butterfly" 就将 "fierce dragon" 改为 "gentle, cute dragon"
  - 例如：看到 "dancing" 就将 "heavy armor knight" 改为 "light cloth dancer"

- ❌ **禁止忽略核心特征中的任何描述**:
  - 如果核心特征写 "tall, majestic, adult"，prompt 中**必须包含**这些关键词
  - 不能用近义词替换（如不能用 "cute" 替换 "majestic"）

### 1.2 ✅ 正确示例 vs ❌ 错误示例

**示例 1: 成年老虎 vs 幼年老虎**
- 核心特征: "tall, majestic, adult tiger, fierce expression"
- 场景参考: "playful scene in the forest", 情绪: "Happy, Joyful"
- ❌ **错误**: "cute baby tiger playing happily in the forest"
- ✅ **正确**: "tall, majestic adult tiger in a playful pose in the forest, fierce expression"

**示例 2: 强壮战士 vs 可爱战士**
- 核心特征: "muscular, battle-hardened warrior, scars on face"
- 场景参考: "peaceful garden with flowers", 情绪: "Calm, Peaceful"
- ❌ **错误**: "gentle, peaceful warrior relaxing in garden"
- ✅ **正确**: "muscular, battle-hardened warrior with scars on face, standing calmly in a peaceful garden"

**示例 3: 巨大体型 vs 普通体型**
- 核心特征: "massive, towering giant, intimidating presence"
- 场景参考: "sitting down on a small chair", 情绪: "Tired"
- ❌ **错误**: "normal-sized person sitting tiredly on a chair"
- ✅ **正确**: "massive, towering giant with intimidating presence, sitting down on a small chair"

### 2. Prompt 结构（严格按以下顺序）

每个人物的 prompt 应包含以下部分（按顺序）:

**a) 🔥 核心特征（最重要！必须优先且完整地包含）**
- **直接复制**"核心特征"中的所有描述
- 确保年龄、体型、外观等关键词完整保留
- 例如：如果核心特征是 "tall, majestic, adult tiger, fierce expression"，prompt 开头必须是："A tall, majestic adult tiger with fierce expression"

**b) 主体描述（补充细节）**
- 人物类型（human, creature, robot, etc.）
- 补充核心特征未提及的细节（发型、面部特征等）

**c) 服装与配饰**
- 详细的服装描述
- 配饰和道具

**d) 外观细节**
- 皮肤/表面质感
- 眼睛颜色和表情
- 独特标识（疤痕、纹身、特殊标记）

**e) 姿态与场景适配（可选）**
- 根据"场景参考"调整姿态和表情
- 例如：如果场景是 "playful scene"，可以添加 "in a playful pose" 或 "with a playful gesture"
- ⚠️ 注意：只能调整姿态，不能改变外观

**🔥 重要：不要添加风格前缀/后缀！**
- ❌ 不要在开头添加 "realistic photograph of" 或 "anime character" 等风格前缀
- ❌ 不要在结尾添加 "${styleConfig.promptSuffix}" 等风格后缀
- ⚠️ 这些风格关键词会由代码自动添加，确保所有角色风格统一
- ✅ 你只需要描述角色的客观物理特征即可

**f) 一致性强化（可选）**
- 可以添加: "consistent character design, character reference sheet"
- 帮助 AI 生成一致的外观

### 3. Negative Prompt 要求（智能排除）

为每个人物生成 negative prompt，**根据核心特征智能添加排除项**:

**基础排除项（所有人物必须包含）**:
- 低质量: "low quality, blurry, distorted, deformed, ugly, bad anatomy"
- 不一致: "inconsistent, multiple characters, different person, character variation"
- 其他: "watermark, text, signature, out of frame"

**🔥 风格特定排除项（必须包含）**:
对于 ${styleConfig.name} 风格，必须排除: "${styleConfig.negativePromptExtra || ''}"

**🔥 智能排除项（根据核心特征动态生成）**:

如果核心特征包含 "adult" 或 "mature"，必须排除:
- "baby, infant, child, young, cub, juvenile, toddler"

如果核心特征包含 "young" 或 "child"，必须排除:
- "old, elderly, aged, senior, mature, adult"

如果核心特征包含 "tall" 或 "large" 或 "giant" 或 "massive"，必须排除:
- "short, small, tiny, miniature, petite"

如果核心特征包含 "muscular" 或 "strong" 或 "powerful"，必须排除:
- "skinny, thin, weak, slim, slender, fragile"

如果核心特征包含 "fierce" 或 "intimidating" 或 "aggressive"，必须排除:
- "cute, adorable, gentle, sweet, friendly, harmless"

如果核心特征包含 "cute" 或 "adorable"，必须排除:
- "fierce, scary, intimidating, aggressive, menacing"

${imageStyle === 'realistic' ? `
**🔥 针对 Realistic 风格的动物特殊排除项**:
对于所有动物角色，必须额外排除:
- "cute style, adorable, kawaii, chibi, cartoon, illustrated, animated, stylized, unrealistic proportions, big eyes, simplified features, cel shaded"
- 这确保动物也生成写实照片，而不是卡通/插画风格
` : ''}

**示例**:
- 核心特征: "tall, majestic, adult tiger, fierce expression"
- Negative Prompt 应包含: "..., baby, cub, young, small, tiny, cute, adorable, gentle, ..."${imageStyle === 'realistic' ? `
- 核心特征: "small white lamb"（Realistic 风格）
- Negative Prompt 应包含: "..., cute style, adorable, kawaii, chibi, cartoon, illustrated, animated, stylized, unrealistic proportions, big eyes, ..."` : ''}

### 4. 完整示例（风格中性版本）

**🔥 重要提示**: 以下示例中的 prompt **不包含风格前缀/后缀**，这些会由代码自动添加。你的输出应该遵循这个格式。

**示例 1: 成年老虎（场景：playful）**
- 核心特征: "tall, majestic, adult tiger, fierce expression, muscular build"
- 场景参考: "playful scene in the forest", 情绪: "Happy"
- **你的 Prompt 输出**: "A tall, majestic adult tiger with fierce expression and muscular build, standing in a playful pose in the forest, detailed fur texture, consistent character design"
- **说明**: ❌ 不要添加 "realistic photograph of" 或 "photorealistic" 等风格词，代码会自动添加
- **Negative Prompt**: "low quality, blurry, baby, cub, young tiger, small, tiny, inconsistent, multiple characters, watermark"

**示例 2: 拟人化橙猫（场景：sitting on chair）**
- 核心特征: "large, fluffy orange tabby cat, wearing orange sweater"
- 场景参考: "sitting on a wooden chair", 情绪: "Calm"
- **你的 Prompt 输出**: "A large, fluffy orange tabby cat wearing an orange knit sweater, sitting on a wooden chair, consistent character design"
- **说明**: ❌ 不要添加任何风格关键词（realistic/cartoon/3d/anime 等），代码会统一处理
- **Negative Prompt**: "low quality, blurry, inconsistent, multiple characters, watermark"

**示例 3: 小白羊（场景：grass field）**
- 核心特征: "small white lamb"
- 场景参考: "standing in a grass field with flowers", 情绪: "Peaceful"
- **你的 Prompt 输出**: "A small white lamb with fluffy wool, standing in a grass field with flowers, consistent character design"
- **说明**: ❌ 不要添加 "adorable" 或 "cute" 等审美评价词，也不要添加风格词
- **Negative Prompt**: "low quality, blurry, inconsistent, multiple characters, watermark"

**示例 4: 印度男子（场景：standing）**
- 核心特征: "Indian man, large build, shirtless"
- 场景参考: "standing confidently", 情绪: "Confident"
- **你的 Prompt 输出**: "An Indian man with large build, shirtless, standing confidently, consistent character design"
- **说明**: 只描述客观特征（种族、体型、服装、姿态），不添加任何风格或审美词汇
- **Negative Prompt**: "low quality, blurry, small, slim, skinny, inconsistent, multiple characters, watermark"

## 输出格式

**严格的 JSON 格式，不要包含 markdown 标记：**

{
  "characterPrompts": [
    {
      "characterName": "Prince",
      "prompt": "Detailed character prompt here...",
      "negativePrompt": "Negative prompt here..."
    }
  ]
}

**🔥 最重要的提示（必须严格遵守）:**

1. **核心特征优先**: 每个 prompt 必须以"核心特征"开头，100% 保留所有关键词
2. **禁止修改年龄/体型**: 绝对不能根据场景氛围改变人物的年龄、体型、外观
3. **场景仅调整姿态**: 场景描述只能影响姿态、表情、动作，不能影响外观
4. **智能 Negative Prompt**: 根据核心特征添加相应的排除项
5. **直接输出纯 JSON**: 不要包含 markdown 标记
6. **确保数量**: 必须为 ${characters.length} 个人物生成 prompt
7. **英文输出**: 所有内容必须是英文
8. **合理长度**: Prompt 长度: 50-150 词

**❌ 最常见的错误（务必避免）**:
- 看到 "playful" 就生成 "baby" 或 "cute" → 这是错误的！
- 看到 "Happy" 就改变人物体型或年龄 → 这是错误的！
- 忽略核心特征中的 "adult", "tall", "muscular" 等关键词 → 这是错误的！`
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

  const prompt = buildCharacterPromptGenerationTask(scriptAnalysis, imageStyle)

  try {
    // 调用 Gemini API
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const content = response.text()

    if (!content) {
      throw new Error('Empty response from Gemini 3 Pro')
    }

    console.log('[Character Prompt Generator] Received response:', {
      contentLength: content.length,
      preview: content.substring(0, 200)
    })

    // 清理响应
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '')
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '')
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.replace(/\s*```$/, '')
    }

    // 解析 JSON
    let parsedResult: { characterPrompts: CharacterPrompt[] }
    try {
      parsedResult = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('[Character Prompt Generator] JSON parse error:', parseError)
      console.error('[Character Prompt Generator] Raw content:', content)
      throw new Error('Invalid JSON response from Gemini 3 Pro')
    }

    // 验证结果
    if (!parsedResult.characterPrompts || !Array.isArray(parsedResult.characterPrompts)) {
      throw new Error('Invalid character prompts format')
    }

    console.log('[Character Prompt Generator] Generation completed:', {
      count: parsedResult.characterPrompts.length
    })

    // 🔥 强制后处理：确保 realistic 风格的规则被严格执行
    const postProcessedPrompts = postProcessCharacterPrompts(parsedResult.characterPrompts, imageStyle)

    return postProcessedPrompts

  } catch (error) {
    console.error('[Character Prompt Generator] Generation failed:', error)
    throw error
  }
}

/**
 * 🔥 强制后处理（方案 A）：统一风格处理
 *
 * 核心思路：
 * 1. 清理 Gemini 可能添加的所有审美评价词和风格关键词
 * 2. 强制添加风格前缀 + 核心描述 + 风格后缀
 * 3. 确保所有角色都经过完全相同的处理流程，实现风格统一
 */
function postProcessCharacterPrompts(
  prompts: CharacterPrompt[],
  imageStyle: ImageStyle
): CharacterPrompt[] {
  const styleConfig = IMAGE_STYLES[imageStyle]

  return prompts.map(cp => {
    const characterName = cp.characterName
    let prompt = cp.prompt
    let negativePrompt = cp.negativePrompt

    console.log('[Post-Process] Original:', {
      characterName,
      imageStyle,
      originalPrompt: prompt.substring(0, 150)
    })

    // 🔥 步骤 1: 清理所有审美评价词（这些词会影响风格倾向）
    const aestheticWords = [
      'adorable', 'cute', 'kawaii', 'charming', 'lovely', 'sweet',
      'beautiful', 'stunning', 'gorgeous', 'elegant', 'graceful',
      'majestic', 'magnificent', 'impressive', 'striking'
    ]
    aestheticWords.forEach(word => {
      // 只移除独立的词，不移除作为复合词一部分的（如 "majestic" 在核心特征中应保留）
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      prompt = prompt.replace(regex, '').trim()
    })

    // 🔥 步骤 2: 清理所有风格关键词（让代码统一添加）
    const allStyleKeywords = [
      // Realistic 相关
      'photorealistic', 'realistic photograph', 'professional photography',
      'natural lighting', 'dslr', 'film grain', 'Fujifilm', 'RAW photo',
      'real photo', 'documentary photography', 'wildlife photography',
      'national geographic', 'hyper-realistic',

      // 3D 相关
      '3d render', '3d rendered', 'octane render', 'unreal engine',
      'cgi', 'ray tracing', 'Pixar style',

      // Anime 相关
      'anime', 'anime style', 'manga', 'cel shaded', 'japanese animation',

      // 艺术相关
      'oil painting', 'watercolor', 'painted', 'painting style',
      'illustration', 'illustrated', 'drawing', 'sketch',

      // 其他
      'cartoon', 'comic', 'fantasy art', 'concept art'
    ]

    allStyleKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      prompt = prompt.replace(regex, '').trim()
    })

    // 清理多余的逗号、空格和连续标点
    prompt = prompt
      .replace(/,\s*,/g, ',')  // 双逗号 → 单逗号
      .replace(/\s+/g, ' ')    // 多空格 → 单空格
      .replace(/,\s*\./g, '.')  // ", ." → "."
      .replace(/^\s*,\s*/, '')  // 开头逗号
      .replace(/\s*,\s*$/, '')  // 结尾逗号
      .trim()

    // 🔥 步骤 3: 强制添加风格前缀 + 核心描述 + 风格后缀
    const finalPrompt = `${styleConfig.promptPrefix} ${prompt}, ${styleConfig.promptSuffix}`.trim()

    // 🔥 步骤 4: 强制添加风格特定的负面 prompt
    let finalNegativePrompt = negativePrompt

    if (styleConfig.negativePromptExtra) {
      const extraNegatives = styleConfig.negativePromptExtra.split(',').map(s => s.trim())
      const missingExtraNegatives = extraNegatives.filter(neg =>
        !finalNegativePrompt.toLowerCase().includes(neg.toLowerCase())
      )

      if (missingExtraNegatives.length > 0) {
        finalNegativePrompt += ', ' + missingExtraNegatives.join(', ')
      }
    }

    console.log('[Post-Process] ✅ Processed:', {
      characterName,
      imageStyle,
      cleanedPrompt: prompt.substring(0, 100),
      finalPromptPreview: finalPrompt.substring(0, 150),
      negativePromptLength: finalNegativePrompt.length
    })

    return {
      characterName: cp.characterName,
      prompt: finalPrompt,
      negativePrompt: finalNegativePrompt
    }
  })
}
