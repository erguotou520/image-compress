import useSettings from '@/hooks/useSettings'
import type { CompressImage, CompressOptions } from '@/types'
import { formatBytes } from '@/utils'
import { getImageExtension } from '@/utils/compress'
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  CloseOutlined,
  LoadingOutlined,
  LockOutlined,
  RightOutlined,
  SearchOutlined,
  UnlockOutlined
} from '@ant-design/icons'
import { Checkbox, ConfigProvider, InputNumber, Select, Switch } from 'antd'
import type { SelectProps } from 'antd'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'

interface ImageItemProps {
  file: CompressImage
  onOptionsChange: (options: CompressOptions) => void
}

const miniStyle: CSSProperties = { fontSize: '12px' }

const ImageItem = ({ file, onOptionsChange }: ImageItemProps) => {
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
  }, [ext])

  const [compressOptions, setCompressOptions] = useState<CompressOptions>(() => {
    return {
      formats: [ext],
      quality: settings.defaultQuality || 80,
      overwrite: true,
      width: undefined,
      height: undefined,
      removeSVGViewBox: settings.removeSVGViewBox
    }
  })
  const [keepAspectRatio, setKeepAspectRatio] = useState(true)

  const toggleExpand = () => setExpanded(!expanded)

  const changeOptions = (key: keyof CompressOptions, value: any) => {
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
          <div className="flex-1 truncate mr-2" title={file.fileName}>
            {file.fileName}
          </div>
          <SearchOutlined className="hidden group-hover:inline-block ml-auto" onClick={openInSystemExplorer} />
        </div>
        <div className="cell w-24">{formatBytes(file.fileSize)}</div>
        <div className="cell w-22">{file.compressStatus === 'success' ? formatBytes(file.fileSize - file.savedSize) : '　'}</div>
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
        <div className="flex items-center py-1 text-xs text-sub border-b border-gray-200 dark:border-gray-600 border-b-solid">
          {showSizeChange && (
            <div className="flex items-center pl-2 pr-4 flex-shrink-0">
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
          {hasQualityOption && <div className="flex items-center px-4 flex-shrink-0">
            <span className="mr-2">压缩比</span>
            <InputNumber
              className="w-13 [&_.ant-input-number]:text-xs [&_.ant-input-number-suffix]:mr-1"
              size="small"
              controls={false}
              value={compressOptions.quality}
              suffix="%"
              style={miniStyle}
            />
          </div>}
          {originIsSvg && <div className="flex items-center px-4 flex-shrink-0">
            <span className="mr-2">去除 viewBox</span>
            <Switch
              size="small"
              checked={compressOptions.removeSVGViewBox}
              onChange={value => {
                changeOptions('removeSVGViewBox', value)
              }}
              style={miniStyle}
            />
          </div>}
          <div className="flex items-center ml-auto flex-shrink-0">
            <ConfigProvider theme={{ token: { colorPrimary: 'rgb(51,51,51)' } }}>
              <Checkbox
                className=""
                checked={compressOptions.overwrite}
                onChange={e => changeOptions('overwrite', e.target.checked)}
                style={miniStyle}
              >
                覆盖原文件
              </Checkbox>
            </ConfigProvider>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageItem
