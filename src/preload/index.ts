import { contextBridge, ipcRenderer } from 'electron'

export interface IElectronAPI {
  focusWindow: (key: string) => Promise<void>
  listWindows: () => Promise<{ key: string; title: string }[]>
  sendData: (channel: string, data: unknown) => void
  onData: (channel: string, callback: (data: unknown) => void) => () => void
  getCurrentWindow: () => string | null
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
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
