import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import * as electronNS from 'electron'
import sharp from 'sharp'
import { optimize } from 'svgo'
import ffmpegPath from 'ffmpeg-static'
import ffprobePath from 'ffprobe-static'
import { spawn } from 'node:child_process'
import { SUPPORTED_IMAGE_FORMATS, SUPPORTED_VIDEO_FORMATS } from '../src/constants'
import type { MediaInfo, CompressOptions } from '../src/types'

// @ts-ignore - Electron ESM exports are via default
const electron: typeof electronNS & { default: typeof electronNS } = electronNS as any
const { dialog, ipcMain, shell, BrowserWindow } = electron.default



// 获取媒体信息
async function getMediaInfoFromPath(filePath: string): Promise<MediaInfo | null> {
  const stat = await fs.stat(filePath)
  const extension = path.extname(filePath).slice(1).toLowerCase()
  const fileName = path.basename(filePath)

  if (SUPPORTED_IMAGE_FORMATS.includes(extension)) {
    let metadata: sharp.Metadata | undefined
    try {
      metadata = await sharp(filePath).metadata()
    } catch (err) { }
    return {
      fileName,
      filePath,
      fileExtension: extension,
      fileSize: stat.size,
      width: metadata?.width || 0,
      height: metadata?.height || 0,
      type: 'image'
    }
  }

  if (SUPPORTED_VIDEO_FORMATS.includes(extension)) {
    try {
      const metadata = await getVideoMetadata(filePath)
      return {
        fileName,
        filePath,
        fileExtension: extension,
        fileSize: stat.size,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        type: 'video'
      }
    } catch (err) {
      console.error('Failed to get video metadata:', err)
      return null
    }
  }

  return null
}

async function getVideoMetadata(filePath: string): Promise<{ width: number, height: number, duration: number }> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(ffprobePath.path, [
      '-v', 'error',
      '-show_entries', 'stream=width,height,duration',
      '-of', 'json',
      filePath
    ])

    let output = ''
    ffprobe.stdout.on('data', (data) => output += data)
    ffprobe.on('close', (code) => {
      if (code !== 0) return reject(new Error('ffprobe failed'))
      try {
        const data = JSON.parse(output)
        const stream = data.streams[0]
        resolve({
          width: parseInt(stream.width) || 0,
          height: parseInt(stream.height) || 0,
          duration: parseFloat(stream.duration) || 0
        })
      } catch (e) {
        reject(e)
      }
    })
  })
}

// 读取目录
async function readDirectory(dirPath: string): Promise<MediaInfo[]> {
  const mediaFilesInfo: MediaInfo[] = []
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name)
    if (entry.isFile()) {
      const info = await getMediaInfoFromPath(entryPath)
      if (info) {
        mediaFilesInfo.push(info)
      }
    } else if (entry.isDirectory()) {
      const subDirFiles = await readDirectory(entryPath)
      mediaFilesInfo.push(...subDirFiles)
    }
  }
  return mediaFilesInfo
}

// 读取资源文件
ipcMain.handle('read_image_files', async (_event, filePaths: string[]) => {
  const allMediaFilesInfo: MediaInfo[] = []
  for (const filePath of filePaths) {
    const stat = await fs.stat(filePath)
    if (stat.isFile()) {
      const info = await getMediaInfoFromPath(filePath)
      if (info) {
        allMediaFilesInfo.push(info)
      }
    } else if (stat.isDirectory()) {
      const dirFilesInfo = await readDirectory(filePath)
      allMediaFilesInfo.push(...dirFilesInfo)
    }
  }
  return allMediaFilesInfo
})

// 压缩资源
ipcMain.handle('compress_image', async (event, filePath: string, options: CompressOptions, outputDir?: string) => {
  const extension = path.extname(filePath).slice(1).toLowerCase()
  const isImage = SUPPORTED_IMAGE_FORMATS.includes(extension)

  if (isImage) {
    return handleImageCompression(filePath, options, outputDir)
  } else if (SUPPORTED_VIDEO_FORMATS.includes(extension)) {
    return handleVideoCompression(event, filePath, options, outputDir)
  }
  return null
})

