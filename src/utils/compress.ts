import type { CompressOptions, GlobalSettings, MediaInfo } from '@/types'

export function getMediaExtension(file: MediaInfo) {
  let ext = file.fileExtension.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') {
    ext = 'jpg'
  }
  return ext
}

export function mergeCompressOptions(
  file: MediaInfo,
  settings: GlobalSettings,
  options: CompressOptions | undefined
) {
  const ext = getMediaExtension(file)
  const isVideo = file.type === 'video'
  const defaultOptions: CompressOptions = {
    formats: [ext],
    quality: settings.defaultQuality || 80,
    overwrite: isVideo ? false : true,
    width: undefined,
    height: undefined,
    removeSVGViewBox: settings.removeSVGViewBox,
    keepOriginal: isVideo ? settings.defaultVideoSetting === 'keep' : true,
    videoCodec: isVideo ? 'libx264' : undefined,
    crf: isVideo ? settings.videoCrf : undefined,
    preset: isVideo ? 'medium' : undefined
  }
  if (options) {
    return {
      ...defaultOptions,
      ...options
    }
  }
  return defaultOptions
}
