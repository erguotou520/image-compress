export type CompressOptions = {
  autoWebp?: boolean
  quality?: number
  speed?: 'fast' | 'slow'
}

export type CompressResult = { filePath: string } & ({
  success: true
  originSize: number
  compressedSize: number
} | {
  success: false
  message: string
})
