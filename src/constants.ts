export const EMPTY_VIEW_ID = 'empty-view'
export const THEME_KEY = 'theme'
export const PRIMARY_COLOR_KEY = 'primaryColor'
export const DEFAULT_QUALITY_KEY = 'defaultQuality'
export const SVG_VIEW_BOX_KEY = 'svgViewBox'
export const DEFAULT_VIDEO_SETTING_KEY = 'defaultVideoSetting'

export const SUPPORTED_IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif']
export const SUPPORTED_VIDEO_FORMATS = ['mp4', 'mkv', 'mov', 'avi', 'wmv', 'flv', 'webm']

export const themes = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' }
] as const

export type Theme = (typeof themes)[number]['value']
