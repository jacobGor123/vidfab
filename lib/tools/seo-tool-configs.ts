import { VIDEO_EFFECTS, type VideoEffect } from "@/lib/constants/video-effects"
import type {
  BuilderConfig,
  CreatorType,
  FAQItem,
  FeatureItem,
  HeroConfig,
  PromptExample,
} from "@/lib/tools/tool-configs"

type SeoToolKind = "effect" | "model" | "lead"

export interface ToolPageMetadataConfig {
  title: string
  description: string
  keywords: string[]
}

export interface EffectBuilderConfig {
  title: string
  subtitle: string
  uploadLabel: string
  effectLabel: string
  ctaText: string
  defaultEffectId: string
  effects: VideoEffect[]
  demoVideos: Array<{ videoUrl: string; posterUrl?: string; aspect?: "video" | "portrait" | "three-four" | "square" }>
}

interface RedirectStep {
  title: string
  description: string
}

interface RedirectPreviewVideo {
  url: string
  posterUrl?: string
  label: string
  aspect?: "video" | "portrait"
}

export interface StudioRedirectPanelConfig {
  title: string
  description: string
  ctaText: string
  ctaHref: string
  steps: RedirectStep[]
  previewVideos: RedirectPreviewVideo[]
}

export interface StoryInputExample {
  title: string
  imageUrl: string
  externalUrl: string
  storyInput: string
  beats: Array<{
    label: string
    description: string
  }>
}

interface BaseSeoToolPageConfig {
  slug: string
  kind: SeoToolKind
  modelDisplayName: string
  metadata: ToolPageMetadataConfig
  hero: HeroConfig
  featuresTitle: string
  features: FeatureItem[]
  promptShowcaseTitle: string
  promptShowcaseSubtitle: string
  promptShowcaseLabel?: string
  promptShowcaseVariant?: "standard" | "short-form" | "effect-examples" | "media-examples"
  prompts: PromptExample[]
  storyInputExamples?: StoryInputExample[]
  creatorTypesTitle: string
  creatorTypes: CreatorType[]
  faqTitle: string
  faqs: FAQItem[]
  ctaTitle: string
  ctaDescription: string
  ctaButtonText: string
  schemaServiceType: string
}

export interface EffectSeoToolPageConfig extends BaseSeoToolPageConfig {
  kind: "effect"
  effectBuilder: EffectBuilderConfig
}

export interface ModelSeoToolPageConfig extends BaseSeoToolPageConfig {
  kind: "model"
  builder: BuilderConfig
  builderTitle: string
  builderSubtitle: string
}

export interface LeadSeoToolPageConfig extends BaseSeoToolPageConfig {
  kind: "lead"
  redirectPanel: StudioRedirectPanelConfig
}

export type SeoToolPageConfig =
  | EffectSeoToolPageConfig
  | ModelSeoToolPageConfig
  | LeadSeoToolPageConfig

const STATIC = "https://static.vidfab.ai"

const imageToVideoDemos = [
  {
    videoUrl: `${STATIC}/public/video/vidfab-video-1760346921326.mp4`,
    posterUrl: `${STATIC}/public/image/vidfab-video-1760346921326.webp`,
  },
  {
    videoUrl: `${STATIC}/public/video/vidfab-video-1760350705877.mp4`,
    posterUrl: `${STATIC}/public/image/vidfab-video-1760350705877.webp`,
  },
  {
    videoUrl: `${STATIC}/discover-new/discover-new-01.mp4`,
  },
  {
    videoUrl: `${STATIC}/discover-new/discover-new-02.mp4`,
  },
]

const textVideoDemos = [
  {
    videoUrl: `${STATIC}/public/video/vidfab-video-1760351981368.mp4`,
    posterUrl: `${STATIC}/public/image/vidfab-video-1760351981368.webp`,
  },
  {
    videoUrl: `${STATIC}/public/video/vidfab-video-1760408184680.mp4`,
    posterUrl: `${STATIC}/public/image/vidfab-video-1760408184680.webp`,
  },
  { videoUrl: `${STATIC}/discover-new/discover-new-03.mp4` },
  { videoUrl: `${STATIC}/discover-new/discover-new-04.mp4` },
]

const competitorKissDemos = [
  {
    videoUrl: "https://www.media.io/videos/ai-effects/kiss-new1.mp4",
    posterUrl: "https://images.media.io/ai-effects/ai-kiss-new1.png",
    aspect: "three-four" as const,
  },
  {
    videoUrl: "https://www.media.io/videos/ai-effects/kiss-new2.mp4",
    posterUrl: "https://images.media.io/ai-effects/ai-kiss-new2.png",
    aspect: "three-four" as const,
  },
  {
    videoUrl: "https://www.media.io/videos/ai-effects/kiss-new3.mp4",
    posterUrl: "https://images.media.io/ai-effects/ai-kiss-new3.png",
    aspect: "three-four" as const,
  },
  {
    videoUrl: "https://www.media.io/videos/ai-effects/kiss-new4.mp4",
    posterUrl: "https://images.media.io/ai-effects/ai-kiss-new4.png",
    aspect: "three-four" as const,
  },
]

const competitorDanceDemos = [
  {
    videoUrl: "https://r2.justdance.cc/uploads/videos/girl-group-dance.mp4",
    posterUrl: "https://r2.justdance.cc/uploads/images/girl-group-dance.png",
  },
  {
    videoUrl: "https://r2.justdance.cc/uploads/videos/ai-generate-criss-cross.mp4",
    posterUrl: "https://r2.justdance.cc/uploads/images/ai-generate-criss-cross.png",
  },
  {
    videoUrl: "https://img.dancingai.io/template/original.mp4",
    posterUrl: "https://img.dancingai.io/template/img/original.jpg",
  },
  {
    videoUrl: "https://r2.justdance.cc/uploads/videos/doubao/ff91ca71-36b5-497c-a1b8-f96e22b4a8d6.mp4",
    posterUrl: "https://r2.justdance.cc/uploads/images/bd8518645d5af9e18b8a7311e55009eb.png",
  },
]

