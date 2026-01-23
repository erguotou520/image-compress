import { ConfigProvider, theme as antdTheme, Spin } from 'antd'

import EmptyView from '@/components/EmptyView'
import MediaList from '@/components/MediaList'
import useSettings from '@/hooks/useSettings'
import { useEffect, useState } from 'react'
import Header from './components/Header'
import { LoadingProvider, useLoading } from './context/LoadingContext'

function AppContent() {
  const { settings } = useSettings()
  const [theme, setTheme] = useState(settings.theme)
  const { isLoading, loadingTip } = useLoading()

  useEffect(() => {
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (settings.theme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light'
        setTheme(newTheme)
      }
    }

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const initialTheme = mediaQuery.matches ? 'dark' : 'light'
      setTheme(initialTheme)
      mediaQuery.addEventListener('change', handleSystemThemeChange)

      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange)
      }
    }
    setTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
  }, [theme])

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: settings.primaryColor
        },
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm
      }}
    >
      <Spin
        spinning={isLoading}
        tip={loadingTip}
      >
        <div className="h-screen flex flex-col relative overflow-hidden bg-white dark:bg-dark-400">
          <Header />
          <EmptyView />
          <MediaList />
        </div>
      </Spin>
    </ConfigProvider>
  )
}

function App() {
  return (
    <LoadingProvider>
      <AppContent />
    </LoadingProvider>
  )
}

export default App
