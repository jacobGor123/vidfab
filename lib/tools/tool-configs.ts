/**
 * Tool Page Configs
 * 工具落地页配置 - 以模型为主角的 Playground 落地页
 */

export interface FAQItem {
  question: string
  answer: string
}

export interface FeatureItem {
  icon?: string
  title: string
  description: string
}

export interface PromptExample {
  category: string
  prompt: string
  videoUrl: string
  posterUrl?: string
}

export interface CreatorType {
  icon?: string
  title: string
  description: string
}

export interface BuilderConfig {
  /** 文生视频 API 模型 ID */
  textToVideoModel: string
  /** 图生视频 API 模型 ID */
  imageToVideoModel: string
  aspectRatios: string[]
  durations: number[]
  resolutions: string[]
  supportsAudio: boolean
  supportsImageToVideo: boolean
  /** 合并尺寸选项（如 Sora 2 用 "1280*720"），设置后替代 aspectRatios + resolutions */
  sizes?: string[]
  /** 未生成时右侧轮播的 demo 视频，不填则用全局默认 */
  demoVideos?: Array<{ videoUrl: string; posterUrl?: string }>
  /** 用拖动条代替 pill 按钮来选择时长 */
  durationSlider?: { min: number; max: number; step?: number }
  defaultParams: {
    aspectRatio: string
    duration: number
    resolution: string
    audio: boolean
    size?: string
  }
}

export interface HeroConfig {
  badge: string
  h1: string
  description: string
  ctaText: string
  ctaHref: string
}

export interface ToolPageConfig {
  slug: string
  modelDisplayName: string
  hero: HeroConfig
  builder: BuilderConfig
  builderTitle: string
  builderSubtitle: string
  featuresTitle: string
  features: FeatureItem[]
  promptShowcaseTitle: string
  promptShowcaseSubtitle: string
  prompts: PromptExample[]
  creatorTypesTitle: string
  creatorTypes: CreatorType[]
  faqs: FAQItem[]
  ctaTitle: string
  ctaDescription: string
  ctaButtonText: string
}

// -------------------------------------------------------------------
// Veo 3 Config
// -------------------------------------------------------------------

