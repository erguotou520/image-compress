import useSettings from '@/hooks/useSettings'
import type { CompressImage, CompressOptions } from '@/types'
import { formatBytes } from '@/utils'
import { getMediaExtension as getImageExtension } from '@/utils/compress'
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  CloseOutlined,
  LoadingOutlined,
  LockOutlined,
  RightOutlined,
  SearchOutlined,
  UnlockOutlined,
  VideoCameraFilled,
  PictureFilled,
  FieldTimeOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { Dropdown, Checkbox, ConfigProvider, InputNumber, Select, Switch, Progress, Tooltip } from 'antd'
import type { SelectProps } from 'antd'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'

interface MediaItemProps {
  file: CompressImage
  onOptionsChange: (options: CompressOptions) => void
  onRemove: (filePath: string) => void
}

const miniStyle: CSSProperties = { fontSize: '12px' }

const MediaItem = ({ file, onOptionsChange, onRemove }: MediaItemProps) => {
  const { settings } = useSettings()
  const [expanded, setExpanded] = useState(false)

  const ext = useMemo(() => getImageExtension(file), [file])
  const originIsSvg = ext === 'svg'
  const hasQualityOption = !originIsSvg
  // 是否显示尺寸调整
  const showSizeChange = useMemo(() => {
    return !!file.width && !['svg'].includes(ext)
  }, [ext, file.width])
  // 可输出的格式
  const formats = useMemo<SelectProps['options']>(() => {
    if (file.type === 'video') {
      return [
        { value: 'mp4', label: 'MP4' },
        { value: 'mkv', label: 'MKV' },
        { value: 'webm', label: 'WebM' },
        { value: 'mov', label: 'MOV' },
        { value: 'avi', label: 'AVI' }
      ]
    }
    if (['svg'].includes(ext)) {
      return [{ value: 'svg', label: 'SVG' }]
    }
    const base = [
      { value: 'jpg', label: 'JPEG' },
      { value: 'png', label: 'PNG' },
      { value: 'webp', label: 'WebP' }
      // { value: 'avif', label: 'AVIF' },
    ]
    if (['gif'].includes(ext)) {
      return [{ value: 'gif', label: 'GIF' }, ...base]
    }
    return base
  }, [ext, file.type])

  const [compressOptions, setCompressOptions] = useState<CompressOptions>(() => {
    const isVideo = file.type === 'video'
    const defaultVideoSetting = settings.defaultVideoSetting || 'high'
    return {
      formats: [ext],
      quality: settings.defaultQuality || 80,
      overwrite: isVideo ? false : true,
      width: undefined,
      height: undefined,
      removeSVGViewBox: settings.removeSVGViewBox,
      keepOriginal: isVideo ? defaultVideoSetting === 'keep' : true,
      // Video defaults
      videoCodec: isVideo ? 'libx264' : undefined,
      crf: isVideo ? 18 : undefined,
      preset: isVideo ? 'medium' : undefined
    }
  })
  const [keepAspectRatio, setKeepAspectRatio] = useState(true)

  const toggleExpand = () => setExpanded(!expanded)

  const changeOptions = (key: keyof CompressOptions, value: any) => {
    // 当保持原样为true时，除了keepOriginal和formats/overwrite外，其他参数都不能修改
    if (compressOptions.keepOriginal && key !== 'keepOriginal' && key !== 'formats' && key !== 'overwrite') {
      return
    }
    setCompressOptions(v => ({ ...v, [key]: value }))
  }

  const onSizeChange = (field: 'width' | 'height', value: number | null) => {
    let val = value
    if (val === null) {
      val = file[field]
    }
    if (keepAspectRatio) {
      setCompressOptions({
        ...compressOptions,
        [field]: value,
        [field === 'width' ? 'height' : 'width']: Math.round(
          val * (field === 'width' ? file.height / file.width : file.width / file.height)
        )
      })
    } else {
      setCompressOptions({ ...compressOptions, [field]: value })
    }
  }

  const openInSystemExplorer = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.ipcRenderer.invoke('open_in_system_explorer', file.filePath)
  }

  useEffect(() => {
    if (expanded && !compressOptions.width) {
      setCompressOptions(v => ({ ...v, width: file.width, height: file.height }))
    }
  }, [expanded])

  useEffect(() => {
    onOptionsChange(compressOptions)
  }, [compressOptions])

  return (
    <Dropdown
      menu={{
        items: [
          {
            key: 'remove',
            label: '移除',
            danger: true,
            disabled: file.compressStatus === 'compressing',
            onClick: () => onRemove(file.filePath)
          }
        ]
      }}
      trigger={['contextMenu']}
    >
      <div className="image-item">
        <div
          className="flex items-center border-b border-gray-200 dark:border-gray-600 border-b-solid divide-x divide-gray-200 dark:divide-gray-600 divide-x cursor-pointer"
          onClick={toggleExpand}
        >
          <div className="cell w-5">
            {file.compressStatus === 'pending' ? (
              <ClockCircleFilled className="text-gray-500" />
            ) : file.compressStatus === 'compressing' ? (
              <LoadingOutlined className="text-blue-500" />
            ) : file.compressStatus === 'success' ? (
              <CheckCircleFilled className="text-green-500" />
            ) : (
              <CloseCircleFilled className="text-red-500" />
            )}
          </div>
          <div className="cell flex-1 flex items-center overflow-hidden group">
            <RightOutlined className={`mr-1 text-gray-300 ${expanded ? 'rotate-90' : ''}`} />
            {file.type === 'video' ? (
              <VideoCameraFilled className="mr-2 text-blue-400" />
            ) : (
              <PictureFilled className="mr-2 text-green-400" />
            )}
            <div className="flex-1 truncate mr-2" title={file.fileName}>
              {file.fileName}
              {file.type === 'video' && file.duration && (
                <span className="ml-2 text-gray-400 text-10px">
                  <FieldTimeOutlined className="mr-1" />
                  {Math.round(file.duration)}s
                </span>
              )}
            </div>
            <SearchOutlined className="hidden group-hover:inline-block ml-auto" onClick={openInSystemExplorer} />
          </div>
          <div className="cell w-24">{formatBytes(file.fileSize)}</div>
          <div className="cell w-22 h-full flex items-center">
            {file.compressStatus === 'compressing' ? (
              <Progress
                percent={file.progress || 0}
                size="small"
                showInfo={false}
                strokeColor={settings.primaryColor}
                trailColor="transparent"
                className="px-2"
              />
            ) : file.compressStatus === 'success' ? (
              formatBytes(file.fileSize - file.savedSize)
            ) : '　'}
          </div>
          <div className="cell w-22">
            {file.compressStatus === 'success' ? (
              file.savedSize >= 0 ? (
                formatBytes(file.savedSize)
              ) : (
                <span className="text-red-500">-{formatBytes(-file.savedSize)}</span>
              )
            ) : (
              '　'
            )}
          </div>
        </div>
        {expanded && (
          <div className="flex flex-col py-1 text-xs text-sub border-b border-gray-200 dark:border-gray-600 border-b-solid">
            {/* 第一行 */}
            <div className="flex items-center h-7 px-2">
              {file.type === 'video' && (
                <div className="flex items-center px-2 flex-shrink-0">
                  <span className="mr-2">保持原样</span>
                  <Switch
                    size="small"
                    checked={compressOptions.keepOriginal}
                    onChange={value => {
                      changeOptions('keepOriginal', value)
                    }}
                    style={miniStyle}
                  />
                </div>
              )}
              <div className="flex items-center px-4">
                <span className="mr-2 flex-shrink-0">输出格式</span>
                <Select
                  size="small"
                  mode="multiple"
                  className="![&_.ant-select-selection-item]:pl-1 ![&_.ant-select-selection-item]:text-11px"
                  value={compressOptions.formats}
                  options={formats}
                  onChange={v => changeOptions('formats', v)}
                  style={miniStyle}
                />
              </div>

              {file.type === 'image' && (
                <>
                  {showSizeChange && (
                    <div className="flex items-center px-4 flex-shrink-0">
                      <span className="mr-2">调整尺寸</span>
                      <InputNumber
                        controls={false}
                        className="w-12"
                        size="small"
                        value={compressOptions.width}
                        style={miniStyle}
                        onChange={e => onSizeChange('width', e)}
                      />
                      <CloseOutlined className="mx-1" />
                      <InputNumber
                        controls={false}
                        className="w-12"
                        size="small"
                        value={compressOptions.height}
                        style={miniStyle}
                        onChange={e => onSizeChange('height', e)}
                      />
                      {keepAspectRatio ? (
                        <LockOutlined
                          title="保持宽高比"
                          className="ml-2 cursor-pointer"
                          onClick={() => setKeepAspectRatio(false)}
                        />
                      ) : (
                        <UnlockOutlined
                          title="取消保持宽高比"
                          className="ml-2 cursor-pointer"
                          onClick={() => setKeepAspectRatio(true)}
                        />
                      )}
                    </div>
                  )}
                  {hasQualityOption && (
                    <div className="flex items-center px-4 flex-shrink-0">
                      <span className="mr-2">压缩比</span>
                      <InputNumber
                        className="w-13 [&_.ant-input-number]:text-xs [&_.ant-input-number-suffix]:mr-1"
                        size="small"
                        controls={false}
                        value={compressOptions.quality}
                        onChange={v => changeOptions('quality', v)}
                        suffix="%"
                        style={miniStyle}
                      />
                    </div>
                  )}
                  {originIsSvg && (
                    <div className="flex items-center px-4 flex-shrink-0">
                      <span className="mr-2">去除 viewBox</span>
                      <Switch
                        size="small"
                        checked={compressOptions.removeSVGViewBox}
                        onChange={value => {
                          changeOptions('removeSVGViewBox', value)
                        }}
                        style={miniStyle}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center ml-auto px-4 flex-shrink-0">
                <ConfigProvider theme={{ token: { colorPrimary: 'rgb(51,51,51)' } }}>
                  <Checkbox
                    checked={compressOptions.overwrite}
                    onChange={e => changeOptions('overwrite', e.target.checked)}
                    style={miniStyle}
                  >
                    覆盖原文件
                  </Checkbox>
                </ConfigProvider>
              </div>
            </div>

            {/* 第二行 (仅针对视频且未勾选保持原样时) */}
            {file.type === 'video' && !compressOptions.keepOriginal && (
              <div className="flex items-center h-7 px-2 border-t border-gray-100 dark:border-gray-700 border-t-solid mt-1">
                <div className="flex items-center px-4 flex-shrink-0">
                  <span className="mr-2">调整尺寸</span>
                  <InputNumber
                    controls={false}
                    className="w-12"
                    size="small"
                    value={compressOptions.width}
                    style={miniStyle}
                    onChange={e => onSizeChange('width', e)}
                  />
                  <CloseOutlined className="mx-1" />
                  <InputNumber
                    controls={false}
                    className="w-12"
                    size="small"
                    value={compressOptions.height}
                    style={miniStyle}
                    onChange={e => onSizeChange('height', e)}
                  />
                  {keepAspectRatio ? (
                    <LockOutlined
                      title="保持宽高比"
                      className="ml-2 cursor-pointer"
                      onClick={() => setKeepAspectRatio(false)}
                    />
                  ) : (
                    <UnlockOutlined
                      title="取消保持宽高比"
                      className="ml-2 cursor-pointer"
                      onClick={() => setKeepAspectRatio(true)}
                    />
                  )}
                </div>
                <div className="flex items-center px-4 flex-shrink-0">
                  <Tooltip title="越小画质越好，越大文件越小">
                    <span className="cursor-help">CRF</span>
                    <InfoCircleOutlined className="ml-1 mr-2 cursor-help" />
                  </Tooltip>
                  <InputNumber
                    className="w-14"
                    size="small"
                    min={0}
                    max={51}
                    controls={false}
                    value={compressOptions.crf}
                    onChange={v => changeOptions('crf', v)}
                    style={miniStyle}
                  />
                </div>
                <div className="flex items-center px-4 flex-shrink-0">
                  <span className="mr-2">编码器</span>
                  <Select
                    size="small"
                    className="w-24"
                    value={compressOptions.videoCodec}
                    onChange={v => changeOptions('videoCodec', v)}
                    options={[
                      { value: 'libx264', label: 'H.264' },
                      { value: 'libx265', label: 'H.265' },
                      { value: 'libvpx-vp9', label: 'VP9' },
                      { value: 'libvpx', label: 'VP8' }
                    ]}
                    style={miniStyle}
                  />
                </div>
                <div className="flex items-center px-4 flex-shrink-0">
                  <span className="mr-2">预设</span>
                  <Select
                    size="small"
                    className="w-18"
                    value={compressOptions.preset}
                    onChange={v => changeOptions('preset', v)}
                    options={[
                      { value: 'ultrafast', label: '极快' },
                      { value: 'fast', label: '快' },
                      { value: 'medium', label: '中等' },
                      { value: 'slow', label: '慢' }
                    ]}
                    style={miniStyle}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dropdown>
  )
}

export default MediaItem
