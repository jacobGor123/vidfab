/**
 * 用户名展示 - 75个独特的视频创作者用户名
 * Username Showcase - 75 Unique Video Creator Usernames
 */

// 75个预设用户名数据
const PRESET_USERNAMES = [
  // Creative/Artistic (20个)
  { username: 'PixelDreamer', style: 'creative_artistic', description: 'Creative digital artist focused on pixel art and dreams' },
  { username: 'NeonVisions', style: 'creative_artistic', description: 'Vibrant visual creator with futuristic aesthetics' },
  { username: 'CrystalCanvas', style: 'creative_artistic', description: 'Artistic creator with clear, brilliant visual style' },
  { username: 'QuantumBrush', style: 'creative_artistic', description: 'Scientific-artistic fusion creator' },
  { username: 'VelvetEcho', style: 'creative_artistic', description: 'Smooth, resonant creative voice' },
  { username: 'PrismMuse', style: 'creative_artistic', description: 'Multi-faceted artistic inspiration' },
  { username: 'StellarStudio', style: 'creative_artistic', description: 'Cosmic-themed creative workspace' },
  { username: 'LunarPalette', style: 'creative_artistic', description: 'Night-inspired color master' },
  { username: 'ElectricCanvas', style: 'creative_artistic', description: 'High-energy digital artist' },
  { username: 'InfiniteGallery', style: 'creative_artistic', description: 'Endless creative showcase' },
  { username: 'GoldenMaestro', style: 'creative_artistic', description: 'Masterful creator with golden touch' },
  { username: 'CrimsonVision', style: 'creative_artistic', description: 'Bold, passionate visual creator' },
  { username: 'AzureExpression', style: 'creative_artistic', description: 'Blue-themed emotional artist' },
  { username: 'NovaInspiration', style: 'creative_artistic', description: 'Explosive creative energy' },
  { username: 'VaporArtist', style: 'creative_artistic', description: 'Ethereal, atmospheric creator' },
  { username: 'SonicPainter', style: 'creative_artistic', description: 'Audio-visual fusion artist' },
  { username: 'RadiantDesigner', style: 'creative_artistic', description: 'Bright, illuminating creative work' },
  { username: 'MysticSculptor', style: 'creative_artistic', description: 'Mysterious 3D artist' },
  { username: 'EchoCreator', style: 'creative_artistic', description: 'Reverberating creative influence' },
  { username: 'WonderImagination', style: 'creative_artistic', description: 'Amazing imaginative content creator' },

  // Tech-style (15个)
  { username: 'vidu_X23', style: 'tech_style', description: 'Tech-savvy video creator with experimental edge' },
  { username: 'AI_Creator_99', style: 'tech_style', description: 'AI-powered content generation specialist' },
  { username: 'CyberMatrix_V2', style: 'tech_style', description: 'Cyberpunk-themed digital content creator' },
  { username: 'Neural_Net_Pro', style: 'tech_style', description: 'Machine learning video specialist' },
  { username: 'Code_Visualizer', style: 'tech_style', description: 'Programming and tech education creator' },
  { username: 'Binary_Artist_01', style: 'tech_style', description: 'Digital art meets computer science' },
  { username: 'Algorithm_Master', style: 'tech_style', description: 'Technical problem-solving content' },
  { username: 'Virtual_Studio_X', style: 'tech_style', description: 'Virtual reality content producer' },
  { username: 'Data_Dreamer_7', style: 'tech_style', description: 'Data visualization and analytics creator' },
  { username: 'Cloud_Creator_21', style: 'tech_style', description: 'Cloud computing and tech tutorials' },
  { username: 'Protocol_Vision', style: 'tech_style', description: 'Network and system architecture content' },
  { username: 'Runtime_Artist', style: 'tech_style', description: 'Live coding and development streams' },
  { username: 'Interface_Designer_X', style: 'tech_style', description: 'UI/UX design and tutorials' },
  { username: 'System_Harmony_9', style: 'tech_style', description: 'System administration and optimization' },
  { username: 'Logic_Builder_42', style: 'tech_style', description: 'Logical thinking and problem solving' },

  // Real names (15个)
  { username: 'Sarah_Mitchell', style: 'real_name', description: 'Professional lifestyle and travel vlogger' },
  { username: 'Alex_Chen', style: 'real_name', description: 'Tech entrepreneur and educational content creator' },
  { username: 'Jordan_Williams', style: 'real_name', description: 'Fitness and wellness coach' },
  { username: 'Morgan_Davis', style: 'real_name', description: 'Food and cooking specialist' },
  { username: 'Taylor_Rodriguez', style: 'real_name', description: 'Music and performance artist' },
  { username: 'Casey_Thompson', style: 'real_name', description: 'DIY and crafting expert' },
  { username: 'Riley_Anderson', style: 'real_name', description: 'Personal development and motivation' },
  { username: 'Avery_Martinez', style: 'real_name', description: 'Fashion and style influencer' },
  { username: 'Quinn_Johnson', style: 'real_name', description: 'Gaming and entertainment creator' },
  { username: 'Blake_Wilson', style: 'real_name', description: 'Outdoor adventure and nature content' },
  { username: 'Cameron_Lee', style: 'real_name', description: 'Photography and visual storytelling' },
  { username: 'Drew_Garcia', style: 'real_name', description: 'Business and entrepreneurship advice' },
  { username: 'Ellis_Brown', style: 'real_name', description: 'Science and education content' },
  { username: 'Finley_White', style: 'real_name', description: 'Art and creative tutorials' },
  { username: 'Harper_Clark', style: 'real_name', description: 'Parenting and family lifestyle' },

  // Abstract (15个)
  { username: 'CyberWave', style: 'abstract', description: 'Digital wave of futuristic content' },
  { username: 'MysticFlow', style: 'abstract', description: 'Mysterious streaming content' },
  { username: 'QuantumPulse', style: 'abstract', description: 'Rhythmic scientific exploration' },
  { username: 'VaporStream', style: 'abstract', description: 'Atmospheric flowing content' },
  { username: 'EchoRhythm', style: 'abstract', description: 'Resonant musical patterns' },
  { username: 'NeuralHarmony', style: 'abstract', description: 'Balanced AI-themed content' },
  { username: 'AuroraForce', style: 'abstract', description: 'Natural phenomenon inspiration' },
  { username: 'ZenithEnergy', style: 'abstract', description: 'Peak performance and motivation' },
  { username: 'PhantomBeat', style: 'abstract', description: 'Mysterious rhythmic content' },
  { username: 'InfiniteEssence', style: 'abstract', description: 'Endless core content exploration' },
  { username: 'PrismSoul', style: 'abstract', description: 'Multi-faceted spiritual content' },
  { username: 'CosmicTempo', style: 'abstract', description: 'Universal rhythm and timing' },
  { username: 'DigitalSpirit', style: 'abstract', description: 'Technology meets spirituality' },
  { username: 'ElectricMind', style: 'abstract', description: 'High-energy intellectual content' },
  { username: 'StellarHeart', style: 'abstract', description: 'Cosmic emotional connection' },

  // Gaming/Minimalist mix (10个)
  { username: 'ShadowHunter_X', style: 'gaming', description: 'Stealth gaming and strategy content' },
  { username: 'StormBlade_Pro', style: 'gaming', description: 'Action gaming and esports' },
  { username: 'PhoenixGuardian', style: 'gaming', description: 'Mythical gaming adventures' },
  { username: 'ThunderLegend', style: 'gaming', description: 'Epic gaming achievements and guides' },
  { username: 'IceAssassin_21', style: 'gaming', description: 'Cool, calculated gaming strategies' },
  { username: 'ZenGamer', style: 'minimalist', description: 'Calm, focused gaming approach' },
  { username: 'PureLogic', style: 'minimalist', description: 'Clean, logical content approach' },
  { username: 'SimpleMax', style: 'minimalist', description: 'Maximizing through simplicity' },
  { username: 'ClearVision_1', style: 'minimalist', description: 'Focused, clear content delivery' },
  { username: 'MinimalMind', style: 'minimalist', description: 'Simplified thinking and content' }
];