const competitorHugDemos = [
  {
    videoUrl: "https://www.media.io/videos/hug-me-filter/ai-hugging-video.mp4",
    posterUrl: "https://images.media.io/images2025/hug-me-filter/ai-hugging-video.png",
    aspect: "portrait" as const,
  },
  {
    videoUrl: "https://www.media.io/videos/hug-me-filter/ai-hugging-video-1.mp4",
    posterUrl: "https://images.media.io/images2025/hug-me-filter/ai-hugging-video-1.png",
    aspect: "portrait" as const,
  },
  {
    videoUrl: "https://www.media.io/videos/hug-me-filter/ai-hugging-video-2.mp4",
    posterUrl: "https://images.media.io/images2025/hug-me-filter/ai-hugging-video-2.png",
    aspect: "portrait" as const,
  },
  {
    videoUrl: "https://www.media.io/videos/modal/ai-hug.mp4",
    posterUrl: "https://images.media.io/images2025/modal/ai-hug.png",
    aspect: "portrait" as const,
  },
]

const photoBuilderDemos = [
  {
    videoUrl: "https://media.pixverse.ai/asset/media/Web-t2v.mp4",
    posterUrl: "https://media.pixverse.ai/asset/media/Web-t2v.png?x-oss-process=style/cover-webp-large",
  },
  {
    videoUrl: "https://media.pixverse.ai/asset/media/Web-template.mp4",
    posterUrl: "https://media.pixverse.ai/asset/media/Web-template.png?x-oss-process=style/cover-webp-large",
  },
  {
    videoUrl: "https://media.pixverse.ai/asset/media/Web-multishot2.mp4",
    posterUrl: "https://media.pixverse.ai/asset/media/Web-multishot.png?x-oss-process=style/cover-webp-large",
  },
  {
    videoUrl: "https://media.pixverse.ai/asset/media/Web-Agent.mp4",
    posterUrl: "https://media.pixverse.ai/asset/media/Web-Agent.png?x-oss-process=style/cover-webp-large",
  },
]

