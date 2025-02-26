import type { Theme } from './constants'

export type ImageInfo = {
  fileName: string
  filePath: string
  fileExtension: string
  fileSize: number
  width: number
  height: number
}

export type CompressStatus = 'pending' | 'compressing' | 'success' | 'error'

export type CompressImage = ImageInfo & { compressStatus: CompressStatus; savedSize: number }

export type CompressOptions = {
  width?: number
  height?: number
  formats: string[]
  quality?: number
  overwrite?: boolean
  removeSVGViewBox?: boolean
}

export type GlobalSettings = {
  theme: Theme
  primaryColor: string
  defaultQuality: number
  removeSVGViewBox: boolean
}