async function handleImageCompression(filePath: string, options: CompressOptions, outputDir?: string) {
  const extension = path.extname(filePath).slice(1).toLowerCase()
  const image = sharp(filePath)
  const stat = await fs.stat(filePath)
  const sourceSize = stat.size

  if (options.width && options.height) {
    image.resize(options.width, options.height)
  }
  let outputSize: number | null = null
  for (const format of options.formats) {
    if (format === 'png') {
      const task = image.clone()
      task.png({
        quality: options.quality || 80,
        compressionLevel: 9
      })
      const size = await writeImageResult(
        task,
        sourceSize,
        getOutputPath(filePath, format, options.overwrite ?? false, outputDir)
      )
      if (extension === 'png') outputSize = size
    } else if (format === 'jpg' || format === 'jpeg') {
      const task = image.clone()
      task.jpeg({
        quality: options.quality || 80
      })
      const size = await writeImageResult(
        task,
        sourceSize,
        getOutputPath(filePath, format, options.overwrite ?? false, outputDir)
      )
      if (extension === 'jpg' || extension === 'jpeg') outputSize = size
    } else if (format === 'webp') {
      const task = extension === 'gif' ? sharp(filePath, { animated: true, limitInputPixels: false, pages: -1 }) : image.clone()
      task.webp({
        quality: options.quality || 80
      })
      const size = await writeImageResult(
        task,
        sourceSize,
        getOutputPath(filePath, format, options.overwrite ?? false, outputDir)
      )
      if (extension === 'webp') outputSize = size
    } else if (format === 'gif') {
      const task = sharp(filePath, { animated: true, limitInputPixels: false, pages: -1 })
      const metadata = await task.metadata()
      task.gif({
        reuse: true,
        loop: metadata.loop,
        delay: metadata.delay,
      })
      const size = await writeImageResult(
        task,
        sourceSize,
        getOutputPath(filePath, format, options.overwrite ?? false, outputDir)
      )
      if (extension === 'gif') outputSize = size
    } else if (format === 'svg') {
      const svgContent = await fs.readFile(filePath, 'utf8')
      const { data } = await optimize(svgContent, {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                removeViewBox: options.removeSVGViewBox === true ? undefined : false
              }
            }
          }
        ]
      })
      if (data.length < sourceSize) {
        const outputPath = getOutputPath(filePath, format, options.overwrite ?? false, outputDir)
        await fs.writeFile(outputPath, data)
        if (extension === 'svg') outputSize = data.length
      } else {
        if (extension === 'svg') outputSize = sourceSize
      }
    }
  }
  return outputSize || sourceSize
}

async function handleVideoCompression(event: electronNS.IpcMainInvokeEvent, filePath: string, options: CompressOptions, outputDir?: string) {
  const extension = path.extname(filePath).slice(1).toLowerCase()
  const formats = options.formats.length > 0 ? options.formats : [extension]
  let lastOutputSize: number | null = null

  // 循环处理多种格式
  for (const outputFormat of formats) {
    const outputPath = getOutputPath(filePath, outputFormat, options.overwrite ?? false, outputDir)
    const resultSize = await new Promise<number>((resolve, reject) => {
      // 安全的文件覆盖：先输出到临时文件，完成后替换原文件
      const tempPath = outputPath + '.tmp'
      const args = getVideoArgs(filePath, tempPath, outputFormat, options)

      console.log(ffmpegPath, ...args)
      const ffmpeg = spawn(ffmpegPath!, args)
      const sender = BrowserWindow.fromWebContents(event.sender)

      let duration = 0
      let stderrOutput = ''
      ffmpeg.stderr.on('data', (data) => {
        const text = data.toString()
        stderrOutput += text
        // 只保留最后 2000 个字符，防止内存溢出
        if (stderrOutput.length > 2000) {
          stderrOutput = stderrOutput.slice(-2000)
        }

        const durationMatch = text.match(/Duration: (\d{2}:\d{2}:\d{2}.\d{2})/)
        if (durationMatch) {
          duration = timeToSeconds(durationMatch[1])
        }

        const timeMatch = text.match(/time=(\d{2}:\d{2}:\d{2}.\d{2})/)
        if (timeMatch && duration > 0) {
          const currentTime = timeToSeconds(timeMatch[1])
          const progress = Math.min(99, Math.round((currentTime / duration) * 100))
          sender?.webContents.send('compress_progress', { filePath, progress })
        }
      })

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          try {
            await fs.stat(tempPath)
            if (options.overwrite && fsSync.existsSync(filePath) && filePath === outputPath) {
              await fs.unlink(filePath)
            }
            await fs.rename(tempPath, outputPath)
            const stat = await fs.stat(outputPath)
            sender?.webContents.send('compress_progress', { filePath, progress: 100 })
            resolve(stat.size)
          } catch (error) {
            reject(new Error(`Failed to replace original file: ${error}`))
          }
        } else {
          console.error(`FFmpeg failed for ${filePath}:\n`, stderrOutput)
          if (fsSync.existsSync(tempPath)) {
            await fs.unlink(tempPath)
          }
          reject(new Error(`FFmpeg exited with code ${code}. Check logs for details.`))
        }
      })
    })

    // 如果输出格式和原格式相同，记录其大小作为最后的压缩结果参考
    if (outputFormat === extension) {
      lastOutputSize = resultSize
    } else if (lastOutputSize === null) {
      lastOutputSize = resultSize
    }
  }

  return lastOutputSize
}