const workflowPreviewPool: RedirectPreviewVideo[] = [
  { url: `${STATIC}/discover-new/discover-new-01.mp4`, label: "Scene draft", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-02.mp4`, label: "Motion idea", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-04.mp4`, label: "Style test", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-05.mp4`, label: "Prompt draft", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-06.mp4`, label: "Scene direction", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-07.mp4`, label: "Camera prompt", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-08.mp4`, label: "Studio output", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-09.mp4`, label: "Creative brief", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-10.mp4`, label: "Motion test", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-11.mp4`, label: "Prompt result", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-12.mp4`, label: "Final pass", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-13.mp4`, label: "Vertical hook", aspect: "portrait" },
  { url: `${STATIC}/discover-new/discover-new-14.mp4`, label: "Creator cut", aspect: "portrait" },
  {
    url: `${STATIC}/public/video/vidfab-video-1760346158725.mp4`,
    posterUrl: `${STATIC}/public/image/vidfab-video-1760346158725.webp`,
    label: "Cinematic idea",
    aspect: "portrait",
  },
  {
    url: `${STATIC}/public/video/vidfab-video-1760347087819.mp4`,
    posterUrl: `${STATIC}/public/image/vidfab-video-1760347087819.webp`,
    label: "Fantasy scene",
    aspect: "portrait",
  },
  {
    url: `${STATIC}/public/video/home-step-03.mp4`,
    posterUrl: `${STATIC}/public/image/home-step-03-poster.webp`,
    label: "Effect preview",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-cinematic-nature.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-cinematic-nature.jpg",
    label: "Nature prompt",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-indie-drama.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-indie-drama.jpg",
    label: "Drama beat",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-scifi-action.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-scifi-action.jpg",
    label: "Action scene",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-fantasy-owl.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-fantasy-owl.jpg",
    label: "Fantasy shot",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-detective-diner-drama.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-detective-diner-drama.jpg",
    label: "Story beat",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-cyberpunk-tracking-shot.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-cyberpunk-tracking-shot.jpg",
    label: "Tracking shot",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-scifi-rover-desert.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-scifi-rover-desert.jpg",
    label: "Sci-fi shot",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-wizard-frozen-pedestal.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-wizard-frozen-pedestal.jpg",
    label: "Magic scene",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-detective-drama.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-detective-drama.jpg",
    label: "Detective clip",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-scifi-action.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-scifi-action.jpg",
    label: "Sci-fi action",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-fantasy-lore.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-fantasy-lore.jpg",
    label: "Lore scene",
    aspect: "portrait",
  },
  {
    url: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-indie-short-film.mp4",
    posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-indie-short-film.jpg",
    label: "Short film",
    aspect: "portrait",
  },
]

function workflowPreviewSet(offset: number, excludedUrls: string[] = []): RedirectPreviewVideo[] {
  const excluded = new Set(excludedUrls)
  const available = workflowPreviewPool.filter((item) => !excluded.has(item.url))

  if (available.length < 24) {
    throw new Error(`Workflow preview pool needs at least 24 videos after exclusions, got ${available.length}.`)
  }

  return Array.from({ length: 24 }, (_, index) => {
    const item = available[(offset + index) % available.length]
    return { ...item }
  })
}

const videoPromptExamples: PromptExample[] = [
  {
    category: "Product ad prompt",
    prompt: "A cinematic macro shot of a glass skincare bottle on wet stone, slow push-in, soft reflections, droplets sliding down the surface, premium studio lighting.",
    ...textVideoDemos[0],
  },
  {
    category: "Short-form hook",
    prompt: "A vertical 9:16 clip of a creator walking into neon city light, quick camera push, confident motion, high-energy social ad pacing.",
    ...textVideoDemos[1],
  },
  {
    category: "Story scene",
    prompt: "A tired detective enters a quiet diner at midnight, rain on the window, slow handheld camera, tense cinematic atmosphere.",
    ...textVideoDemos[2],
  },
  {
    category: "Image prompt",
    prompt: "Animate the uploaded portrait with subtle blinking, soft hair movement, warm backlight, and a slow cinematic zoom.",
    ...imageToVideoDemos[0],
  },
]

const storyboardStoryInputExamples: StoryInputExample[] = [
  {
    title: "He did ALL THIS for what?!",
    imageUrl: "https://i.ytimg.com/vi/CG6oLUL1Urk/hqdefault.jpg",
    externalUrl: "https://www.youtube.com/shorts/CG6oLUL1Urk",
    storyInput: "A dramatic animal-story short about a desperate cat who creates an absurd rescue plan to get money. Start with a chaotic workplace scene, reveal why the cat needs the money, then end with a twist that makes the whole sacrifice feel both funny and emotional.",
    beats: [
      { label: "Setup", description: "A cat is pushed into a chaotic job or rescue situation." },
      { label: "Pressure", description: "The reason for needing money is revealed." },
      { label: "Twist", description: "The sacrifice leads to an unexpected comic payoff." },
    ],
  },
  {
    title: "Karma is a Rabbit!",
    imageUrl: "https://i.ytimg.com/vi/hScRsp9vib0/hqdefault.jpg",
    externalUrl: "https://www.youtube.com/shorts/hScRsp9vib0",
    storyInput: "A short moral story where a confident cat in a rabbit costume thinks it can trick everyone and escape consequences. Build the story around a flashy entrance, a selfish decision, a chase or confrontation, and a final karma twist where the disguise becomes the reason the plan fails.",
    beats: [
      { label: "Setup", description: "A disguised character enters with too much confidence." },
      { label: "Conflict", description: "A selfish trick creates a chase or confrontation." },
      { label: "Karma", description: "The disguise becomes the reason the plan collapses." },
    ],
  },
  {
    title: "Who's the REAL Boss?",
    imageUrl: "https://i.ytimg.com/vi/oEIinFUWkRs/hqdefault.jpg",
    externalUrl: "https://www.youtube.com/shorts/oEIinFUWkRs",
    storyInput: "A miniature crime-comedy about mice breaking into a bank vault because they believe money will make them powerful. Show the heist setup, the moment the plan goes wrong, and a twist where the smallest or quietest mouse turns out to be the real boss.",
    beats: [
      { label: "Setup", description: "A tiny crew prepares an oversized bank heist." },
      { label: "Break", description: "The plan goes wrong once the vault opens." },
      { label: "Reveal", description: "The quietest character is exposed as the real boss." },
    ],
  },
  {
    title: "Two Abandoned Babies",
    imageUrl: "https://i.ytimg.com/vi/shjgI1wLFPM/hqdefault.jpg",
    externalUrl: "https://www.youtube.com/shorts/shjgI1wLFPM",
    storyInput: "An emotional split-life story about two abandoned baby animals who grow up in completely different worlds. Start with the abandonment, show one baby being taken into comfort while the other struggles, then end with a reunion or reversal that exposes the cost of that unfair beginning.",
    beats: [
      { label: "Setup", description: "Two babies are abandoned in the same moment." },
      { label: "Contrast", description: "Their lives split into comfort versus struggle." },
      { label: "Payoff", description: "A reunion or reversal exposes the unfairness." },
    ],
  },
]

const storyboardPromptExamples: PromptExample[] = storyboardStoryInputExamples.map((example) => ({
  category: example.title,
  prompt: example.storyInput,
  imageUrl: example.imageUrl,
  externalUrl: example.externalUrl,
  previewAspectRatio: "portrait",
}))

const tiktokPromptExamples: PromptExample[] = [
  {
    category: "Trend hook",
    prompt: "Vertical 9:16 clip: an unexpected transformation happens in the first second, fast reaction, bright social pacing, loop-ready ending.",
    videoUrl: `${STATIC}/discover-new/discover-new-05.mp4`,
    previewAspectRatio: "portrait",
  },
  {
    category: "Creator reaction",
    prompt: "A creator-style vertical reaction shot with a surprising visual gag, quick push-in, expressive face, built for TikTok replay value.",
    videoUrl: `${STATIC}/discover-new/discover-new-06.mp4`,
    previewAspectRatio: "portrait",
  },
  {
    category: "Street interview",
    prompt: "Vertical street interview style clip, handheld framing, quick question moment, energetic crowd background, subtitle-friendly composition.",
    videoUrl: `${STATIC}/discover-new/discover-new-07.mp4`,
    previewAspectRatio: "portrait",
  },
  {
    category: "Visual punchline",
    prompt: "A short vertical visual punchline with an exaggerated expression, fast setup, clean comedic reveal, and a tight loop ending.",
    videoUrl: `${STATIC}/discover-new/discover-new-08.mp4`,
    previewAspectRatio: "portrait",
  },
]

const shortsPromptExamples: PromptExample[] = [
  {
    category: "Odd fact short",
    prompt: "Vertical 9:16 educational short with a strange visual metaphor, clear subject center frame, fast reveal, and room for captions.",
    videoUrl: `${STATIC}/discover-new/discover-new-09.mp4`,
    previewAspectRatio: "portrait",
  },
  {
    category: "Faceless hook",
    prompt: "A faceless vertical scene with pets reacting to a sudden change, quick camera movement, simple story beat, Shorts-friendly pacing.",
    videoUrl: `${STATIC}/discover-new/discover-new-10.mp4`,
    previewAspectRatio: "portrait",
  },
  {
    category: "Product short",
    prompt: "Vertical product-focused short with a bold reveal, high-contrast color, fast motion cue, and a clean final frame for text overlay.",
    videoUrl: `${STATIC}/discover-new/discover-new-11.mp4`,
    posterUrl: `${STATIC}/discover-new/discover-new-11.webp`,
    previewAspectRatio: "portrait",
  },
  {
    category: "Creator story",
    prompt: "A vertical creator story clip with a strong facial reaction, casual phone-shot framing, quick emotional beat, and clear ending pose.",
    videoUrl: `${STATIC}/discover-new/discover-new-12.mp4`,
    posterUrl: `${STATIC}/discover-new/discover-new-12.webp`,
    previewAspectRatio: "portrait",
  },
]

function promptExampleUrls(examples: PromptExample[]): string[] {
  return examples.flatMap((example) => (example.videoUrl ? [example.videoUrl] : []))
}

function getEffect(id: string): VideoEffect {
  const effect = VIDEO_EFFECTS.find((item) => item.id === id)
  if (!effect) throw new Error(`Missing video effect config: ${id}`)
  return effect
}

function effectExamples(
  items: Array<{ id: string; category: string; prompt: string }>
): PromptExample[] {
  return items.map((item) => {
    const effect = getEffect(item.id)
    return {
      category: item.category,
      prompt: item.prompt,
      videoUrl: effect.videoUrl,
      posterUrl: effect.posterUrl,
      previewAspectRatio: "portrait",
    }
  })
}

function effectBuilder(
  title: string,
  subtitle: string,
  effectIds: string[],
  defaultEffectId: string,
  demoEffectIds: string[] = effectIds
): EffectBuilderConfig {
  const effects = effectIds.map(getEffect)
  const demoEffects = demoEffectIds.map(getEffect)

  return {
    title,
    subtitle,
    uploadLabel: "Reference Image",
    effectLabel: "Effect Style",
    ctaText: "Generate Effect (30 credits)",
    defaultEffectId,
    effects,
    demoVideos: demoEffects.map((effect) => ({
      videoUrl: effect.videoUrl,
      posterUrl: effect.posterUrl,
    })),
  }
}

const shortVideoCreators: CreatorType[] = [
  {
    title: "Short-form creators",
    description: "Create scroll-stopping clips for TikTok, Reels, Shorts, and fast social experiments.",
  },
  {
    title: "Marketing teams",
    description: "Turn campaign ideas, product photos, and creator prompts into testable video concepts.",
  },
  {
    title: "Faceless channels",
    description: "Produce consistent visual hooks without booking shoots, actors, or editing resources.",
  },
]

const effectCreators: CreatorType[] = [
  {
    title: "Couple creators",
    description: "Animate portraits into affectionate, shareable clips while keeping the workflow simple.",
  },
  {
    title: "Social editors",
    description: "Create reusable effect videos for Reels, TikTok posts, stories, and fan edits.",
  },
  {
    title: "Personal projects",
    description: "Bring still memories to life for birthdays, anniversaries, profile videos, and keepsakes.",
  },
]

const photoToVideoBuilder: BuilderConfig = {
  textToVideoModel: "vidfab-pro",
  imageToVideoModel: "vidfab-pro",
  aspectRatios: ["16:9", "9:16", "1:1"],
  durations: [4, 6, 8],
  resolutions: ["720p", "1080p"],
  supportsAudio: true,
  supportsImageToVideo: true,
  defaultMode: "image-to-video",
  availableModes: ["image-to-video"],
  demoVideos: photoBuilderDemos,
  defaultParams: {
    aspectRatio: "9:16",
    duration: 6,
    resolution: "720p",
    audio: false,
  },
}

function leadPanel(
  title: string,
  description: string,
  ctaText: string,
  ctaHref: string,
  steps: RedirectStep[],
  previewVideos: RedirectPreviewVideo[]
): StudioRedirectPanelConfig {
  return {
    title,
    description,
    ctaText,
    ctaHref,
    steps,
    previewVideos,
  }
}

export const seoToolPages: Record<string, SeoToolPageConfig> = {
  "ai-kiss-video-generator": {
    slug: "ai-kiss-video-generator",
    kind: "effect",
    modelDisplayName: "AI Kiss Video Generator",
    metadata: {
      title: "AI Kiss Video Generator - Create AI Kissing Videos from Photos",
      description:
        "Create AI kissing videos from photos with VidFab. Upload an image, choose a kiss effect, and generate a romantic AI video online.",
      keywords: [
        "ai kissing video generator",
        "ai kiss video generator",
        "kiss ai generator",
        "ai kissing generator",
        "kissing video from photo",
      ],
    },
    hero: {
      badge: "AI photo effect",
      h1: "AI Kiss Video Generator",
      description:
        "Turn a still photo into a realistic AI kissing video. Upload your image, choose a kiss style, and generate a short romantic clip in minutes.",
      ctaText: "Create an AI Kiss Video",
      ctaHref: "#ai-kiss-video-generator-playground",
    },
    effectBuilder: {
      ...effectBuilder(
        "Create an AI kissing video from a photo",
        "Upload a portrait or couple photo, pick a kiss effect, and generate the video inside this page.",
        ["blow-kiss", "cheek-kiss", "french-kiss", "kissing-pro", "rain-kiss"],
        "kissing-pro",
        ["love-drop", "love-story", "sweet-proposal", "flower-receive"]
      ),
      demoVideos: competitorKissDemos,
    },
    featuresTitle: "Built for AI kiss videos that feel intentional",
    features: [
      {
        title: "Photo-first workflow",
        description: "Start from one clear image and let the effect handle the motion, framing, and romantic gesture.",
      },
      {
        title: "Multiple kiss styles",
        description: "Choose subtle blow-kiss, cheek-kiss, rain-kiss, or more expressive kissing effects.",
      },
      {
        title: "Short social output",
        description: "Generate compact clips that fit Reels, TikTok, Shorts, stories, and personal messages.",
      },
      {
        title: "Saved in your assets",
        description: "Completed videos are stored in My Assets so you can preview, download, and reuse them later.",
      },
    ],
    promptShowcaseTitle: "AI kiss video examples",
    promptShowcaseSubtitle: "Use these effect styles as starting points for your own photo.",
    promptShowcaseVariant: "effect-examples",
    prompts: [
      {
        category: "Couple kiss",
        prompt: "A couple photo becomes a natural close-up kissing moment with soft romantic motion.",
        videoUrl: competitorKissDemos[0].videoUrl,
        posterUrl: competitorKissDemos[0].posterUrl,
        previewAspectRatio: "three-four",
      },
      {
        category: "Romantic kiss",
        prompt: "A warm romantic kiss effect for anniversary posts, couple edits, and affectionate story videos.",
        videoUrl: competitorKissDemos[1].videoUrl,
        posterUrl: competitorKissDemos[1].posterUrl,
        previewAspectRatio: "three-four",
      },
      {
        category: "Soft kiss",
        prompt: "A portrait or couple image turns into a soft kiss clip for Reels, TikTok, and personal messages.",
        videoUrl: competitorKissDemos[2].videoUrl,
        posterUrl: competitorKissDemos[2].posterUrl,
        previewAspectRatio: "three-four",
      },
      {
        category: "Social kiss clip",
        prompt: "A short kiss effect with clean framing and a shareable vertical social video result.",
        videoUrl: competitorKissDemos[3].videoUrl,
        posterUrl: competitorKissDemos[3].posterUrl,
        previewAspectRatio: "three-four",
      },
    ],
    creatorTypesTitle: "Who uses the AI kiss video generator?",
    creatorTypes: effectCreators,
    faqTitle: "AI Kiss Video Generator FAQ",
    faqs: [
      {
        question: "How do I create an AI kissing video?",
        answer: "Upload a clear image, choose a kiss effect, and generate. VidFab submits the job to the AI video effects pipeline and saves the result in My Assets.",
      },
      {
        question: "Does the AI kiss video generator work from one photo?",
        answer: "Yes. The current effect workflow starts from one uploaded image. Use a clear portrait or couple photo for best results.",
      },
      {
        question: "Can I download the generated kiss video?",
        answer: "Yes. Once generation completes, you can preview and download the video from the result panel or My Assets.",
      },
      {
        question: "How many credits does an AI kiss video cost?",
        answer: "The kiss effect uses the standard video effects cost, currently shown in the builder before generation.",
      },
    ],
    ctaTitle: "Create your first AI kiss video",
    ctaDescription: "Upload a photo and generate a short romantic AI video with VidFab.",
    ctaButtonText: "Start the Kiss Generator",
    schemaServiceType: "AI Kiss Video Generation",
  },

  "ai-dance-video-generator": {
    slug: "ai-dance-video-generator",
    kind: "effect",
    modelDisplayName: "AI Dance Video Generator",
    metadata: {
      title: "AI Dance Video Generator - Make Dance Videos from Photos",
      description:
        "Make AI dance videos from photos with VidFab. Upload an image, choose a dance effect, and create a short dancing AI video online.",
      keywords: [
        "ai dance video generator",
        "ai dance generator from photo",
        "ai photo dance generator",
        "photo dance video generator",
      ],
    },
    hero: {
      badge: "AI dance effect",
      h1: "AI Dance Video Generator",
      description:
        "Animate a still photo into a short AI dance video. Pick a movement style, generate the clip, and share it as a vertical social post.",
      ctaText: "Make an AI Dance Video",
      ctaHref: "#ai-dance-video-generator-playground",
    },
    effectBuilder: {
      ...effectBuilder(
        "Make a dance video from a photo",
        "Upload a full-body or half-body image, choose a dance effect, and generate an AI dance clip.",
        ["shake-dance", "body-shake", "split-stance-human", "walk-forward"],
        "shake-dance",
        ["cap-walk", "fashion-stride", "star-carpet", "zoom-in-fast"]
      ),
      demoVideos: competitorDanceDemos,
    },
    featuresTitle: "A faster way to create AI dance clips",
    features: [
      {
        title: "Photo to dance motion",
        description: "Use one uploaded photo as the source and turn it into an animated dance-style clip.",
      },
      {
        title: "Social-ready movements",
        description: "Choose movement effects that work well for memes, Reels, TikTok, and short edits.",
      },
      {
        title: "No choreography setup",
        description: "Skip keyframes and motion editing. The effect controls the action for a quick result.",
      },
      {
        title: "Preview and download",
        description: "Watch the result in the page, then download or find it later in your VidFab assets.",
      },
    ],
    promptShowcaseTitle: "AI dance video examples",
    promptShowcaseSubtitle: "Choose a movement style that matches your source image.",
    promptShowcaseVariant: "media-examples",
    prompts: [
      {
        category: "Group dance",
        prompt: "A source image becomes a group-style dance clip with energetic movement and a clean social video finish.",
        videoUrl: competitorDanceDemos[0].videoUrl,
        posterUrl: competitorDanceDemos[0].posterUrl,
        previewAspectRatio: "video",
      },
      {
        category: "Criss-cross dance",
        prompt: "A still person photo turns into a fast criss-cross dance motion for playful short-form edits.",
        videoUrl: competitorDanceDemos[1].videoUrl,
        posterUrl: competitorDanceDemos[1].posterUrl,
        previewAspectRatio: "video",
      },
      {
        category: "Template dance",
        prompt: "Use a template-style dance motion to transform a static reference into a quick shareable clip.",
        videoUrl: competitorDanceDemos[2].videoUrl,
        posterUrl: competitorDanceDemos[2].posterUrl,
        previewAspectRatio: "video",
      },
      {
        category: "Solo dance",
        prompt: "Turn a single person reference into a clean solo dance clip with full-body movement.",
        videoUrl: competitorDanceDemos[3].videoUrl,
        posterUrl: competitorDanceDemos[3].posterUrl,
        previewAspectRatio: "video",
      },
    ],
    creatorTypesTitle: "Who is this dance generator for?",
    creatorTypes: shortVideoCreators,
    faqTitle: "AI Dance Video Generator FAQ",
    faqs: [
      {
        question: "Can I make an AI dance video from one photo?",
        answer: "Yes. Upload a clear image and select a dance effect. Full-body images usually give the AI more context for movement.",
      },
      {
        question: "Which image works best?",
        answer: "Use a sharp photo with the person visible and not heavily cropped. Avoid tiny faces, extreme blur, or cluttered subjects.",
      },
      {
        question: "Is this a full video editor?",
        answer: "No. This page is focused on fast photo-to-dance effects. You can download the result and edit it further elsewhere if needed.",
      },
      {
        question: "Where are generated videos saved?",
        answer: "Generated videos appear in the result panel and are also saved to My Assets for later download.",
      },
    ],
    ctaTitle: "Turn a photo into an AI dance video",
    ctaDescription: "Generate a short dance clip from your image with VidFab effects.",
    ctaButtonText: "Start the Dance Generator",
    schemaServiceType: "AI Dance Video Generation",
  },

  "ai-hug-video-generator": {
    slug: "ai-hug-video-generator",
    kind: "effect",
    modelDisplayName: "AI Hug Video Generator",
    metadata: {
      title: "AI Hug Video Generator - Create Hug Videos from Photos",
      description:
        "Create AI hug videos from photos with VidFab. Upload an image, choose a hug effect, and generate a warm short video online.",
      keywords: [
        "ai hug video generator",
        "ai hug generator from photo",
        "hug video generator",
        "photo hug ai video",
      ],
    },
    hero: {
      badge: "AI hug effect",
      h1: "AI Hug Video Generator",
      description:
        "Create a warm AI hugging video from a photo. Upload a clear image, pick a hug style, and generate a short clip for memories or social posts.",
      ctaText: "Create an AI Hug Video",
      ctaHref: "#ai-hug-video-generator-playground",
    },
    effectBuilder: {
      ...effectBuilder(
        "Create an AI hug video from a photo",
        "Upload your image, choose a hugging effect, and generate a short emotional video.",
        ["hugging", "couple-hugging", "carry-me", "romantic-lift"],
        "hugging",
        ["love-story", "flower-receive", "pet-lovers", "sweet-proposal"]
      ),
      demoVideos: competitorHugDemos,
    },
    featuresTitle: "Designed for warm photo-to-video moments",
    features: [
      {
        title: "Hug-focused effects",
        description: "Use dedicated hug and couple-hugging effects instead of trying to force a generic prompt.",
      },
      {
        title: "Simple upload flow",
        description: "A single image is enough to start. The effect handles the key motion pattern.",
      },
      {
        title: "Memories and messages",
        description: "Create clips for family memories, couple edits, tribute videos, and personal messages.",
      },
      {
        title: "Built-in result panel",
        description: "Track generation, preview the result, and download when the video is ready.",
      },
    ],
    promptShowcaseTitle: "AI hug video examples",
    promptShowcaseSubtitle: "Pick a hug motion that fits the image and the emotional tone.",
    promptShowcaseVariant: "media-examples",
    prompts: [
      {
        category: "Warm hug",
        prompt: "A still portrait becomes a warm hugging moment with gentle motion.",
        videoUrl: competitorHugDemos[0].videoUrl,
        posterUrl: competitorHugDemos[0].posterUrl,
        previewAspectRatio: "portrait",
      },
      {
        category: "Family hug",
        prompt: "A photo turns into a soft emotional hug video for memory clips and personal messages.",
        videoUrl: competitorHugDemos[1].videoUrl,
        posterUrl: competitorHugDemos[1].posterUrl,
        previewAspectRatio: "portrait",
      },
      {
        category: "Couple hug",
        prompt: "A couple image turns into a close hugging video with a simple vertical social format.",
        videoUrl: competitorHugDemos[2].videoUrl,
        posterUrl: competitorHugDemos[2].posterUrl,
        previewAspectRatio: "portrait",
      },
      {
        category: "Emotional hug",
        prompt: "A gentle hug effect with warm framing and a short shareable video result.",
        videoUrl: competitorHugDemos[3].videoUrl,
        posterUrl: competitorHugDemos[3].posterUrl,
        previewAspectRatio: "portrait",
      },
    ],
    creatorTypesTitle: "Good fits for AI hug videos",
    creatorTypes: effectCreators,
    faqTitle: "AI Hug Video Generator FAQ",
    faqs: [
      {
        question: "Can VidFab generate an AI hug video from a photo?",
        answer: "Yes. Upload a clear image, choose one of the hug effects, and generate a short AI video.",
      },
      {
        question: "Do I need two separate photos?",
        answer: "No. The current workflow starts from one image. Use a photo where the subject or couple is clear for best results.",
      },
      {
        question: "How long does generation take?",
        answer: "Generation time depends on queue load, but short video effects usually complete within a few minutes.",
      },
      {
        question: "Can I use the result on social platforms?",
        answer: "Yes. Download the finished video from VidFab and post it to your preferred social platform.",
      },
    ],
    ctaTitle: "Create a warm AI hug video",
    ctaDescription: "Upload a photo and generate an emotional hug-style video effect.",
    ctaButtonText: "Start the Hug Generator",
    schemaServiceType: "AI Hug Video Generation",
  },

  "photo-to-video-ai-generator": {
    slug: "photo-to-video-ai-generator",
    kind: "model",
    modelDisplayName: "Photo to Video AI Generator",
    metadata: {
      title: "Photo to Video AI Generator - Animate Photos Online",
      description:
        "Turn photos into AI videos online with VidFab. Upload an image, describe the motion, and generate cinematic photo-to-video clips.",
      keywords: [
        "image to video ai generator",
        "photo to video ai generator",
        "picture to video ai generator",
        "animate photo ai",
        "ai photo to video generator",
      ],
    },
    hero: {
      badge: "Image to video AI",
      h1: "Photo to Video AI Generator",
      description:
        "Bring still images to life with AI motion. Upload a photo, describe camera movement or subject action, and generate a short video.",
      ctaText: "Animate a Photo",
      ctaHref: "#photo-to-video-ai-generator-playground",
    },
    builder: photoToVideoBuilder,
    builderTitle: "Animate a photo with AI",
    builderSubtitle: "Upload an image, describe the movement, and generate a video.",
    featuresTitle: "Why use VidFab for photo-to-video?",
    features: [
      {
        title: "Image-first generation",
        description: "The uploaded photo anchors the scene while your prompt controls motion, pacing, and camera direction.",
      },
      {
        title: "Flexible aspect ratios",
        description: "Create vertical, square, or widescreen videos for social posts, ads, intros, and product clips.",
      },
      {
        title: "Cinematic controls",
        description: "Describe push-ins, pans, wind, expression changes, lighting, and action instead of editing frames manually.",
      },
      {
        title: "Built for iteration",
        description: "Generate, review, and save outputs so you can test several motion directions from the same source image.",
      },
    ],
    promptShowcaseTitle: "Photo to video prompt examples",
    promptShowcaseSubtitle: "Use direct motion language to guide how your image comes alive.",
    promptShowcaseVariant: "media-examples",
    prompts: [
      {
        category: "Product motion",
        prompt: "Animate this product photo with a slow cinematic push-in, soft studio reflections, and subtle floating dust particles.",
        ...photoBuilderDemos[0],
      },
      {
        category: "Portrait animation",
        prompt: "Turn the portrait into a gentle close-up video with natural blinking, soft hair movement, and warm sunset light.",
        ...photoBuilderDemos[1],
      },
      {
        category: "Travel photo",
        prompt: "Bring the landscape photo to life with a slow drone-like pullback, moving clouds, and realistic sunlight changes.",
        ...photoBuilderDemos[2],
      },
      {
        category: "Social post",
        prompt: "Create a vertical social clip from this image with energetic camera movement and a clean reveal in the first second.",
        ...photoBuilderDemos[3],
      },
    ],
    creatorTypesTitle: "Who uses photo-to-video AI?",
    creatorTypes: shortVideoCreators,
    faqTitle: "Photo to Video AI Generator FAQ",
    faqs: [
      {
        question: "How do I turn a photo into a video?",
        answer: "Upload an image, write a prompt describing the movement, choose duration and aspect ratio, then generate the video.",
      },
      {
        question: "What should I write in the prompt?",
        answer: "Describe camera movement, subject action, lighting, and mood. Clear action words usually work better than abstract style words alone.",
      },
      {
        question: "Can I make vertical videos?",
        answer: "Yes. Choose the 9:16 aspect ratio for TikTok, Reels, YouTube Shorts, and mobile-first posts.",
      },
      {
        question: "Can I download the animated photo video?",
        answer: "Yes. Completed videos can be previewed and downloaded from the result panel or My Assets.",
      },
    ],
    ctaTitle: "Animate your first photo",
    ctaDescription: "Upload a photo and turn it into a short AI video.",
    ctaButtonText: "Start Photo to Video",
    schemaServiceType: "AI Photo to Video Generation",
  },

  "ai-video-prompt-generator": {
    slug: "ai-video-prompt-generator",
    kind: "lead",
    modelDisplayName: "AI Video Prompt Generator",
    metadata: {
      title: "AI Video Prompt Generator - Write Better AI Video Prompts",
      description:
        "Use VidFab's AI video workflow to turn rough ideas into stronger prompts for text-to-video and image-to-video generation.",
      keywords: [
        "ai video prompt generator",
        "video prompt generator",
        "ai prompt generator for video",
        "prompt generator for ai video",
      ],
    },
    hero: {
      badge: "Prompt workflow",
      h1: "AI Video Prompt Generator",
      description:
        "Turn a rough idea into a usable video prompt with scene, camera, lighting, motion, and format details inside VidFab Studio.",
      ctaText: "Open Prompt Workflow",
      ctaHref: "#ai-video-prompt-generator-playground",
    },
    redirectPanel: leadPanel(
      "Build the prompt inside VidFab Studio",
      "",
      "Open Text to Video Studio",
      "/studio/text-to-video",
      [
        { title: "Start with the idea", description: "Write the subject, setting, emotion, and the video format you need." },
        { title: "Add directing details", description: "Specify camera movement, lighting, pacing, and motion cues." },
        { title: "Generate in Studio", description: "Send the finished prompt to the model and save the result in My Assets." },
      ],
      workflowPreviewSet(0, promptExampleUrls(videoPromptExamples))
    ),
    featuresTitle: "What a strong AI video prompt should include",
    features: [
      { title: "Scene structure", description: "Define subject, setting, action, and mood so the model has a clear visual target." },
      { title: "Camera language", description: "Use push-in, tracking shot, handheld, overhead, macro, or slow pan to shape the clip." },
      { title: "Motion cues", description: "Describe what changes across time instead of only describing a static image." },
      { title: "Output format", description: "Match the prompt to vertical social clips, cinematic widescreen scenes, or square posts." },
    ],
    promptShowcaseTitle: "AI video prompt examples",
    promptShowcaseSubtitle: "",
    prompts: videoPromptExamples,
    creatorTypesTitle: "Who needs better video prompts?",
    creatorTypes: shortVideoCreators,
    faqTitle: "AI Video Prompt Generator FAQ",
    faqs: [
      {
        question: "Is this page a standalone prompt generator?",
        answer: "No. It is an SEO workflow page that routes users into VidFab Studio, where prompts are used for actual video generation.",
      },
      {
        question: "Where should I generate the video?",
        answer: "Use Text to Video Studio for prompt-only ideas, or Image to Video Studio when you want to animate a reference image.",
      },
      {
        question: "What makes an AI video prompt better?",
        answer: "Strong prompts include subject, action, camera movement, lighting, mood, duration, and aspect ratio.",
      },
      {
        question: "Can I reuse a prompt for different models?",
        answer: "Yes, but you may need to adjust duration, aspect ratio, and model-specific settings in Studio.",
      },
    ],
    ctaTitle: "Write the prompt, then generate it",
    ctaDescription: "",
    ctaButtonText: "Open Studio",
    schemaServiceType: "AI Video Prompt Workflow",
  },

  "ai-storyboard-generator": {
    slug: "ai-storyboard-generator",
    kind: "lead",
    modelDisplayName: "AI Storyboard Generator",
    metadata: {
      title: "AI Storyboard Generator - Plan Scenes for AI Video",
      description:
        "Plan AI video scenes with VidFab's storyboard workflow. Break scripts into shots, prompts, and video generation steps.",
      keywords: [
        "ai storyboard generator",
        "ai storyboarding generator",
        "storyboard ai generator",
        "video storyboard generator",
      ],
    },
    hero: {
      badge: "Storyboard workflow",
      h1: "AI Storyboard Generator",
      description:
        "Break a video idea into scenes, shots, and generation prompts. Use VidFab Studio to move from storyboard planning to final AI video clips.",
      ctaText: "Open Storyboard Studio",
      ctaHref: "#ai-storyboard-generator-playground",
    },
    redirectPanel: leadPanel(
      "Use the Studio storyboard workflow",
      "",
      "Open Story to Video Studio",
      "/studio/video-agent-beta",
      [
        { title: "Paste the story", description: "Start from a script, outline, ad concept, or scene list." },
        { title: "Split into shots", description: "Turn the story into manageable shots with visual direction." },
        { title: "Generate clips", description: "Use each storyboard shot as a prompt for the video generation stage." },
      ],
      workflowPreviewSet(4, promptExampleUrls(storyboardPromptExamples))
    ),
    featuresTitle: "What the storyboard workflow should capture",
    features: [
      { title: "Shot-by-shot planning", description: "Turn a script into clear visual beats instead of generating one vague video prompt." },
      { title: "Character continuity", description: "Keep character notes, framing, and scene context close to each shot." },
      { title: "Prompt-ready scenes", description: "Each storyboard entry can become a text-to-video or image-to-video generation prompt." },
      { title: "Faster iteration", description: "Adjust one shot without rewriting the entire creative direction." },
    ],
    promptShowcaseTitle: "Story inputs for AI storyboard generation",
    promptShowcaseSubtitle: "",
    promptShowcaseLabel: "Story input",
    prompts: storyboardPromptExamples,
    storyInputExamples: storyboardStoryInputExamples,
    creatorTypesTitle: "Who should storyboard before generating?",
    creatorTypes: shortVideoCreators,
    faqTitle: "AI Storyboard Generator FAQ",
    faqs: [
      {
        question: "Is this a standalone storyboard tool page?",
        answer: "This page is a landing and routing page. The actual storyboard workflow lives in VidFab Studio's Story to Video tool.",
      },
      {
        question: "Why not generate one long video prompt?",
        answer: "Shot-level prompts usually give more control, clearer pacing, and better consistency than one overloaded prompt.",
      },
      {
        question: "Can I use it for YouTube and TikTok scripts?",
        answer: "Yes. Break the script into short scenes, then generate clips in the format you need.",
      },
      {
        question: "Where should I start?",
        answer: "Open Story to Video Studio, paste your script or outline, and build the storyboard from there.",
      },
    ],
    ctaTitle: "Plan the shots before generating",
    ctaDescription: "",
    ctaButtonText: "Open Storyboard Studio",
    schemaServiceType: "AI Storyboard Workflow",
  },

  "ai-tiktok-video-generator": {
    slug: "ai-tiktok-video-generator",
    kind: "lead",
    modelDisplayName: "AI TikTok Video Generator",
    metadata: {
      title: "AI TikTok Video Generator - Create Vertical AI Videos",
      description:
        "Create TikTok-style AI videos with VidFab Studio. Plan hooks, prompts, vertical format, and generate short AI video clips.",
      keywords: [
        "ai tiktok video generator",
        "tiktok ai video generator",
        "ai tiktok generator",
        "vertical ai video generator",
      ],
    },
    hero: {
      badge: "TikTok video workflow",
      h1: "AI TikTok Video Generator",
      description:
        "Create vertical AI video ideas for TikTok. Use VidFab Studio to write a hook, choose 9:16 output, and generate short clips.",
      ctaText: "Open TikTok Video Workflow",
      ctaHref: "#ai-tiktok-video-generator-playground",
    },
    redirectPanel: leadPanel(
      "Generate TikTok-style clips in Studio",
      "",
      "Open Text to Video Studio",
      "/studio/text-to-video",
      [
        { title: "Write the hook", description: "Start with the first-second visual moment and the action that follows." },
        { title: "Choose 9:16", description: "Use a vertical aspect ratio for TikTok, Reels, and Shorts publishing." },
        { title: "Generate and test", description: "Create multiple short clips and compare which concept feels strongest." },
      ],
      workflowPreviewSet(8, promptExampleUrls(tiktokPromptExamples))
    ),
    featuresTitle: "What a TikTok AI video workflow needs",
    features: [
      { title: "First-second hook", description: "Plan the visual action that makes viewers stop scrolling immediately." },
      { title: "Vertical format", description: "Use 9:16 framing so the generated video fits TikTok without heavy cropping." },
      { title: "Short prompt loops", description: "Generate compact clips that can be tested, stitched, and edited quickly." },
      { title: "Reusable concepts", description: "Save outputs and iterate on winning prompt structures over time." },
    ],
    promptShowcaseTitle: "TikTok AI video prompt examples",
    promptShowcaseSubtitle: "",
    promptShowcaseVariant: "short-form",
    prompts: tiktokPromptExamples,
    creatorTypesTitle: "Who should use this TikTok workflow?",
    creatorTypes: shortVideoCreators,
    faqTitle: "AI TikTok Video Generator FAQ",
    faqs: [
      {
        question: "Does this page generate TikTok videos directly?",
        answer: "This is a routing page. Open Studio to generate videos with the text-to-video or image-to-video tool.",
      },
      {
        question: "Which aspect ratio should I use for TikTok?",
        answer: "Use 9:16 for TikTok. It keeps the composition mobile-first and reduces cropping after export.",
      },
      {
        question: "Can I use a photo as the starting point?",
        answer: "Yes. Open Image to Video Studio if you want to animate a product photo, portrait, or reference image.",
      },
      {
        question: "What makes a good TikTok AI video prompt?",
        answer: "Start with a clear hook, fast motion, vertical framing, and a simple action that resolves within a few seconds.",
      },
    ],
    ctaTitle: "Generate vertical AI clips for TikTok",
    ctaDescription: "",
    ctaButtonText: "Open TikTok Workflow",
    schemaServiceType: "AI TikTok Video Workflow",
  },

  "ai-youtube-shorts-generator": {
    slug: "ai-youtube-shorts-generator",
    kind: "lead",
    modelDisplayName: "AI YouTube Shorts Generator",
    metadata: {
      title: "AI YouTube Shorts Generator - Make Vertical AI Shorts",
      description:
        "Create YouTube Shorts-style AI videos with VidFab Studio. Plan vertical prompts, generate clips, and download short videos.",
      keywords: [
        "ai youtube shorts generator",
        "youtube shorts ai video generator",
        "ai shorts generator",
        "youtube shorts generator ai",
      ],
    },
    hero: {
      badge: "YouTube Shorts workflow",
      h1: "AI YouTube Shorts Generator",
      description:
        "Plan and generate vertical AI clips for YouTube Shorts. Use VidFab Studio for prompts, 9:16 output, and saved video assets.",
      ctaText: "Open Shorts Workflow",
      ctaHref: "#ai-youtube-shorts-generator-playground",
    },
    redirectPanel: leadPanel(
      "Create YouTube Shorts clips in Studio",
      "",
      "Open Text to Video Studio",
      "/studio/text-to-video",
      [
        { title: "Define the short", description: "Write the topic, hook, and visual action for a compact clip." },
        { title: "Generate vertical clips", description: "Use 9:16 output and keep the scene simple enough for short-form pacing." },
        { title: "Download and publish", description: "Save the finished video in My Assets and export it for your Shorts workflow." },
      ],
      workflowPreviewSet(12, promptExampleUrls(shortsPromptExamples))
    ),
    featuresTitle: "What Shorts creators need from AI video",
    features: [
      { title: "Vertical composition", description: "Generate clips in a format that fits YouTube Shorts without extra resizing." },
      { title: "Fast concept testing", description: "Try multiple hooks and visual concepts before committing to a final edit." },
      { title: "Prompt and image paths", description: "Start from a written concept or animate a reference image in Studio." },
      { title: "Asset library", description: "Keep completed clips in My Assets so you can download and organize them later." },
    ],
    promptShowcaseTitle: "YouTube Shorts AI prompt examples",
    promptShowcaseSubtitle: "",
    promptShowcaseVariant: "short-form",
    prompts: shortsPromptExamples,
    creatorTypesTitle: "Who should use this Shorts workflow?",
    creatorTypes: shortVideoCreators,
    faqTitle: "AI YouTube Shorts Generator FAQ",
    faqs: [
      {
        question: "Does this page generate Shorts directly?",
        answer: "No. This page routes users to VidFab Studio, where the actual video generation tools are available.",
      },
      {
        question: "Can VidFab make 9:16 YouTube Shorts?",
        answer: "Yes. Use a vertical aspect ratio in Studio when generating text-to-video or image-to-video clips.",
      },
      {
        question: "Can I download the generated Shorts clip?",
        answer: "Yes. Completed clips can be downloaded from the result panel or My Assets.",
      },
      {
        question: "Should I use text-to-video or image-to-video?",
        answer: "Use text-to-video for new scenes from prompts, and image-to-video when you have a product photo, portrait, or visual reference.",
      },
    ],
    ctaTitle: "Create vertical AI clips for YouTube Shorts",
    ctaDescription: "",
    ctaButtonText: "Open Shorts Workflow",
    schemaServiceType: "AI YouTube Shorts Workflow",
  },
}

export const seoToolSlugs = Object.keys(seoToolPages)

export function getSeoToolPageConfig(slug: string): SeoToolPageConfig | undefined {
  return seoToolPages[slug]
}