export const veo3Config: ToolPageConfig = {
  slug: "veo3",
  modelDisplayName: "Veo 3",

  hero: {
    badge: "Powered by Google DeepMind",
    h1: "Your Direct Access to the Veo 3 Model",
    description:
      "Stop waiting in line. Experience the raw cinematic power of Google's Veo 3 right now. Enter your prompt below and watch the world's most advanced video model bring it to life.",
    ctaText: "Try for Free",
    ctaHref: "#veo3-playground",
  },

  builder: {
    textToVideoModel: "vidfab-pro",
    imageToVideoModel: "vidfab-pro",
    aspectRatios: ["16:9", "9:16"],
    durations: [4, 6, 8],
    resolutions: ["720p", "1080p"],
    supportsAudio: true,
    supportsImageToVideo: true,
    defaultParams: {
      aspectRatio: "16:9",
      duration: 8,
      resolution: "720p",
      audio: true,
    },
    demoVideos: [
      {
        videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-cinematic-nature.mp4",
        posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-cinematic-nature.jpg",
      },
      {
        videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-indie-drama.mp4",
        posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-indie-drama.jpg",
      },
      {
        videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-scifi-action.mp4",
        posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-scifi-action.jpg",
      },
      {
        videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-fantasy-owl.mp4",
        posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-fantasy-owl.jpg",
      },
    ],
  },

  builderTitle: "The Veo 3 Playground",
  builderSubtitle: "Prompt. Generate. Be Amazed.",

  featuresTitle: "What Makes Veo 3 the Ultimate Cinematic Engine?",
  features: [
    {
      icon: "💧",
      title: "Flawless Real-World Physics",
      description:
        "Natively simulates complex fluid dynamics, fabric movement, and realistic lighting. Say goodbye to distracting AI weirdness that pulls viewers out of the story.",
    },
    {
      icon: "🎥",
      title: "Native Camera Directing",
      description:
        "Use natural language to command complex camera movements — dramatic push-ins, sweeping drone shots, or fast-paced tracking pans — to match your emotional tone.",
    },
    {
      icon: "🎯",
      title: "Hyper-Accurate Prompting",
      description:
        "Stop fighting AI. Veo 3 deeply understands complex, multi-sentence prompts. Describe specific actions and intricate details, and watch it translate your exact script to the screen.",
    },
    {
      icon: "🎞️",
      title: "Extended Coherence",
      description:
        "No more scenes melting after 2 seconds. Veo 3's breakthrough architecture maintains temporal consistency and spatial logic for much longer durations.",
    },
    {
      icon: "🔊",
      title: "Native Audio Generation",
      description:
        "Veo 3 is the first model to natively generate synchronized audio — ambient sounds, dialogue, and effects — all from the same prompt, no post-production needed.",
    },
    {
      icon: "⚡",
      title: "Blazing Fast Generation",
      description:
        "Powered by the veo3-fast architecture, generate high-quality cinematic clips in minutes, not hours. Iterate rapidly and find the perfect take.",
    },
  ],

  promptShowcaseTitle: "See how Veo 3 understands every word.",
  promptShowcaseSubtitle: "What you write is exactly what it directs.",
  prompts: [
    {
      category: "Cinematic B-Roll / Nature Documentary",
      prompt:
        "A hyper-realistic cinematic tracking shot following a single, glowing golden autumn leaf as it falls gracefully. The camera smoothly glides down with the leaf, passing through a sunbeam. The leaf finally lands softly on the rippling surface of a fast-moving stream, causing hyper-detailed water splashes and reflections.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-cinematic-nature.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-cinematic-nature.jpg",
    },
    {
      category: "Indie Short Film / Drama",
      prompt:
        "A medium close-up of a tired detective. He sighs heavily, rubbing his eyes, then slowly picks up a photograph. As he looks at it, his expression transitions smoothly from sheer exhaustion to sudden, wide-eyed realization.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-indie-drama.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-indie-drama.jpg",
    },
    {
      category: "Sci-Fi Trailer / Action Sequence",
      prompt:
        "A dynamic FPV drone shot. The camera starts high, looking down, then rapidly dives down, weaving between towering advertisements. It sharply banks left, closely following a futuristic motorcycle speeding away.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-scifi-action.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-scifi-action.jpg",
    },
    {
      category: "Fantasy Lore / Product Concept",
      prompt:
        "A macro shot of a mechanical brass owl. The owl turns its head, its gears visibly turning and catching the sunlight. Suddenly, it playfully pecks at a floating glowing ember. The ember reacts to the peck, shattering into tiny sparks that briefly illuminate the dark leather.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-fantasy-owl.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/veo3/veo3-fantasy-owl.jpg",
    },
  ],

  creatorTypesTitle: "Perfect for Creators Who Need More Than Just B-Roll",
  creatorTypes: [
    {
      icon: "🎬",
      title: "Indie Filmmakers",
      description:
        "Pre-visualize entire scripts or create zero-budget trailers with Hollywood fidelity. Veo 3's physics engine and camera control give you a full virtual film crew.",
    },
    {
      icon: "📈",
      title: "Faceless Channel Owners",
      description:
        "Produce high-retention, serialized shorts (True Crime, Reddit Stories, Lore) significantly faster. Veo 3's extended coherence keeps your narrative consistent across scenes.",
    },
    {
      icon: "✍️",
      title: "Authors & Writers",
      description:
        "Turn your chapters into visual teasers to market your books on TikTok and Reels. Veo 3 understands narrative context and emotional arcs like no other model.",
    },
  ],

  faqs: [
    {
      question: "Are these videos actually generated by the Veo 3 model?",
      answer:
        "Yes. We utilize the official Veo 3 API to ensure you get the breakthrough cinematic quality, while our platform handles the job queuing, credit management, and storage.",
    },
    {
      question: "Can I use the generated videos commercially?",
      answer:
        "Yes. You own the rights to the videos you generate, making it perfect for YouTube monetization or client work. Please review our Terms of Service for full details.",
    },
    {
      question: "Do I need to be an expert in prompt engineering?",
      answer:
        "Not at all. Veo 3 deeply understands natural language. Just describe what you want to see — camera movements, emotions, actions — and the model will translate it faithfully.",
    },
    {
      question: "What is the Audio toggle for?",
      answer:
        "Veo 3 is the first model to natively generate synchronized audio. Toggle it ON to get ambient sounds, dialogue cues, and effects generated alongside your video. Toggle OFF for a silent clip.",
    },
    {
      question: "What are the credit costs?",
      answer:
        "Credits vary by duration and resolution. 720p videos cost 70–100 credits (4s–8s), while 1080p videos cost 90–130 credits. New accounts receive 200 free credits to get started.",
    },
    {
      question: "How long does generation take?",
      answer:
        "Typical generation time is 2–5 minutes depending on server load and video parameters. You can leave the page — we'll notify you when it's done and save it to My Assets.",
    },
  ],

  ctaTitle: "Ready to direct your first Veo 3 masterpiece?",
  ctaDescription: "Get 200 free credits to experience the Veo 3 model today.",
  ctaButtonText: "Start Your Story for Free",
}

