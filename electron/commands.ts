import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { dialog, ipcMain, shell } from 'electron'
import sharp from 'sharp'
import { optimize } from 'svgo'

interface ImageInfo {
  fileName: string
  filePath: string
  fileExtension: string
  fileSize: number
  width: number
  height: number
}

interface CompressOptions {
  width?: number
  height?: number
  formats: string[]
  quality?: number
  overwrite?: boolean
  removeSVGViewBox?: boolean
}

// 受支持的图片格式列表
const SUPPORTED_IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif']

// 获取图片信息
async function getImageInfoFromPath(filePath: string): Promise<ImageInfo | null> {
  const stat = await fs.stat(filePath)
  const extension = path.extname(filePath).slice(1).toLowerCase()
  if (!SUPPORTED_IMAGE_FORMATS.includes(extension)) {
    return null
  }
  let metadata: sharp.Metadata | undefined
  try {
    metadata = await sharp(filePath).metadata()
  } catch (err) {}
  return {
    fileName: path.basename(filePath),
    filePath: filePath,
    fileExtension: extension,
    fileSize: stat.size,
    width: metadata?.width || 0,
    height: metadata?.height || 0
  }
}

// 读取目录
async function readDirectory(dirPath: string): Promise<ImageInfo[]> {
  const imageFilesInfo: ImageInfo[] = []
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name)
    if (entry.isFile()) {
      const info = await getImageInfoFromPath(entryPath)
      if (info) {
        imageFilesInfo.push(info)
      }
    } else if (entry.isDirectory()) {
      const subDirFiles = await readDirectory(entryPath)
      imageFilesInfo.push(...subDirFiles)
    }
  }
  return imageFilesInfo
}

// 读取图片文件
ipcMain.handle('read_image_files', async (_event, filePaths: string[]) => {
  const allImageFilesInfo: ImageInfo[] = []
  for (const filePath of filePaths) {
    const stat = await fs.stat(filePath)
    if (stat.isFile()) {
      const info = await getImageInfoFromPath(filePath)
      if (info) {
        allImageFilesInfo.push(info)
      }
    } else if (stat.isDirectory()) {
      const dirFilesInfo = await readDirectory(filePath)
      allImageFilesInfo.push(...dirFilesInfo)
    }
  }
  return allImageFilesInfo
})

// 压缩图片
ipcMain.handle('compress_image', async (_event, filePath: string, options: CompressOptions, outputDir?: string) => {
  const extension = path.extname(filePath).slice(1).toLowerCase()
  const image = sharp(filePath)

  const stat = await fs.stat(filePath)
  const sourceSize = stat.size
  // console.log('compress', options)
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
      // 导出
      const size = await writeImageResult(
        task,
        sourceSize,
        getOutputPath(filePath, format, options.overwrite ?? false, outputDir)
      )
      if (extension === 'png') {
        outputSize = size
      }
    } else if (format === 'jpg') {
      const task = image.clone()
      task.jpeg({
        quality: options.quality || 80
      })
      // 导出
      const size = await writeImageResult(
        task,
        sourceSize,
        getOutputPath(filePath, format, options.overwrite ?? false, outputDir)
      )
      if (extension === 'jpg' || extension === 'jpeg') {
        outputSize = size
      }
    } else if (format === 'webp') {
      const task = extension === 'gif' ? sharp(filePath, { animated: true, limitInputPixels: false, pages: -1 }) : image.clone()
      task.webp({
        quality: options.quality || 80
      })
      // 导出
      const size = await writeImageResult(
        task,
        sourceSize,
        getOutputPath(filePath, format, options.overwrite ?? false, outputDir)
      )
      if (extension === 'webp') {
        outputSize = size
      }
    } else if (format === 'gif') {
      const task = sharp(filePath, { animated: true, limitInputPixels: false, pages: -1 })
      const metadata = await task.metadata()
      task.gif({
        reuse: true,
        loop: metadata.loop,
        delay: metadata.delay,
      })
      // 导出
      const size = await writeImageResult(
        task,
        sourceSize,
        getOutputPath(filePath, format, options.overwrite ?? false, outputDir)
      )
      if (extension === 'gif') {
        outputSize = size
      }
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
        await fs.writeFile(getOutputPath(filePath, format, options.overwrite ?? false, outputDir), data)
        if (extension === 'svg') {
          outputSize = data.length
        }
      } else {
        if (extension === 'svg') {
          outputSize = sourceSize
        }
      }
    }
  }
  return outputSize || sourceSize
})

function getOutputPath(filePath: string, ext: string | null, overwrite: boolean, outputDir?: string) {
  let outputPath = filePath

  if (outputDir) {
    const fileName = path.basename(filePath)
    outputPath = path.join(outputDir, fileName)
  }

  if (!overwrite) {
    const parsedPath = path.parse(outputPath)
    outputPath = path.join(parsedPath.dir, `${parsedPath.name}-compressed.${parsedPath.ext}`)

    while (fsSync.existsSync(outputPath)) {
      const randomStr = Math.random().toString(36).substring(2, 8)
      outputPath = path.join(parsedPath.dir, `${parsedPath.name}-compressed-${randomStr}.${parsedPath.ext}`)
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
