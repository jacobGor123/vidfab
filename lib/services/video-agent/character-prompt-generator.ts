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
 * 图片风格配置
 */
export const IMAGE_STYLES = {
  realistic: {
    name: 'Realistic',
    description: 'Photorealistic, natural lighting',
    promptSuffix: 'photorealistic, ultra realistic, high detail, natural lighting, professional photography, 8k uhd, dslr, soft lighting, high quality, film grain, Fujifilm XT3, real life, realistic textures',
    negativePromptExtra: '3d render, cgi, animated, cartoon style, disney, pixar, dreamworks, cel shaded, illustrated, drawing, painting, stylized, unrealistic proportions, big eyes, cute style, chibi, anime style'
  },
  anime: {
    name: 'Anime',
    description: 'Japanese animation style',
    promptSuffix: 'anime style, manga, japanese animation, vibrant colors, cel shaded, by Makoto Shinkai, studio ghibli style, highly detailed',
    negativePromptExtra: 'photorealistic, realistic, 3d render, cgi, live action, photograph'
  },
  fantasy: {
    name: 'Fantasy',
    description: 'Epic fantasy art style',
    promptSuffix: 'fantasy art, epic, magical, detailed, concept art, artstation, by greg rutkowski, dramatic lighting, vibrant colors',
    negativePromptExtra: 'photorealistic, modern, contemporary, minimalist, plain'
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Futuristic sci-fi aesthetic',
    promptSuffix: 'cyberpunk, neon lights, futuristic, high tech, dystopian, sci-fi, blade runner style, synthwave, glowing elements',
    negativePromptExtra: 'natural, organic, traditional, historical, medieval'
  },
  'oil-painting': {
    name: 'Oil Painting',
    description: 'Classic oil painting style',
    promptSuffix: 'oil painting, classical art, fine art, brush strokes, canvas texture, renaissance style, museum quality, detailed',
    negativePromptExtra: 'photorealistic, digital art, 3d render, photograph, smooth, sharp'
  },
  '3d-render': {
    name: '3D Render',
    description: 'Modern 3D rendered',
    promptSuffix: '3d render, octane render, unreal engine, highly detailed, smooth, sharp focus, trending on artstation, ray tracing',
    negativePromptExtra: 'hand drawn, sketchy, rough, traditional art, painting'
  },
  watercolor: {
    name: 'Watercolor',
    description: 'Soft watercolor painting',
    promptSuffix: 'watercolor painting, soft colors, artistic, flowing, delicate, pastel tones, hand painted, traditional art',
    negativePromptExtra: 'photorealistic, sharp, digital, 3d render, bold, intense'
  },
  'comic-book': {
    name: 'Comic Book',
    description: 'Comic book illustration',
    promptSuffix: 'comic book style, bold lines, vibrant colors, halftone dots, graphic novel, pop art, dynamic composition',
    negativePromptExtra: 'photorealistic, soft, blurry, watercolor, smooth gradients'
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
- **风格匹配**: 完全符合 ${styleConfig.name} 风格
- **细节丰富**: 包含足够的视觉细节（外貌、服装、特征）
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

**f) 🔥 拟人化角色的特殊处理（针对 Realistic 风格）**
如果同时满足以下条件：
- 图片风格是 "${styleConfig.name}"（Realistic）
- 角色是动物 + 穿衣服/拟人化特征
则**必须**在 prompt 中添加超强写实约束：
- 在开头添加："realistic photograph of"
- 在结尾添加："real photo, not illustration, not cartoon, not 3d render, not animated, not drawn, documentary photography style"
- 例如："realistic photograph of a cat wearing orange sweater, real photo, not illustration, not cartoon, photorealistic"

**g) 🔥 小型动物的特殊处理（针对 Realistic 风格）**
如果同时满足以下条件：
- 图片风格是 "${styleConfig.name}"（Realistic）
- 核心特征包含 "small" 或 "tiny" 或 "little" 或 "baby"
- 是动物角色（cat, dog, lamb, rabbit, bird 等）
则**必须**在 prompt 和 negative prompt 中添加超强写实约束：
- Prompt 开头添加："realistic photograph of"
- Prompt 结尾添加："real photo, not illustration, not cartoon, not animated, not drawn, wildlife photography style, national geographic style"
- 例如："realistic photograph of a small white lamb, real photo, not illustration, not cartoon, wildlife photography style"

**h) 风格关键词**
- 必须添加: "${styleConfig.promptSuffix}"
- 这些关键词确保风格一致性

**i) 一致性强化**
- 添加: "consistent character design, character reference sheet, turnaround"
- 确保 AI 生成一致的外观

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

**🔥 如果核心特征包含 "small" 或 "tiny" 或 "little" 或 "baby"（针对 Realistic 风格的动物）**，必须额外排除:
- "cute style, adorable, kawaii, chibi, cartoon, illustrated, animated, stylized, unrealistic proportions, big eyes, simplified features, cel shaded"
- 这确保小型动物也生成写实照片，而不是卡通/插画风格

**示例**:
- 核心特征: "tall, majestic, adult tiger, fierce expression"
- Negative Prompt 应包含: "..., baby, cub, young, small, tiny, cute, adorable, gentle, ..."
- 核心特征: "small white lamb"（Realistic 风格）
- Negative Prompt 应包含: "..., cute style, adorable, kawaii, chibi, cartoon, illustrated, animated, stylized, unrealistic proportions, big eyes, ..."

### 4. 完整示例

**示例 1: 成年老虎（场景：playful, 风格：Realistic）**
- 核心特征: "tall, majestic, adult tiger, fierce expression, muscular build"
- 场景参考: "playful scene in the forest", 情绪: "Happy"
- **Prompt**: "A tall, majestic adult tiger with fierce expression and muscular build, standing in a playful pose in the forest, detailed fur texture, photorealistic, ultra realistic, high detail, natural lighting, real life, realistic textures, consistent character design, character reference sheet"
- **Negative Prompt**: "low quality, blurry, 3d render, cgi, animated, cartoon style, disney, pixar, stylized, unrealistic proportions, big eyes, cute style, baby, cub, young tiger, small, tiny, cute, adorable, gentle, watermark"

**示例 4: 拟人化橙猫（场景：sitting on chair, 风格：Realistic）**
- 核心特征: "large, fluffy orange tabby cat, wearing orange sweater"
- 场景参考: "sitting on a wooden chair", 情绪: "Calm"
- **Prompt**: "realistic photograph of a large, fluffy orange tabby cat wearing an orange knit sweater, sitting on a wooden chair, natural lighting, real photo, not illustration, not cartoon, not 3d render, not animated, not drawn, documentary photography style, photorealistic, ultra realistic, high detail, real life, realistic textures"
- **Negative Prompt**: "low quality, blurry, 3d render, cgi, animated, cartoon style, disney, pixar, dreamworks, cel shaded, illustrated, drawing, painting, digital art, stylized, unrealistic proportions, big eyes, cute style, chibi, anime style, anthropomorphic art, furry art, watermark"

**示例 5: 小白羊（场景：grass field, 风格：Realistic）**
- 核心特征: "small white lamb"
- 场景参考: "standing in a grass field with flowers", 情绪: "Peaceful"
- **Prompt**: "realistic photograph of a small white lamb with fluffy wool, standing in a grass field with flowers, natural lighting, real photo, not illustration, not cartoon, not animated, not drawn, wildlife photography style, national geographic style, photorealistic, ultra realistic, high detail, real life, realistic textures"
- **Negative Prompt**: "low quality, blurry, 3d render, cgi, animated, cartoon style, disney, pixar, dreamworks, cel shaded, illustrated, drawing, painting, digital art, stylized, unrealistic proportions, big eyes, cute style, adorable, kawaii, chibi, anime style, simplified features, watermark"
- **🔥 关键**: 即使是"小"动物，也必须生成写实照片，通过 "realistic photograph", "wildlife photography", "national geographic style" 等关键词强制写实风格，并在 negative prompt 中排除 "cute style, adorable, kawaii, chibi" 等卡通元素

**示例 2: 年轻巫师（场景：battle）**
- 核心特征: "young male wizard in his 20s, short messy brown hair, bright blue eyes"
- 场景参考: "intense battle scene", 情绪: "Determined"
- **Prompt**: "A young male wizard in his 20s with short messy brown hair and bright blue eyes, wearing a dark blue robe with silver star patterns, holding a wooden staff with a crystal top, determined expression in battle stance, photorealistic, high detail, natural lighting, consistent character design, character reference sheet"
- **Negative Prompt**: "low quality, blurry, old person, elderly, aged, child, baby, female, inconsistent, multiple characters, cartoon, watermark"

**示例 3: 强壮战士（场景：peaceful garden）**
- 核心特征: "muscular, battle-hardened warrior, scars on face, intimidating presence"
- 场景参考: "peaceful garden with flowers", 情绪: "Calm"
- **Prompt**: "A muscular, battle-hardened warrior with scars on face and intimidating presence, standing calmly in a peaceful garden with flowers, wearing worn armor, photorealistic, high detail, natural lighting, consistent character design, character reference sheet"
- **Negative Prompt**: "low quality, blurry, skinny, thin, weak, gentle, cute, young, child, baby, friendly, smiling, cartoon, watermark"

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
 * 🔥 强制后处理：确保 realistic 风格的规则被严格执行
 * Gemini 不一定会遵守提示词中的规则，所以需要在代码层面强制执行
 */