// -------------------------------------------------------------------
// Sora 2 Config
// -------------------------------------------------------------------

export const sora2Config: ToolPageConfig = {
  slug: "sora2",
  modelDisplayName: "Sora 2",

  hero: {
    badge: "Powered by OpenAI",
    h1: "Your Direct Access to the Sora 2 Model",
    description:
      "Stop waiting in line. Experience the unmatched narrative power of OpenAI's Sora 2 right now. Enter your prompt below and watch the world's most advanced video model bring your story to life.",
    ctaText: "Try for Free",
    ctaHref: "#sora2-playground",
  },

  builder: {
    textToVideoModel: "sora-2",
    imageToVideoModel: "sora-2",
    aspectRatios: [],
    durations: [4, 8, 12],
    resolutions: [],
    sizes: ["1280*720", "720*1280"],
    supportsAudio: false,
    supportsImageToVideo: true,
    demoVideos: [
      { videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-detective-diner-drama.mp4", posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-detective-diner-drama.jpg" },
      { videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-cyberpunk-tracking-shot.mp4", posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-cyberpunk-tracking-shot.jpg" },
      { videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-scifi-rover-desert.mp4", posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-scifi-rover-desert.jpg" },
      { videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-wizard-frozen-pedestal.mp4", posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-wizard-frozen-pedestal.jpg" },
    ],
    defaultParams: {
      aspectRatio: "16:9",
      duration: 8,
      resolution: "720p",
      audio: false,
      size: "1280*720",
    },
  },

  builderTitle: "The Sora 2 Playground",
  builderSubtitle: "Prompt. Generate. Be Amazed.",

  featuresTitle: "What Makes Sora 2 the Ultimate Cinematic Engine?",
  features: [
    {
      title: "Absolute Spatial Consistency",
      description:
        "Sora 2 understands object permanence. If your character puts a coffee cup on the table and the camera pans away, the cup is exactly where they left it when the camera returns. Flawless continuity for real storytelling.",
    },
    {
      title: "Masterful Long Takes",
      description:
        "No more stitching 2-second clips together. Sora 2 excels at continuous, unbroken tracking shots that seamlessly traverse through multiple rooms and complex environments without losing narrative logic.",
    },
    {
      title: "Complex Character Interactions",
      description:
        "Direct genuine acting, not just static faces. Sora 2 captures nuanced micro-expressions, dynamic emotional transitions, and logical physical interactions between multiple characters and their environment.",
    },
    {
      title: "Hyper-Accurate Narrative Pacing",
      description:
        "Write your script like a director. Sora 2 deeply understands cause-and-effect within your multi-sentence prompts, perfectly timing actions, environment changes, and camera movements to match your story's beat.",
    },
  ],

  promptShowcaseTitle: "See how Sora 2 understands every word.",
  promptShowcaseSubtitle: "What you write is exactly what it directs.",
  prompts: [
    {
      category: "Indie Short Film / Drama",
      prompt:
        "A medium shot of a weary detective sitting in a diner. He picks up a steaming cup of coffee, takes a sip, and slowly looks up as a mysterious woman sits across from him. The detective's expression transitions from exhaustion to suspicion. The woman slides a folded photograph across the table, and the camera slowly pushes in on the photograph.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-detective-diner-drama.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-detective-diner-drama.jpg",
    },
    {
      category: "Cinematic Long Take / World-Building",
      prompt:
        "An unbroken, continuous tracking shot following a young boy running through a bustling cyberpunk street market. The camera follows him seamlessly as he dodges through a crowd, pushes open the glowing door of a neon-lit noodle shop, and runs all the way to the back kitchen. The environment changes logically from rainy street to steamy kitchen without any visual breaks.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-cyberpunk-tracking-shot.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-cyberpunk-tracking-shot.jpg",
    },
    {
      category: "Sci-Fi Trailer / Action Sequence",
      prompt:
        "A dynamic cinematic shot of a futuristic rover speeding across a red desert. The rover hits a large sand dune, kicking up hyper-detailed dust clouds, and catches air. As it lands, the suspension realistically compresses. The camera starts from a wide drone angle, then rapidly dives down to track closely alongside the rover's spinning wheels.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-scifi-rover-desert.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-scifi-rover-desert.jpg",
    },
    {
      category: "Fantasy Lore / Cause and Effect",
      prompt:
        "A macro shot of an ancient wizard's hand resting on a frozen stone pedestal. The wizard taps the stone with his staff, and a glowing golden crack instantly forms. The crack rapidly spreads across the stone surface, causing the surrounding ice to melt and turn into dripping water. The camera circles the pedestal as the environment completely transforms.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-wizard-frozen-pedestal.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/sora2/sora2-wizard-frozen-pedestal.jpg",
    },
  ],

  creatorTypesTitle: 'Perfect for Creators Who Need More Than Just "B-Roll"',
  creatorTypes: [
    {
      title: "Indie Filmmakers",
      description:
        "Stop stitching together disjointed 4-second clips. Use Sora 2's spatial awareness to direct continuous tracking shots that seamlessly move through multiple rooms. Pre-visualize complex blocking and create zero-budget films with absolute spatial continuity.",
    },
    {
      title: "Faceless Channel Owners",
      description:
        "Build a recognizable \"set\" for your True Crime or Reddit stories. Sora 2 remembers object permanence — meaning your haunted house or detective's office looks exactly the same from different camera angles. Create long-form, high-retention videos without the background magically changing.",
    },
    {
      title: "Authors & Writers",
      description:
        "Stop settling for AI characters just staring blankly at the camera. Sora 2 understands physical cause-and-effect. Translate your most complex chapters — an intense sword fight, a chaotic chase scene, or characters interacting with props — into dynamic, living book trailers for TikTok.",
    },
  ],

  faqs: [
    {
      question: "Are these videos actually generated by the Sora 2 model?",
      answer:
        "Yes. We utilize the official Sora 2 API to ensure you get the breakthrough cinematic quality, extended durations, and spatial consistency, while our proprietary platform handles your overall workflow.",
    },
    {
      question: "Can I use the generated stories commercially?",
      answer:
        "Yes. You own the rights to the videos you generate, making it perfect for YouTube monetization, film festivals, or client work.",
    },
    {
      question: "Do I need to be an expert in prompt engineering?",
      answer:
        "Not at all. That's the magic of our platform. You focus on the story; we translate it into the complex prompts Sora 2 needs to render the perfect scene.",
    },
  ],

  ctaTitle: "Ready to direct your first Sora 2 masterpiece?",
  ctaDescription: "Get 200 free credits to test the Sora 2 model today.",
  ctaButtonText: "Start Your Story for Free",
}