function getVideoArgs(filePath: string, tempPath: string, outputFormat: string, options: CompressOptions): string[] {
  const args = ['-i', filePath]
  const isWebm = outputFormat === 'webm'

  if (!options.keepOriginal) {
    let vcodec = options.videoCodec || 'libx264'
    // WebM 容器检查
    if (isWebm && !['libvpx-vp9', 'libvpx', 'libaom-av1'].includes(vcodec)) {
      vcodec = 'libvpx-vp9'
    }

    args.push('-vcodec', vcodec)

    if (vcodec.startsWith('libvpx')) {
      // VP8/VP9 CRF 处理
      if (options.crf !== undefined) {
        args.push('-crf', Math.min(63, options.crf).toString(), '-b:v', '0')
      } else if (options.videoBitrate) {
        args.push('-b:v', options.videoBitrate)
      }
      args.push('-acodec', 'libopus')
    } else {
      // H.264/H.265 处理
      if (options.crf !== undefined) {
        args.push('-crf', options.crf.toString())
      } else if (options.videoBitrate) {
        args.push('-b:v', options.videoBitrate)
      }
    }

    if (options.preset) {
      args.push('-preset', options.preset)
    }

    if (options.width && options.height) {
      args.push('-vf', `scale=${options.width}:${options.height}`)
    }
  } else {
    if (isWebm) {
      // WebM 保持原样 (使用高质量 VP9 + Opus，避免使用 -lossless 1 导致体积爆炸)
      args.push('-vcodec', 'libvpx-vp9', '-crf', '10', '-b:v', '0', '-acodec', 'libopus')
    } else {
      // 其他格式 (如 MP4/MKV) 使用 H.264 无损
      args.push('-vcodec', 'libx264', '-crf', '0', '-c:a', 'copy')
    }
  }

  // 增加兼容性参数 (解决 Mac 预览打不开/卡顿问题)
  args.push('-pix_fmt', 'yuv420p')

  // 映射格式为 FFmpeg 的 -f 参数
  const formatMap: Record<string, string> = {
    mp4: 'mp4',
    mkv: 'matroska',
    mov: 'mov',
    avi: 'avi',
    wmv: 'wmv',
    flv: 'flv',
    webm: 'webm'
  }

  if (formatMap[outputFormat]) {
    args.push('-f', formatMap[outputFormat])
  }

  args.push('-y', tempPath)
  return args
}


function timeToSeconds(timeStr: string): number {
  const [h, m, s] = timeStr.split(':').map(parseFloat)
  return h * 3600 + m * 60 + s
}

function getOutputPath(filePath: string, ext: string | null, overwrite: boolean, outputDir?: string) {
  let outputPath = filePath

  if (outputDir) {
    const fileName = path.basename(filePath)
    outputPath = path.join(outputDir, fileName)
  }

  if (!overwrite) {
    const parsedPath = path.parse(outputPath)
    outputPath = path.join(parsedPath.dir, `${parsedPath.name}-compressed${parsedPath.ext}`)

    while (fsSync.existsSync(outputPath)) {
      const randomStr = Math.random().toString(36).substring(2, 8)
      outputPath = path.join(parsedPath.dir, `${parsedPath.name}-compressed-${randomStr}${parsedPath.ext}`)
    }
  }

  if (ext) {
    const extnameIndex = outputPath.lastIndexOf(path.extname(outputPath))
    if (extnameIndex !== -1) {
      outputPath = `${outputPath.slice(0, extnameIndex)}.${ext}`
    }
  }

  return outputPath
}

async function writeImageResult(task: sharp.Sharp, sourceSize: number, outputPath: string): Promise<number | null> {
  // 这会导致结果变大
  // const buffer= await task.toBuffer();
  // return sharp(buffer).toFile(outputPath);
  return new Promise<number | null>(resolve => {
    // 获取源文件大小，如果压缩后体积没有减少则不写文件
    task.toBuffer((err, buf) => {
      if (err) {
        resolve(null)
      } else {
        const size = buf.length
        if (size < sourceSize) {
          fs.writeFile(outputPath, buf)
          resolve(size)
        } else {
          resolve(sourceSize)
        }
      }
    })
  })
}

// 弹框
ipcMain.handle('select_output_dir', async (_event, title: string) => {
  const result = await dialog.showOpenDialog({
    title,
    properties: ['openDirectory', 'createDirectory']
  })

  if (result.canceled) {
    return null
  } else {
    return result.filePaths[0]
  }
})

// 在资源浏览器中打开文件所在路径
ipcMain.handle('open_in_system_explorer', (_event, filePath) => {
  shell.showItemInFolder(filePath)
})
