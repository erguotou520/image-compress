interface HeaderProps {
  title?: string
}

const Header = ({ title }: HeaderProps) => {
  return (
    <div
      className="h-9 flex items-center justify-center bg-white dark:bg-dark-400"
      style={{
        // @ts-ignore
        '-webkit-app-region': 'drag',
        WebkitAppRegion: 'drag'
      }}
    >
      <span className="text-sm text-main">{title || '图片压缩'}</span>
    </div>
  )
}

export default Header
