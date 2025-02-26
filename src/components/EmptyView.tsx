import { SwapRightOutlined, FileImageOutlined } from '@ant-design/icons'

import { EMPTY_VIEW_ID } from '@/constants'
import Settings from './Settings'

const EmptyView = () => {
  return (
    <div
      id={EMPTY_VIEW_ID}
      className="absolute left-0 top-9 right-0 bottom-0 flex flex-col items-center justify-center bg-white dark:bg-dark-400 text-sub z-100"
    >
      <FileImageOutlined className="text-72px" />
      <p className="text-lg">将图片/目录拖拽到此处开始压缩</p>
      <div className="w-66 flex justify-end">
        <Settings className="text-xs underline" icon={<SwapRightOutlined />} />
      </div>
    </div>
  )
}

export default EmptyView