// 风格分类映射
const styleLabels = {
  'creative_artistic': '🎨 创意艺术风格',
  'tech_style': '⚡ 科技风格',
  'real_name': '👤 真实姓名风格',
  'abstract': '🌀 抽象风格',
  'gaming': '🎮 游戏风格',
  'minimalist': '⚪ 极简风格'
};

// 展示所有用户名
function displayAllUsernames() {
  console.log('🎯 VidFab 视频创作者用户名集合 - 75个独特用户名\n');
  console.log('=' * 80 + '\n');

  // 按风格分组展示
  Object.keys(styleLabels).forEach(style => {
    const usernames = PRESET_USERNAMES.filter(u => u.style === style);
    console.log(`\n${styleLabels[style]} (${usernames.length}个):`);
    console.log('-' * 60);

    usernames.forEach((u, index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${u.username.padEnd(20)} - ${u.description}`);
    });
  });

  // 统计信息
  console.log('\n\n📊 统计信息:');
  console.log('-' * 40);
  console.log(`总用户名数量: ${PRESET_USERNAMES.length}`);

  Object.keys(styleLabels).forEach(style => {
    const count = PRESET_USERNAMES.filter(u => u.style === style).length;
    console.log(`${styleLabels[style]}: ${count}个`);
  });

  // 长度统计
  const lengths = PRESET_USERNAMES.map(u => u.username.length);
  const avgLength = (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1);
  const minLength = Math.min(...lengths);
  const maxLength = Math.max(...lengths);

  console.log(`\n平均长度: ${avgLength} 字符`);
  console.log(`最短: ${minLength} 字符`);
  console.log(`最长: ${maxLength} 字符`);

  // 特征分析
  const withNumbers = PRESET_USERNAMES.filter(u => /\d/.test(u.username)).length;
  const withUnderscores = PRESET_USERNAMES.filter(u => /_/.test(u.username)).length;

  console.log(`\n包含数字: ${withNumbers}个 (${(withNumbers/75*100).toFixed(1)}%)`);
  console.log(`包含下划线: ${withUnderscores}个 (${(withUnderscores/75*100).toFixed(1)}%)`);
}

// 验证唯一性
function validateUniqueness() {
  const usernames = PRESET_USERNAMES.map(u => u.username.toLowerCase());
  const uniqueUsernames = new Set(usernames);

  if (usernames.length === uniqueUsernames.size) {
    console.log('\n✅ 所有用户名都是唯一的');
  } else {
    console.log('\n❌ 发现重复用户名');
    const duplicates = usernames.filter((item, index) => usernames.indexOf(item) !== index);
    console.log('重复项:', [...new Set(duplicates)]);
  }
}

// 导出为JSON格式
function exportAsJSON() {
  const exportData = {
    meta: {
      total: PRESET_USERNAMES.length,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    },
    usernames: PRESET_USERNAMES
  };

  return JSON.stringify(exportData, null, 2);
}

// 运行展示
displayAllUsernames();
validateUniqueness();

console.log('\n\n📁 数据已准备完成，可通过以下方式使用:');
console.log('- 直接从预设列表选择');
console.log('- 通过API动态生成新的用户名');
console.log('- 根据内容类型获取推荐用户名');
console.log('- 验证用户名可用性和质量');

// 展示一些样例用法
console.log('\n\n🌟 样例推荐 (根据内容类型):');
console.log('科技频道推荐:', PRESET_USERNAMES.filter(u => u.style === 'tech_style').slice(0, 3).map(u => u.username).join(', '));
console.log('艺术频道推荐:', PRESET_USERNAMES.filter(u => u.style === 'creative_artistic').slice(0, 3).map(u => u.username).join(', '));
console.log('游戏频道推荐:', PRESET_USERNAMES.filter(u => u.style === 'gaming').slice(0, 3).map(u => u.username).join(', '));
console.log('个人品牌推荐:', PRESET_USERNAMES.filter(u => u.style === 'real_name').slice(0, 3).map(u => u.username).join(', '));