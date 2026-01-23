import type { Theme } from './constants'

export type MediaInfo = {
  fileName: string
  filePath: string
  fileExtension: string
  fileSize: number
  width: number
  height: number
  type: 'image' | 'video'
  duration?: number // for video
}

export type ImageInfo = MediaInfo & { type: 'image' }
export type VideoInfo = MediaInfo & { type: 'video' }

export type CompressStatus = 'pending' | 'compressing' | 'success' | 'error'

export type CompressImage = MediaInfo & {
  compressStatus: CompressStatus;
  savedSize: number;
  progress?: number; // 0-100
}

export type CompressOptions = {
  width?: number
  height?: number
  formats: string[]
  quality?: number
  overwrite?: boolean
  removeSVGViewBox?: boolean
  keepOriginal?: boolean // 保持原样选项
  // Video options
  videoCodec?: string
  videoBitrate?: string
  crf?: number
  preset?: string
}

export type GlobalSettings = {
  theme: Theme
  primaryColor: string
  defaultQuality: number
  removeSVGViewBox: boolean
  defaultVideoSetting: 'keep' | 'high'
}