function postProcessCharacterPrompts(
  prompts: CharacterPrompt[],
  imageStyle: ImageStyle
): CharacterPrompt[] {
  if (imageStyle !== 'realistic') {
    return prompts  // 只处理 realistic 风格
  }

  const styleConfig = IMAGE_STYLES['realistic']

  return prompts.map(cp => {
    const characterName = cp.characterName.toLowerCase()
    let prompt = cp.prompt
    let negativePrompt = cp.negativePrompt

    // 检测关键词
    const isSmall = /\b(small|tiny|little|baby|cub|juvenile|toddler)\b/i.test(prompt)
    const isAnimal = /\b(cat|cats|dog|dogs|puppy|puppies|kitten|kittens|lamb|lambs|sheep|rabbit|rabbits|bunny|bunnies|bird|birds|fox|foxes|tiger|tigers|lion|lions|bear|bears|wolf|wolves|deer|mouse|mice|hamster|hamsters|squirrel|squirrels|raccoon|raccoons|hedgehog|hedgehogs|otter|otters|seal|seals|penguin|penguins|owl|owls|eagle|eagles|hawk|hawks|parrot|parrots|duck|ducks|chicken|chickens|pig|pigs|cow|cows|calf|calves|horse|horses|foal|foals|goat|goats|donkey|donkeys|zebra|zebras|giraffe|giraffes|elephant|elephants|rhino|rhinos|hippo|hippos|monkey|monkeys|ape|apes|gorilla|gorillas|panda|pandas|koala|koalas|kangaroo|kangaroos|dolphin|dolphins|whale|whales|shark|sharks|fish|fishes|turtle|turtles|frog|frogs|lizard|lizards|snake|snakes|crocodile|crocodiles|alligator|alligators|dragon|dragons|chihuahua|chihuahuas|poodle|poodles|bulldog|bulldogs|beagle|beagles|husky|huskies|labrador|labradors|retriever|retrievers|terrier|terriers|pug|pugs|corgi|corgis|dachshund|dachshunds|spaniel|spaniels|shepherd|shepherds)\b/i.test(prompt)
    const isAnthropomorphic = isAnimal && /\b(wearing|dressed|clothes|shirt|sweater|jacket|coat|hat|scarf|pants|shoes|boots|glasses|necklace|bracelet|ring)\b/i.test(prompt)

    console.log('[Post-Process] Character:', {
      characterName,
      isSmall,
      isAnimal,
      isAnthropomorphic,
      originalPromptPreview: prompt.substring(0, 100)
    })

    // 🔥 规则 1: 所有动物（realistic 风格下） → 强制写实
    // 不管是大是小、是否拟人化，所有动物都应该是真实照片
    if (isAnimal) {
      // 强制添加前缀（如果没有）
      if (!/^realistic photograph of/i.test(prompt)) {
        prompt = 'realistic photograph of ' + prompt
      }

      // 强制添加后缀（如果没有）
      const requiredSuffixes = [
        'real photo',
        'not illustration',
        'not cartoon',
        'not 3d render',
        'not animated',
        'not drawn',
        'photorealistic'
      ]

      let missingSuffixes = requiredSuffixes.filter(suffix =>
        !prompt.toLowerCase().includes(suffix.toLowerCase())
      )

      if (missingSuffixes.length > 0) {
        const additionalSuffixes = missingSuffixes.join(', ')
        if (isSmall) {
          prompt += `, ${additionalSuffixes}, wildlife photography style, national geographic style`
        } else {
          prompt += `, ${additionalSuffixes}, documentary photography style`
        }
      }

      // 强制增强 negative prompt
      const additionalNegatives = [
        'cute style',
        'adorable',
        'kawaii',
        'chibi',
        'cartoon',
        'illustrated',
        'animated',
        'stylized',
        'unrealistic proportions',
        'big eyes',
        'simplified features',
        'cel shaded',
        'disney',
        'pixar',
        'dreamworks'
      ]

      const missingNegatives = additionalNegatives.filter(neg =>
        !negativePrompt.toLowerCase().includes(neg.toLowerCase())
      )

      if (missingNegatives.length > 0) {
        negativePrompt += ', ' + missingNegatives.join(', ')
      }

      console.log('[Post-Process] ✅ Enforced realistic style:', {
        characterName,
        promptPrefix: prompt.substring(0, 100),
        negativePromptAdded: missingNegatives.join(', ')
      })
    }

    // 🔥 规则 2: 所有 realistic 角色 → 确保有 style-specific negative prompt
    if (styleConfig.negativePromptExtra) {
      const extraNegatives = styleConfig.negativePromptExtra.split(',').map(s => s.trim())
      const missingExtraNegatives = extraNegatives.filter(neg =>
        !negativePrompt.toLowerCase().includes(neg.toLowerCase())
      )

      if (missingExtraNegatives.length > 0) {
        negativePrompt += ', ' + missingExtraNegatives.join(', ')
      }
    }

    return {
      characterName: cp.characterName,
      prompt,
      negativePrompt
    }
  })
}
