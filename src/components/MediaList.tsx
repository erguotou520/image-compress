import { EMPTY_VIEW_ID } from '@/constants'
import useSettings from '@/hooks/useSettings'
import type { CompressImage, CompressOptions, MediaInfo } from '@/types'
import { formatBytes } from '@/utils'
import { mergeCompressOptions } from '@/utils/compress'
import TaskQueue from '@/utils/queue'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { Dropdown, Tooltip, message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import MediaItem from './MediaItem'
import Settings from './Settings'
import { useLoading } from '@/context/LoadingContext'

const MediaList = () => {
  const [msg, contextHolder] = message.useMessage()
  const { settings } = useSettings()
  const { setIsLoading, setLoadingTip } = useLoading()
  // 是否正在压缩
  const [isCompressing, setIsCompressing] = useState(false)
  // 需要压缩的文件
  const [compressFiles, setCompressFiles] = useState<CompressImage[]>([])
  const [totalSavedSize, setTotalSavedSize] = useState(0)
  // 输出目录
  const outputDir = useRef('')
  // 压缩配置map
  const compressOptionsMap = useRef<Map<string, CompressOptions>>(new Map())

  const compressMedia = (file: MediaInfo) => {
    const options = mergeCompressOptions(file, settings, compressOptionsMap.current.get(file.filePath))
    if (options.width === file.width && options.height === file.height) {
      options.width = undefined
      options.height = undefined
    }
    console.log('compressing...', file.filePath, options)
    return window.ipcRenderer.invoke('compress_image', file.filePath, options, outputDir.current)
  }

  useEffect(() => {
    const handler = (_event: any, { filePath, progress }: { filePath: string; progress: number }) => {
      setCompressFiles(files =>
        files.map(_file => {
          if (_file.filePath === filePath) {
            return { ..._file, progress }
          }
          return _file
        })
      )
    }
    window.ipcRenderer.on('compress_progress', handler)
    return () => {
      window.ipcRenderer.off('compress_progress', handler)
    }
  }, [])

  const chooseOutputDir = async () => {
    const selected = await window.ipcRenderer.invoke('select_output_dir', '选择输出目录')
    if (selected) {
      outputDir.current = selected
      setTimeout(startCompress, 300)
    }
  }

  // 开始压缩
  const startCompress = () => {
    setIsCompressing(true)
    const taskQueue = new TaskQueue()
    // 限制视频任务的并发数，通常视频压缩比较吃资源，建议单队列或低并发
    // 这里简单处理：如果有视频任务，则将 maxConcurrent 设为 1
    const hasVideo = compressFiles.some(f => f.type === 'video')
    if (hasVideo) {
      taskQueue.maxConcurrent = 1
    }
    let totalSavedSize = 0
    for (const [index, file] of compressFiles.entries()) {
      taskQueue.addTask(async () => {
        setCompressFiles(files =>
          files.map<CompressImage>(_file => {
            if (_file.filePath === file.filePath) {
              return { ..._file, compressStatus: 'compressing', progress: 0 }
            }
            return _file
          })
        )
        try {
          // 视线滚动
          if (index > 4) {
            // 在渲染空闲时执行滚动
            requestIdleCallback(() => {
              document
                .querySelector(`.image-item:nth-child(${index})`)
                ?.scrollIntoView({ behavior: 'smooth' })
            }, { timeout: 200 })
          }
          const outputSize: number | null = await compressMedia(file)
          console.log('res', file.filePath, file.fileSize, outputSize)
          const savedSize = outputSize ? file.fileSize - outputSize : 0
          setCompressFiles(files =>
            files.map<CompressImage>(_file => {
              if (_file.filePath === file.filePath) {
                return {
                  ..._file,
                  compressStatus: outputSize ? 'success' : 'error',
                  savedSize,
                  progress: outputSize ? 100 : 0
                }
              }
              return _file
            })
          )
          totalSavedSize += savedSize
        } catch (error) {
          setCompressFiles(files =>
            files.map<CompressImage>(_file => {
              if (_file.filePath === file.filePath) {
                return { ..._file, compressStatus: 'error' }
              }
              return _file
            })
          )
        }
      })
    }
    taskQueue.run(() => {
      setIsCompressing(false)
      setTotalSavedSize(totalSavedSize)
    })
  }

  // 拖拽文件
  const onDropFiles = async (e: DragEvent) => {
    e.preventDefault()
    if (isCompressing) {
      msg.warning('等待前一个压缩任务完成')
      return
    }
    const files = Array.from(e.dataTransfer?.files as FileList).map(file => file.path)
    if (!files.length) {
      return
    }
    const originFiles = compressFiles.reduce<Record<string, 1>>((acc, file) => {
      acc[file.filePath] = 1
      return acc
    }, {})
    try {
      setLoadingTip('正在读取媒体信息...')
      setIsLoading(true)
      let mediaFiles = (await window.ipcRenderer.invoke('read_image_files', files)) as MediaInfo[]
      mediaFiles = mediaFiles.filter(file => !originFiles[file.filePath])
      if (!mediaFiles.length) {
        msg.warning('未读取到有效资源')
        return
      }
      msg.success(`成功读取到新的${mediaFiles.length}个文件`)
      setTotalSavedSize(0)
      document.getElementById(EMPTY_VIEW_ID)?.remove()
      setCompressFiles(prevFiles => [
        ...mediaFiles.map<CompressImage>(file => ({ ...file, compressStatus: 'pending', savedSize: 0 })),
        ...prevFiles.filter(file => ['pending', 'compressing'].includes(file.compressStatus))
      ])
    } catch (error) {
      msg.error('读取文件失败\n' + error)
    } finally {
      setIsLoading(false)
    }
  }

  const onRemoveFile = (filePath: string) => {
    setCompressFiles(prev => {
      const newFiles = prev.filter(f => f.filePath !== filePath)
      if (newFiles.length === 0) {
        window.location.reload()
      }
      return newFiles
    })
    compressOptionsMap.current.delete(filePath)
  }

  const totalOriginSize = useMemo(() => compressFiles.reduce((acc, file) => acc + file.fileSize, 0), [compressFiles])

  useEffect(() => {
    const overHandler = (e: DragEvent) => e.preventDefault()
    document.addEventListener('dragover', overHandler)
    document.addEventListener('drop', onDropFiles)
    return () => {
      document.removeEventListener('dragover', overHandler)
      document.removeEventListener('drop', onDropFiles)
    }
  }, [compressFiles])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-400">
      {contextHolder}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center border-y border-gray-200 dark:border-gray-600 border-y-solid divide-x divide-gray-200 dark:divide-gray-600 divide-x">
          <div className="cell w-5" />
          <div className="cell flex-1">文件名</div>
          <div className="cell w-24">压缩前</div>
          <div className="cell w-22">压缩后</div>
          <div className="cell w-22">节省</div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className='w-screen'>
            {compressFiles.map(file => (
              <MediaItem
                key={file.filePath}
                file={file}
                onOptionsChange={opt => compressOptionsMap.current.set(file.filePath, opt)}
                onRemove={onRemoveFile}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center mt-5 p-3 text-sm">
        <Settings />
        <div className="ml-auto flex items-center">
          {totalSavedSize > 0 && <Tooltip className="mr-2 text-sub" title={(
            <>
              <div className="">源文件共 {compressFiles.length} 个， 累计：{formatBytes(totalOriginSize)}</div>
              <div className="mt-1">有效压缩文件共 {compressFiles.filter(file => file.compressStatus === 'success' && file.savedSize > 0).length} 个</div>
              <div className="mt-1">压缩后文件累计：{formatBytes(totalOriginSize - totalSavedSize)}</div>
              <div className="mt-1">压缩比：{Math.round((totalSavedSize / totalOriginSize) * 10000) / 100}%</div>
            </>
          )}>
            <span className='cursor-help'>
              <QuestionCircleOutlined className='mr-1' />
              本次累计节省：{formatBytes(totalSavedSize)}
            </span>
          </Tooltip>}
          <Dropdown.Button
            className="w-[min-content]"
            menu={{
              items: [
                { key: 'chooseOutputDir', label: '选择保存目录(单次生效)', disabled: isCompressing },
                { key: 'clear', label: '清空列表', disabled: isCompressing }
              ],
              onClick(e) {
                if (e.key === 'chooseOutputDir') {
                  chooseOutputDir()
                } else if (e.key === 'clear') {
                  setCompressFiles([])
                  setTotalSavedSize(0)
                }
              }
            }}
            type="primary"
            loading={isCompressing}
            onClick={startCompress}
          >
            开始压缩
          </Dropdown.Button>
        </div>
      </div>
    </div>
  )
}

export default MediaList
