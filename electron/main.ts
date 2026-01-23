import path from 'node:path'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import * as electronNS from 'electron'
import './commands'

// @ts-ignore - Electron ESM exports are via default
const electron: typeof electronNS & { default: typeof electronNS } = electronNS as any
const { BrowserWindow, app } = electron.default

type BW = InstanceType<typeof BrowserWindow>

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BW | null

function createWindow() {
  // console.log('1', VITE_DEV_SERVER_URL)
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icon.svg'),
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs')
      // devTools: !!VITE_DEV_SERVER_URL, // 打开devtool
    }
  })

  // 启用右键可以打开开发者工具功能
  // win.webContents.on('context-menu', (event, params) => {
  //   win?.webContents.inspectElement(params.x, params.y)
  // })

  // Test active push message to Renderer-process.
  // win.webContents.on('did-finish-load', () => {
  //   win?.webContents.send('main-process-message', (new Date).toLocaleString())
  // })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // if (process.platform !== 'darwin') {
  app.quit()
  win = null
  // }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
