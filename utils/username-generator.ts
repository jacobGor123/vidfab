/**
 * 用户名生成器 - 为视频创作者生成多样化、创意的用户名
 * Username Generator for Video Creators
 */

// 用户名风格枚举
export enum UsernameStyle {
  CREATIVE_ARTISTIC = 'creative_artistic',
  TECH_STYLE = 'tech_style',
  REAL_NAME = 'real_name',
  ABSTRACT = 'abstract',
  GAMING = 'gaming',
  MINIMALIST = 'minimalist'
}

// 用户名配置接口
export interface UsernameConfig {
  style: UsernameStyle;
  includeNumbers?: boolean;
  includeSpecialChars?: boolean;
  maxLength?: number;
  minLength?: number;
}

// 生成的用户名接口
export interface GeneratedUsername {
  username: string;
  style: UsernameStyle;
  description: string;
}

// 预定义的词汇库
const WORD_BANKS = {
  creative: [
    'Pixel', 'Neon', 'Digital', 'Cosmic', 'Electric', 'Mystic', 'Crystal', 'Shadow',
    'Quantum', 'Azure', 'Crimson', 'Golden', 'Silver', 'Velvet', 'Prism', 'Echo',
    'Infinite', 'Radiant', 'Stellar', 'Vapor', 'Sonic', 'Lunar', 'Solar', 'Nova'
  ],

  artistic: [
    'Dreamer', 'Visions', 'Canvas', 'Palette', 'Brush', 'Studio', 'Gallery', 'Artist',
    'Creator', 'Designer', 'Painter', 'Sculptor', 'Visionary', 'Maestro', 'Genius',
    'Muse', 'Inspiration', 'Expression', 'Creativity', 'Imagination', 'Wonder', 'Magic'
  ],

  tech: [
    'AI', 'Digital', 'Cyber', 'Binary', 'Code', 'Tech', 'Data', 'Algorithm',
    'Neural', 'Matrix', 'Virtual', 'Cloud', 'Network', 'System', 'Protocol',
    'Interface', 'Processor', 'Circuit', 'Logic', 'Syntax', 'Runtime', 'Core'
  ],

  abstract: [
    'Wave', 'Flow', 'Stream', 'Current', 'Pulse', 'Rhythm', 'Harmony', 'Melody',
    'Symphony', 'Beat', 'Tempo', 'Vibe', 'Energy', 'Force', 'Power', 'Spirit',
    'Soul', 'Mind', 'Heart', 'Essence', 'Aurora', 'Zenith', 'Apex', 'Peak'
  ],

  gaming: [
    'Player', 'Gamer', 'Legend', 'Master', 'Pro', 'Elite', 'Champion', 'Hero',
    'Warrior', 'Knight', 'Assassin', 'Mage', 'Hunter', 'Scout', 'Guardian',
    'Phantom', 'Shadow', 'Storm', 'Blade', 'Fire', 'Ice', 'Thunder', 'Lightning'
  ],

  firstNames: [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
    'Blake', 'Cameron', 'Drew', 'Ellis', 'Finley', 'Harper', 'Indigo', 'Sage',
    'Rowan', 'Phoenix', 'River', 'Sky', 'Ocean', 'Luna', 'Nova', 'Aria'
  ],

  lastNames: [
    'Chen', 'Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson',
    'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
    'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee'
  ],

  minimalist: [
    'Min', 'Max', 'Zen', 'Pure', 'Simple', 'Clean', 'Clear', 'Calm', 'Peace',
    'Still', 'Quiet', 'Soft', 'Light', 'Dark', 'Grey', 'White', 'Black', 'Blue',
    'Red', 'Green', 'One', 'Two', 'Three', 'Zero', 'Alpha', 'Beta', 'Gamma'
  ]
};

// 75个预生成的独特用户名
export const PRESET_USERNAMES: GeneratedUsername[] = [
  // Creative/Artistic (20个)
  { username: 'PixelDreamer', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Creative digital artist focused on pixel art and dreams' },
  { username: 'NeonVisions', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Vibrant visual creator with futuristic aesthetics' },
  { username: 'CrystalCanvas', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Artistic creator with clear, brilliant visual style' },
  { username: 'QuantumBrush', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Scientific-artistic fusion creator' },
  { username: 'VelvetEcho', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Smooth, resonant creative voice' },
  { username: 'PrismMuse', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Multi-faceted artistic inspiration' },
  { username: 'StellarStudio', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Cosmic-themed creative workspace' },
  { username: 'LunarPalette', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Night-inspired color master' },
  { username: 'ElectricCanvas', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'High-energy digital artist' },
  { username: 'InfiniteGallery', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Endless creative showcase' },
  { username: 'GoldenMaestro', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Masterful creator with golden touch' },
  { username: 'CrimsonVision', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Bold, passionate visual creator' },
  { username: 'AzureExpression', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Blue-themed emotional artist' },
  { username: 'NovaInspiration', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Explosive creative energy' },
  { username: 'VaporArtist', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Ethereal, atmospheric creator' },
  { username: 'SonicPainter', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Audio-visual fusion artist' },
  { username: 'RadiantDesigner', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Bright, illuminating creative work' },
  { username: 'MysticSculptor', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Mysterious 3D artist' },
  { username: 'EchoCreator', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Reverberating creative influence' },
  { username: 'WonderImagination', style: UsernameStyle.CREATIVE_ARTISTIC, description: 'Amazing imaginative content creator' },

  // Tech-style (15个)
  { username: 'vidu_X23', style: UsernameStyle.TECH_STYLE, description: 'Tech-savvy video creator with experimental edge' },
  { username: 'AI_Creator_99', style: UsernameStyle.TECH_STYLE, description: 'AI-powered content generation specialist' },
  { username: 'CyberMatrix_V2', style: UsernameStyle.TECH_STYLE, description: 'Cyberpunk-themed digital content creator' },
  { username: 'Neural_Net_Pro', style: UsernameStyle.TECH_STYLE, description: 'Machine learning video specialist' },
  { username: 'Code_Visualizer', style: UsernameStyle.TECH_STYLE, description: 'Programming and tech education creator' },
  { username: 'Binary_Artist_01', style: UsernameStyle.TECH_STYLE, description: 'Digital art meets computer science' },
  { username: 'Algorithm_Master', style: UsernameStyle.TECH_STYLE, description: 'Technical problem-solving content' },
  { username: 'Virtual_Studio_X', style: UsernameStyle.TECH_STYLE, description: 'Virtual reality content producer' },
  { username: 'Data_Dreamer_7', style: UsernameStyle.TECH_STYLE, description: 'Data visualization and analytics creator' },
  { username: 'Cloud_Creator_21', style: UsernameStyle.TECH_STYLE, description: 'Cloud computing and tech tutorials' },
  { username: 'Protocol_Vision', style: UsernameStyle.TECH_STYLE, description: 'Network and system architecture content' },
  { username: 'Runtime_Artist', style: UsernameStyle.TECH_STYLE, description: 'Live coding and development streams' },
  { username: 'Interface_Designer_X', style: UsernameStyle.TECH_STYLE, description: 'UI/UX design and tutorials' },
  { username: 'System_Harmony_9', style: UsernameStyle.TECH_STYLE, description: 'System administration and optimization' },
  { username: 'Logic_Builder_42', style: UsernameStyle.TECH_STYLE, description: 'Logical thinking and problem solving' },

  // Real names (15个)
  { username: 'Sarah_Mitchell', style: UsernameStyle.REAL_NAME, description: 'Professional lifestyle and travel vlogger' },
  { username: 'Alex_Chen', style: UsernameStyle.REAL_NAME, description: 'Tech entrepreneur and educational content creator' },
  { username: 'Jordan_Williams', style: UsernameStyle.REAL_NAME, description: 'Fitness and wellness coach' },
  { username: 'Morgan_Davis', style: UsernameStyle.REAL_NAME, description: 'Food and cooking specialist' },
  { username: 'Taylor_Rodriguez', style: UsernameStyle.REAL_NAME, description: 'Music and performance artist' },
  { username: 'Casey_Thompson', style: UsernameStyle.REAL_NAME, description: 'DIY and crafting expert' },
  { username: 'Riley_Anderson', style: UsernameStyle.REAL_NAME, description: 'Personal development and motivation' },
  { username: 'Avery_Martinez', style: UsernameStyle.REAL_NAME, description: 'Fashion and style influencer' },
  { username: 'Quinn_Johnson', style: UsernameStyle.REAL_NAME, description: 'Gaming and entertainment creator' },
  { username: 'Blake_Wilson', style: UsernameStyle.REAL_NAME, description: 'Outdoor adventure and nature content' },
  { username: 'Cameron_Lee', style: UsernameStyle.REAL_NAME, description: 'Photography and visual storytelling' },
  { username: 'Drew_Garcia', style: UsernameStyle.REAL_NAME, description: 'Business and entrepreneurship advice' },
  { username: 'Ellis_Brown', style: UsernameStyle.REAL_NAME, description: 'Science and education content' },
  { username: 'Finley_White', style: UsernameStyle.REAL_NAME, description: 'Art and creative tutorials' },
  { username: 'Harper_Clark', style: UsernameStyle.REAL_NAME, description: 'Parenting and family lifestyle' },

  // Abstract (15个)
  { username: 'CyberWave', style: UsernameStyle.ABSTRACT, description: 'Digital wave of futuristic content' },
  { username: 'MysticFlow', style: UsernameStyle.ABSTRACT, description: 'Mysterious streaming content' },
  { username: 'QuantumPulse', style: UsernameStyle.ABSTRACT, description: 'Rhythmic scientific exploration' },
  { username: 'VaporStream', style: UsernameStyle.ABSTRACT, description: 'Atmospheric flowing content' },
  { username: 'EchoRhythm', style: UsernameStyle.ABSTRACT, description: 'Resonant musical patterns' },
  { username: 'NeuralHarmony', style: UsernameStyle.ABSTRACT, description: 'Balanced AI-themed content' },
  { username: 'AuroraForce', style: UsernameStyle.ABSTRACT, description: 'Natural phenomenon inspiration' },
  { username: 'ZenithEnergy', style: UsernameStyle.ABSTRACT, description: 'Peak performance and motivation' },
  { username: 'PhantomBeat', style: UsernameStyle.ABSTRACT, description: 'Mysterious rhythmic content' },
  { username: 'InfiniteEssence', style: UsernameStyle.ABSTRACT, description: 'Endless core content exploration' },
  { username: 'PrismSoul', style: UsernameStyle.ABSTRACT, description: 'Multi-faceted spiritual content' },
  { username: 'CosmicTempo', style: UsernameStyle.ABSTRACT, description: 'Universal rhythm and timing' },
  { username: 'DigitalSpirit', style: UsernameStyle.ABSTRACT, description: 'Technology meets spirituality' },
  { username: 'ElectricMind', style: UsernameStyle.ABSTRACT, description: 'High-energy intellectual content' },
  { username: 'StellarHeart', style: UsernameStyle.ABSTRACT, description: 'Cosmic emotional connection' },

  // Gaming/Minimalist mix (10个)
  { username: 'ShadowHunter_X', style: UsernameStyle.GAMING, description: 'Stealth gaming and strategy content' },
  { username: 'StormBlade_Pro', style: UsernameStyle.GAMING, description: 'Action gaming and esports' },
  { username: 'PhoenixGuardian', style: UsernameStyle.GAMING, description: 'Mythical gaming adventures' },
  { username: 'ThunderLegend', style: UsernameStyle.GAMING, description: 'Epic gaming achievements and guides' },
  { username: 'IceAssassin_21', style: UsernameStyle.GAMING, description: 'Cool, calculated gaming strategies' },
  { username: 'ZenGamer', style: UsernameStyle.MINIMALIST, description: 'Calm, focused gaming approach' },
  { username: 'PureLogic', style: UsernameStyle.MINIMALIST, description: 'Clean, logical content approach' },
  { username: 'SimpleMax', style: UsernameStyle.MINIMALIST, description: 'Maximizing through simplicity' },
  { username: 'ClearVision_1', style: UsernameStyle.MINIMALIST, description: 'Focused, clear content delivery' },
  { username: 'MinimalMind', style: UsernameStyle.MINIMALIST, description: 'Simplified thinking and content' }
];

/**
 * 用户名生成器类
 */
export class UsernameGenerator {
  private usedUsernames: Set<string> = new Set();

  constructor() {
    // 将预设用户名添加到已使用列表
    PRESET_USERNAMES.forEach(item => this.usedUsernames.add(item.username.toLowerCase()));
  }

  /**
   * 生成单个用户名
   */
  generateUsername(config: UsernameConfig): GeneratedUsername {
    let username = '';
    let attempts = 0;
    const maxAttempts = 100;

    do {
      username = this.createUsername(config);
      attempts++;
    } while (this.usedUsernames.has(username.toLowerCase()) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      // 如果尝试次数过多，添加随机后缀
      username = this.createUsername(config) + '_' + Math.floor(Math.random() * 1000);
    }

    this.usedUsernames.add(username.toLowerCase());

    return {
      username,
      style: config.style,
      description: this.generateDescription(username, config.style)
    };
  }

  /**
   * 批量生成用户名
   */
  generateMultiple(count: number, styles?: UsernameStyle[]): GeneratedUsername[] {
    const results: GeneratedUsername[] = [];
    const defaultStyles = Object.values(UsernameStyle);
    const usedStyles = styles || defaultStyles;

    for (let i = 0; i < count; i++) {
      const style = usedStyles[i % usedStyles.length];
      const config: UsernameConfig = {
        style,
        includeNumbers: Math.random() > 0.7,
        includeSpecialChars: Math.random() > 0.8,
        maxLength: 20,
        minLength: 6
      };

      results.push(this.generateUsername(config));
    }

    return results;
  }

  /**
   * 创建用户名的核心逻辑
   */
  private createUsername(config: UsernameConfig): string {
    switch (config.style) {
      case UsernameStyle.CREATIVE_ARTISTIC:
        return this.createCreativeUsername(config);

      case UsernameStyle.TECH_STYLE:
        return this.createTechUsername(config);

      case UsernameStyle.REAL_NAME:
        return this.createRealNameUsername(config);

      case UsernameStyle.ABSTRACT:
        return this.createAbstractUsername(config);

      case UsernameStyle.GAMING:
        return this.createGamingUsername(config);

      case UsernameStyle.MINIMALIST:
        return this.createMinimalistUsername(config);

      default:
        return this.createCreativeUsername(config);
    }
  }

  private createCreativeUsername(config: UsernameConfig): string {
    const creative = this.getRandomWord(WORD_BANKS.creative);
    const artistic = this.getRandomWord(WORD_BANKS.artistic);

    const patterns = [
      `${creative}${artistic}`,
      `${artistic}${creative}`,
      `${creative}_${artistic}`,
      `${creative}${this.getRandomNumber(config)}`
    ];

    return this.selectPattern(patterns, config);
  }

  private createTechUsername(config: UsernameConfig): string {
    const tech = this.getRandomWord(WORD_BANKS.tech);
    const creative = this.getRandomWord(WORD_BANKS.creative);

    const patterns = [
      `${tech}_${creative}_${this.getRandomNumber(config)}`,
      `${creative}_${tech}`,
      `${tech}${creative}${this.getRandomNumber(config)}`,
      `${tech.toLowerCase()}_v${this.getRandomNumber(config, 1, 9)}`
    ];

    return this.selectPattern(patterns, config);
  }

  private createRealNameUsername(config: UsernameConfig): string {
    const firstName = this.getRandomWord(WORD_BANKS.firstNames);
    const lastName = this.getRandomWord(WORD_BANKS.lastNames);

    const patterns = [
      `${firstName}_${lastName}`,
      `${firstName}${lastName}`,
      `${firstName}_${lastName}${this.getRandomNumber(config, 1, 99)}`,
      `${firstName.charAt(0)}${lastName}`
    ];

    return this.selectPattern(patterns, config);
  }

  private createAbstractUsername(config: UsernameConfig): string {
    const abstract1 = this.getRandomWord(WORD_BANKS.abstract);
    const abstract2 = this.getRandomWord(WORD_BANKS.abstract);

    const patterns = [
      `${abstract1}${abstract2}`,
      `${abstract1}_${abstract2}`,
      `${abstract1}${this.getRandomNumber(config)}`,
      `${abstract1}${abstract2}${this.getRandomNumber(config, 1, 9)}`
    ];

    return this.selectPattern(patterns, config);
  }

  private createGamingUsername(config: UsernameConfig): string {
    const gaming = this.getRandomWord(WORD_BANKS.gaming);
    const creative = this.getRandomWord(WORD_BANKS.creative);

    const patterns = [
      `${gaming}${creative}`,
      `${creative}${gaming}`,
      `${gaming}_${this.getRandomNumber(config, 10, 99)}`,
      `${gaming}${creative}_X`
    ];

    return this.selectPattern(patterns, config);
  }

  private createMinimalistUsername(config: UsernameConfig): string {
    const minimal = this.getRandomWord(WORD_BANKS.minimalist);

    const patterns = [
      minimal,
      `${minimal}${this.getRandomNumber(config, 1, 9)}`,
      `${minimal}_${this.getRandomNumber(config, 1, 99)}`,
      `${minimal.charAt(0).toUpperCase()}${minimal.slice(1)}`
    ];

    return this.selectPattern(patterns, config);
  }

  private selectPattern(patterns: string[], config: UsernameConfig): string {
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    return this.applyConstraints(pattern, config);
  }

  private applyConstraints(username: string, config: UsernameConfig): string {
    let result = username;

    // 长度限制
    if (config.maxLength && result.length > config.maxLength) {
      result = result.substring(0, config.maxLength);
    }

    // 移除特殊字符（如果不允许）
    if (!config.includeSpecialChars) {
      result = result.replace(/[^a-zA-Z0-9_]/g, '');
    }

    return result;
  }

  private getRandomWord(wordBank: string[]): string {
    return wordBank[Math.floor(Math.random() * wordBank.length)];
  }

  private getRandomNumber(config: UsernameConfig, min: number = 1, max: number = 999): string {
    if (!config.includeNumbers) return '';
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  private generateDescription(username: string, style: UsernameStyle): string {
    const descriptions = {
      [UsernameStyle.CREATIVE_ARTISTIC]: 'Creative visual content creator with artistic flair',
      [UsernameStyle.TECH_STYLE]: 'Technology-focused content creator and innovator',
      [UsernameStyle.REAL_NAME]: 'Professional content creator with personal brand',
      [UsernameStyle.ABSTRACT]: 'Abstract and conceptual content explorer',
      [UsernameStyle.GAMING]: 'Gaming enthusiast and entertainment creator',
      [UsernameStyle.MINIMALIST]: 'Clean, focused content with minimalist approach'
    };

    return descriptions[style] || 'Unique content creator';
  }

  /**
   * 获取所有预设用户名
   */
  static getPresetUsernames(): GeneratedUsername[] {
    return [...PRESET_USERNAMES];
  }

  /**
   * 按风格过滤预设用户名
   */
  static getPresetUsernamesByStyle(style: UsernameStyle): GeneratedUsername[] {
    return PRESET_USERNAMES.filter(item => item.style === style);
  }

  /**
   * 重置已使用的用户名列表
   */
  resetUsedUsernames(): void {
    this.usedUsernames.clear();
    PRESET_USERNAMES.forEach(item => this.usedUsernames.add(item.username.toLowerCase()));
  }
}

// 导出一个默认实例
export const defaultUsernameGenerator = new UsernameGenerator();

// 便捷函数
export const generateRandomUsername = (style?: UsernameStyle): GeneratedUsername => {
  const config: UsernameConfig = {
    style: style || UsernameStyle.CREATIVE_ARTISTIC,
    includeNumbers: Math.random() > 0.5,
    includeSpecialChars: false,
    maxLength: 20,
    minLength: 6
  };

  return defaultUsernameGenerator.generateUsername(config);
};

export const generateRandomUsernames = (count: number = 10): GeneratedUsername[] => {
  return defaultUsernameGenerator.generateMultiple(count);
};