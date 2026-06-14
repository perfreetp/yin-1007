import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { setupStoreSync } from './store/useEnergyStore'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

declare global {
  interface Window {
    electronAPI?: {
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
  }
}

setupStoreSync()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