// -------------------------------------------------------------------
// Kling 3.0 Config
// -------------------------------------------------------------------

export const kling3Config: ToolPageConfig = {
  slug: "kling3",
  modelDisplayName: "Kling 3.0",

  hero: {
    badge: "Powered by Kuaishou",
    h1: "Your Direct Access to the Kling 3.0 Model",
    description:
      "The AI video model that thinks in scenes, not seconds. Describe your story in plain English. Kling 3.0 handles the rest — multi-shot sequencing, character consistency, and lip-synced audio, all in one generation.",
    ctaText: "Start Your Story for Free",
    ctaHref: "#kling3-playground",
  },

  builder: {
    textToVideoModel: "kling-3",
    imageToVideoModel: "kling-3",
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 8, 10, 15],
    resolutions: [],
    supportsAudio: true,
    supportsImageToVideo: true,
    durationSlider: { min: 5, max: 15, step: 1 },
    defaultParams: {
      aspectRatio: "16:9",
      duration: 5,
      resolution: "720p",
      audio: false,
    },
    demoVideos: [
      {
        videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-detective-drama.mp4",
        posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-detective-drama.jpg",
      },
      {
        videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-scifi-action.mp4",
        posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-scifi-action.jpg",
      },
      {
        videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-fantasy-lore.mp4",
        posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-fantasy-lore.jpg",
      },
      {
        videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-indie-short-film.mp4",
        posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-indie-short-film.jpg",
      },
    ],
  },

  builderTitle: "The Kling 3.0 Playground",
  builderSubtitle: "Prompt. Generate. Be Amazed.",

  featuresTitle: "What Makes Kling 3.0 the Ultimate Story Engine?",
  features: [
    {
      title: "Multi-Shot Story Generation",
      description:
        "Most AI video tools give you a single clip. Kling 3.0 gives you a scene. Describe your full story sequence in plain language — establishing shots, close-ups, reverse angles, dialogue moments — and the model plans the coverage, respects continuity, and executes the edit automatically.",
    },
    {
      title: "Native Audio & Lip Sync — No Post-Production Required",
      description:
        "Forget stitching audio later. Kling 3.0 generates character-specific voices, multi-character dialogue, and atmospheric sound effects all natively baked into your video. Emotional delivery, natural mouth sync, ambient immersion — all from a single prompt.",
    },
    {
      title: "Native 4K — Cinematic from the Start",
      description:
        "Every frame rendered in native 4K resolution. Realistic physics — fluid dynamics, fabric movement, dramatic lighting — simulate the real world so your audience stays immersed in the story, not distracted by AI artifacts.",
    },
    {
      title: "Rock-Solid Character Consistency",
      description:
        "Your hero stays your hero — across every shot, every scene, every episode. Kling 3.0 handles 3+ characters in the same scene without mixing them up — the consistency that serialized storytelling demands.",
    },
    {
      title: "Extended Scene Coherence",
      description:
        "No more melting faces or teleporting props after the 4-second mark. Kling 3.0's architecture maintains spatial logic and temporal consistency for up to 15 seconds per generation — long enough to tell a complete beat of your story, not just a fleeting moment.",
    },
  ],

  promptShowcaseTitle: "See Kling 3.0 Bring Every Story Genre to Life",
  promptShowcaseSubtitle: "What you write is exactly what it directs.",
  prompts: [
    {
      category: "Detective Drama",
      prompt:
        "Slow push-in from wide to medium close-up on a detective sitting alone under a single flickering bulb. He slides a crime scene photo across the table, stares at it — his jaw tightens. Hard cut to a memory flash: a rainy alley, a silhouette running. Cut back — he exhales sharply, stands, and knocks the photo to the floor in one swift motion. He says quietly: 'I know who did this.' Ambient hum of the ventilation. Chair scraping concrete.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-detective-drama.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-detective-drama.jpg",
    },
    {
      category: "Sci-Fi Action",
      prompt:
        "Continuous FPV shot starting 300 feet above a rain-soaked cyberpunk cityscape at night. The camera free-falls straight down, then pulls into a sharp banking turn to chase a hoverbike weaving through holographic traffic signals and steam vents. Cut to cockpit interior — pilot's hands grip the controls, face lit by flickering instrument panels. The bike clips a billboard, sparks trailing behind. 'Sector 7 is locked down. Find another way.' Distorted radio static fades into a driving synth score.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-scifi-action.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-scifi-action.jpg",
    },
    {
      category: "Fantasy Lore",
      prompt:
        "A macro tracking shot moves slowly across an ancient map laid on a stone table. Candlelight causes the ink illustrations to cast moving shadows. The camera cranes up to reveal a cloaked figure studying the map — her breath visible in the cold air. She traces a mountain range with one finger, and where she touches, the ink glows faint gold. She whispers: 'The last door opens at first frost.' Wind through stone corridors. A distant bell tolls once.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-fantasy-lore.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-fantasy-lore.jpg",
    },
    {
      category: "Indie Short Film",
      prompt:
        "Handheld close-up of two coffee cups on a café table — one untouched, going cold. Rack focus pulls back to reveal a woman sitting alone, checking the door every few seconds, her expression cycling from anticipation to quiet resignation. Cut to outside the café window — we see her from the street, the glass separating her from the world. Her phone lights up on the table. She looks at it for a long moment — doesn't pick it up. Ambient café noise slowly drops to near silence. A single piano note holds.",
      videoUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-indie-short-film.mp4",
      posterUrl: "https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/homepage-assets/kling3/kling3-indie-short-film.jpg",
    },
  ],

  creatorTypesTitle: "Built for Creators Who Tell Stories",
  creatorTypes: [
    {
      title: "Independent Filmmakers",
      description:
        "Pre-visualize full scripts, storyboard sequences, or produce zero-budget short films with Hollywood-level production fidelity. Pitch to investors. Post to festivals. All from your laptop.",
    },
    {
      title: "Faceless Story Channels",
      description:
        "Produce high-retention True Crime, Reddit Stories, and Lore series significantly faster. Kling 3.0's multi-shot generation means less editing, more publishing, more revenue.",
    },
    {
      title: "Authors & Screenwriters",
      description:
        "Turn your chapters into cinematic teasers. Drive book sales and script attention on TikTok, YouTube Shorts, and Reels — with visuals that actually match your narrative voice.",
    },
  ],

  faqs: [
    {
      question: "Are these videos actually generated by Kling 3.0?",
      answer:
        "Yes. We use the official Kling 3.0 API directly, so every generation delivers the model's full storytelling quality. Our platform adds the layer of story continuity management on top.",
    },
    {
      question: "Can I use my generated stories commercially?",
      answer:
        "Absolutely. You own the rights to every video you create — perfect for YouTube monetization, client deliverables, or selling story content.",
    },
    {
      question: "Do I need to know how to write AI prompts?",
      answer:
        "Not at all. That's exactly what we built this for. You write your story the way you think about it — in plain English. We handle translating it into the precise multi-shot directions Kling 3.0 needs to nail the scene.",
    },
    {
      question: "How is this different from other AI video tools?",
      answer:
        "Most tools generate isolated clips. Kling 3.0 on our platform generates scenes with narrative logic — multi-shot sequencing, character consistency, and lip-synced dialogue, all in one go. It's the difference between a clip and a story.",
    },
  ],

  ctaTitle: "Ready to Direct Your First Kling 3.0 Story?",
  ctaDescription: "Get 200 free credits to test the Kling 3.0 model today.",
  ctaButtonText: "Start Your Story for Free",
}
