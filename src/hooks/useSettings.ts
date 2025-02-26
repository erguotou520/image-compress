import { DEFAULT_QUALITY_KEY, PRIMARY_COLOR_KEY, SVG_VIEW_BOX_KEY, THEME_KEY, type Theme } from '@/constants'
import type { GlobalSettings } from '@/types'
import { create } from 'zustand'

interface SettingsStore {
  settings: GlobalSettings
  changeTheme: (theme: Theme) => void
  changePrimaryColor: (color: string) => void
  changeDefaultQuality: (quality: number | null) => void
  changeSettings: (settings: GlobalSettings) => void
  changeSvgViewBox: (viewbox: boolean) => void
}

const useSettings = create<SettingsStore>((set, get) => ({
  settings: {
    theme: (localStorage.getItem(THEME_KEY) as Theme | null) || 'light',
    primaryColor: localStorage.getItem(PRIMARY_COLOR_KEY) || '#1677ff',
    defaultQuality: Number(localStorage.getItem(DEFAULT_QUALITY_KEY) || 80),
    removeSVGViewBox: localStorage.getItem(SVG_VIEW_BOX_KEY) === 'true'
  },

  changeTheme: theme => {
    set({ settings: { ...get().settings, theme } })
    localStorage.setItem(THEME_KEY, theme)
  },

  changePrimaryColor: color => {
    set({ settings: { ...get().settings, primaryColor: color } })
    localStorage.setItem(PRIMARY_COLOR_KEY, color)
  },

  changeDefaultQuality: quality => {
    set({ settings: { ...get().settings, defaultQuality: quality || 80 } })
    localStorage.setItem(DEFAULT_QUALITY_KEY, String(quality))
  },

  changeSvgViewBox: removeViewBox => {
    set({ settings: { ...get().settings, removeSVGViewBox: removeViewBox } })
    localStorage.setItem(SVG_VIEW_BOX_KEY, removeViewBox ? 'true' : 'false')
  },

  changeSettings: settings => {
    set({ settings })
    localStorage.setItem(THEME_KEY, settings.theme)
    localStorage.setItem(PRIMARY_COLOR_KEY, settings.primaryColor)
    localStorage.setItem(DEFAULT_QUALITY_KEY, String(settings.defaultQuality))
    localStorage.setItem(SVG_VIEW_BOX_KEY, settings.removeSVGViewBox ? 'true' : 'false')
  }
}))

export default useSettings
