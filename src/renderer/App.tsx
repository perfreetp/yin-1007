import { useEffect, useState } from 'react'
import OverviewWindow from './windows/OverviewWindow'
import ProductionWindow from './windows/ProductionWindow'
import ForecastWindow from './windows/ForecastWindow'
import ScheduleWindow from './windows/ScheduleWindow'
import AlertsWindow from './windows/AlertsWindow'
import CostWindow from './windows/CostWindow'
import ReviewWindow from './windows/ReviewWindow'
import type { WindowKey } from '@shared/types'

const WINDOW_TITLES: Record<WindowKey, string> = {
  overview: '总览窗 - 能源监控中心',
  production: '产线窗 - 班次与设备管理',
  forecast: '预测窗 - 智能负荷估算',
  schedule: '排程窗 - 拖拽调整中心',
  alerts: '告警窗 - 异常监控中心',
  cost: '成本窗 - 方案费用对比',
  review: '复盘窗 - 偏差与报表',
}

const WINDOW_ICONS: Record<WindowKey, string> = {
  overview: '📊',
  production: '🏭',
  forecast: '📈',
  schedule: '📅',
  alerts: '⚠️',
  cost: '💰',
  review: '📋',
}

export default function App() {
  const [currentWindow, setCurrentWindow] = useState<WindowKey>('overview')

  useEffect(() => {
    const key = window.electronAPI?.getCurrentWindow() as WindowKey | null
    if (key && Object.keys(WINDOW_TITLES).includes(key)) {
      setCurrentWindow(key)
      document.title = WINDOW_TITLES[key]
    }
  }, [])

  const focusWindow = async (key: WindowKey) => {
    if (window.electronAPI) {
      await window.electronAPI.focusWindow(key)
    }
  }

  const renderWindow = () => {
    switch (currentWindow) {
      case 'overview': return <OverviewWindow onNavigate={focusWindow} />
      case 'production': return <ProductionWindow onNavigate={focusWindow} />
      case 'forecast': return <ForecastWindow onNavigate={focusWindow} />
      case 'schedule': return <ScheduleWindow onNavigate={focusWindow} />
      case 'alerts': return <AlertsWindow onNavigate={focusWindow} />
      case 'cost': return <CostWindow onNavigate={focusWindow} />
      case 'review': return <ReviewWindow onNavigate={focusWindow} />
    }
  }

  return (
    <div className="app-container">
      <div className="window-header">
        <h1>
          <span>{WINDOW_ICONS[currentWindow]}</span>
          {WINDOW_TITLES[currentWindow]}
        </h1>
        <div className="window-nav">
          {(Object.keys(WINDOW_TITLES) as WindowKey[]).map((key) => (
            <button
              key={key}
              onClick={() => focusWindow(key)}
              style={key === currentWindow ? { background: 'var(--accent-blue)', color: 'white', borderColor: 'var(--accent-blue)' } : {}}
            >
              {WINDOW_ICONS[key]} {WINDOW_TITLES[key].split(' - ')[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="content-area">{renderWindow()}</div>
    </div>
  )
}
