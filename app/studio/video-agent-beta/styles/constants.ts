/**
 * Video Agent Beta - 样式常量系统
 *
 * 统一管理项目中的渐变、阴影、边框、圆角等样式常量
 * 避免代码中出现重复的内联样式定义
 */

export const GRADIENTS = {
  // 主要渐变 - 用于按钮、高亮等
  primary: 'linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)',

  // 卡片渐变 - 用于主卡片背景
  card: 'linear-gradient(135deg, #1a1d2e 0%, #181921 50%, #16181f 100%)',

  // 卡片内部渐变 - 用于内容区域
  cardInner: 'linear-gradient(180deg, #111319 0%, #111319 100%)',

  // 禁用状态渐变 - 用于禁用按钮
  disabled: 'linear-gradient(0deg, rgba(0, 0, 0, 0.40) 0%, rgba(0, 0, 0, 0.40) 100%), linear-gradient(90deg, #4CC3FF 0%, #7B5CFF 100%)'
} as const

export const SHADOWS = {
  // 主要阴影 - 用于按钮、卡片的发光效果
  primary: '0 8px 34px 0 rgba(115, 108, 255, 0.40)',

  // 紫色发光 - 用于焦点状态
  glow: '0 0 12px rgba(207, 203, 255, 0.4)',

  // 悬停发光 - 用于悬停状态增强
  glowHover: '0 0 20px rgba(207, 203, 255, 0.6)'
} as const

export const BORDERS = {
  // 卡片边框
  card: '1px solid #23263A',

  // 输入框边框
  input: '1px solid #252238',

  // 高亮边框 - 用于选中状态
  highlight: '1px solid rgba(124, 92, 255, 0.5)'
} as const

export const RADII = {
  // 按钮圆角
  button: '147px',

  // 卡片圆角
  card: '16px',

  // 输入框圆角
  input: '13px',

  // 小圆角 - 用于标签等小元素
  small: '8px'
} as const

export const COLORS = {
  // 背景色
  background: {
    primary: '#1a1d2e',
    secondary: '#181921',
    tertiary: '#16181f',
    dark: '#111319'
  },

  // 文本色
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.70)',
    tertiary: 'rgba(255, 255, 255, 0.40)',
    disabled: 'rgba(255, 255, 255, 0.20)'
  },

  // 品牌色
  brand: {
    cyan: '#4CC3FF',
    purple: '#7B5CFF',
    purpleLight: '#CFCBFF'
  }
} as const

// 导出类型以便 TypeScript 类型检查
export type GradientKey = keyof typeof GRADIENTS
export type ShadowKey = keyof typeof SHADOWS
export type BorderKey = keyof typeof BORDERS
export type RadiusKey = keyof typeof RADII
