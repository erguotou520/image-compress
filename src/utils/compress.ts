import type { CompressOptions, MediaInfo } from '@/types'

export function getMediaExtension(file: MediaInfo) {
  let ext = file.fileExtension.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') {
    ext = 'jpg'
  }
  return ext
}

export function mergeCompressOptions(
  file: MediaInfo,
  defaultQuality: number | undefined,
  options: CompressOptions | undefined
) {
  const ext = getMediaExtension(file)
  const defaultOptions = {
    formats: [ext],
    quality: defaultQuality || 80,
    overwrite: true,
    width: undefined,
    height: undefined
  }
  if (options) {
    return {
      ...defaultOptions,
      ...options
    }
  }
  return defaultOptions
}
