import { app, BrowserWindow, ipcMain, screen } from 'electron'
import path from 'node:path'
import Store from 'electron-store'

process.env.DIST_ELECTRON = path.join(__dirname, '..')
process.env.DIST = path.join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

const preload = path.join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = path.join(process.env.DIST, 'index.html')

export type WindowKey = 'overview' | 'production' | 'forecast' | 'schedule' | 'alerts' | 'cost' | 'review'

interface WindowConfig {
  key: WindowKey
  title: string
  width: number
  height: number
  x: number
  y: number
}

const windows: Record<WindowKey, BrowserWindow | null> = {
  overview: null,
  production: null,
  forecast: null,
  schedule: null,
  alerts: null,
  cost: null,
  review: null,
}

const persistentStore = new Store({
  name: 'energy-scheduling-data',
  fileExtension: 'json',
  clearInvalidConfig: true,
})

const STORE_KEY = 'appStateV1'

function loadPersistedState(): unknown {
  try {
    return persistentStore.get(STORE_KEY) ?? null
  } catch {
    return null
  }
}

function savePersistedState(state: unknown) {
  try {
    persistentStore.set(STORE_KEY, state)
  } catch (e) {
    console.error('Failed to persist state:', e)
  }
}

function getWindowConfigs(): WindowConfig[] {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay
  const baseX = workArea.x
  const baseY = workArea.y
  const w = workArea.width
  const h = workArea.height

  const winW = Math.floor(w / 3 - 20)
  const winH = Math.floor(h / 3 - 20)

  return [
    { key: 'overview', title: '总览 - 能源监控中心', width: winW, height: winH, x: baseX + 10, y: baseY + 10 },
    { key: 'production', title: '产线管理 - 班次与设备', width: winW, height: winH, x: baseX + winW + 20, y: baseY + 10 },
    { key: 'forecast', title: '负荷预测 - 智能估算', width: winW, height: winH, x: baseX + winW * 2 + 30, y: baseY + 10 },
    { key: 'schedule', title: '排程中心 - 拖拽调整', width: winW * 2 + 20, height: winH, x: baseX + 10, y: baseY + winH + 30 },
    { key: 'alerts', title: '告警中心 - 异常监控', width: winW, height: winH, x: baseX + winW * 2 + 30, y: baseY + winH + 30 },
    { key: 'cost', title: '成本分析 - 方案对比', width: winW, height: winH, x: baseX + 10, y: baseY + winH * 2 + 50 },
    { key: 'review', title: '复盘报表 - 偏差分析', width: winW * 2 + 20, height: winH, x: baseX + winW + 20, y: baseY + winH * 2 + 50 },
  ]
}

function createWindow(config: WindowConfig): BrowserWindow {
  const win = new BrowserWindow({
    title: config.title,
    width: config.width,
    height: config.height,
    x: config.x,
    y: config.y,
    minWidth: 400,
    minHeight: 300,
    icon: path.join(process.env.VITE_PUBLIC || '', 'favicon.ico'),
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const loadUrl = `${url}?window=${config.key}`
  win.loadURL(loadUrl)

  win.on('closed', () => {
    windows[config.key] = null
  })

  return win
}

function createAllWindows() {
  const configs = getWindowConfigs()
  configs.forEach((config) => {
    if (!windows[config.key]) {
      windows[config.key] = createWindow(config)
    }
  })
}

function focusWindow(key: WindowKey) {
  const win = windows[key]
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
}

function broadcastData(channel: string, data: unknown, excludeWebContentsId?: number) {
  Object.keys(windows).forEach((key) => {
    const win = windows[key as WindowKey]
    if (win && win.webContents.id !== excludeWebContentsId) {
      win.webContents.send(channel, data)
    }
  })
}

app.whenReady().then(() => {
  createAllWindows()

  ipcMain.handle('window:focus', (_e, key: WindowKey) => {
    focusWindow(key)
  })

  ipcMain.handle('window:list', () => {
    return getWindowConfigs().map((c) => ({ key: c.key, title: c.title }))
  })

  ipcMain.handle('store:load', () => {
    return loadPersistedState()
  })

  ipcMain.on('store:update', (e, payload: { partial: unknown; full: unknown }) => {
    savePersistedState(payload.full)
    broadcastData('store:sync', payload.partial, e.sender.id)
  })

  ipcMain.on('store:reset', () => {
    persistentStore.delete(STORE_KEY)
    broadcastData('store:reset', null)
  })

  ipcMain.on('data:update', (e, payload: { channel: string; data: unknown }) => {
    broadcastData(payload.channel, payload.data, e.sender.id)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAllWindows()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
