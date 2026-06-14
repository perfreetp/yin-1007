import { contextBridge, ipcRenderer } from 'electron'

export interface IElectronAPI {
  focusWindow: (key: string) => Promise<void>
  listWindows: () => Promise<{ key: string; title: string }[]>
  sendData: (channel: string, data: unknown) => void
  onData: (channel: string, callback: (data: unknown) => void) => () => void
  getCurrentWindow: () => string | null
  loadStore: () => Promise<unknown>
  sendStoreUpdate: (partial: unknown, full: unknown) => void
  onStoreSync: (callback: (partial: unknown) => void) => () => void
  onStoreReset: (callback: () => void) => () => void
  resetStore: () => void
}

const electronAPI: IElectronAPI = {
  focusWindow: (key) => ipcRenderer.invoke('window:focus', key),
  listWindows: () => ipcRenderer.invoke('window:list'),
  sendData: (channel, data) => ipcRenderer.send('data:update', { channel, data }),
  onData: (channel, callback) => {
    const listener = (_e: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
  getCurrentWindow: () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('window')
  },
  loadStore: () => ipcRenderer.invoke('store:load'),
  sendStoreUpdate: (partial, full) => ipcRenderer.send('store:update', { partial, full }),
  onStoreSync: (callback) => {
    const listener = (_e: Electron.IpcRendererEvent, partial: unknown) => callback(partial)
    ipcRenderer.on('store:sync', listener)
    return () => ipcRenderer.removeListener('store:sync', listener)
  },
  onStoreReset: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('store:reset', listener)
    return () => ipcRenderer.removeListener('store:reset', listener)
  },
  resetStore: () => ipcRenderer.send('store:reset'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
