import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { useEnergyStore } from '../store/useEnergyStore'
import type { WindowKey } from '@shared/types'

interface Props {
  onNavigate?: (key: WindowKey) => void
}

export default function OverviewWindow({ onNavigate }: Props) {
  const state = useEnergyStore()
  const currentHour = new Date().getHours()
  const nowLoad = state.loadForecast[currentHour]?.electricity ?? 0
  const loadPercent = Math.min(100, (state.todayTotalLoad / (state.demandRedLine * 24)) * 100)
  const nowPercent = Math.min(100, (nowLoad / state.demandRedLine) * 100)

  const loadChartData = useMemo(() => {
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`)
    const forecast = state.loadForecast.map((f) => f.electricity)
    const redLine = Array(24).fill(state.demandRedLine)
    return {
      labels,
      datasets: [
        {
          type: 'line' as const,
          label: '预计负荷 (kW)',
          data: forecast,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
        },
        {
          type: 'line' as const,
          label: '需量红线 (kW)',
          data: redLine,
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          pointRadius: 0,
          borderWidth: 2,
          fill: false,
        },
      ],
    }
  }, [state.loadForecast, state.demandRedLine])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1,
        titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10, cornerRadius: 6,
      },
    },
    scales: {
      x: { grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 } },
      y: { grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true },
    },
  }

  const criticalAlerts = state.alerts.filter((a) => a.level === 'critical' && !a.resolved).length
  const warningAlerts = state.alerts.filter((a) => a.level === 'warning' && !a.resolved).length

  const statusText = { running: '运行中', idle: '空闲', maintenance: '维护', offline: '离线' }
  const statusClass = {
    running: 'status-dot status-running',
    idle: 'status-dot status-idle',
    maintenance: 'status-dot status-maintenance',
    offline: 'status-dot status-offline',
  }

  return (
    <div className="grid grid-2" style={{ gridTemplateRows: 'auto 1fr', gap: 12 }}>
      <div className="grid grid-4">
        <div className="metric-card" style={{ borderColor: nowPercent > 90 ? 'var(--accent-red)' : 'var(--accent-blue)' }}>
          <div className="metric-label">⚡ 当前用电负荷</div>
          <div className="metric-value">
            {nowLoad.toFixed(0)}<span className="metric-unit">kW</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${nowPercent}%`,
                background: nowPercent > 90 ? 'var(--accent-red)' : nowPercent > 75 ? 'var(--accent-yellow)' : 'var(--accent-green)',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>红线 {state.demandRedLine}kW</span>
            <span style={{ color: nowPercent > 90 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{nowPercent.toFixed(1)}%</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">🔋 今日累计用电</div>
          <div className="metric-value">
            {state.todayTotalLoad.toFixed(0)}<span className="metric-unit">kWh</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${loadPercent}%`, background: 'var(--accent-blue)' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>日预算 {(state.demandRedLine * 24).toFixed(0)}kWh</span>
            <span>{loadPercent.toFixed(1)}%</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">💵 当前时段电价</div>
          <div className="metric-value">
            ¥{state.energyPrice.electricity[currentHour]?.toFixed(2) ?? '--'}
            <span className="metric-unit">/kWh</span>
          </div>
          <div className="metric-trend trend-neutral">
            {state.energyPrice.peakHours[0] <= currentHour && currentHour < state.energyPrice.peakHours[1] ? (
              <><span className="tag tag-red">尖峰时段</span></>
            ) : state.energyPrice.valleyHours[0] <= currentHour || currentHour < state.energyPrice.valleyHours[1] ? (
              <><span className="tag tag-green">谷段时段</span></>
            ) : (
              <><span className="tag tag-yellow">平段时段</span></>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            蒸汽 ¥{state.energyPrice.steam}/吨 · 压空 ¥{state.energyPrice.compressedAir}/m³
          </div>
        </div>

        <div className="metric-card" style={{ cursor: onNavigate ? 'pointer' : 'default' }} onClick={() => onNavigate?.('alerts')}>
          <div className="metric-label">⚠️ 未处理告警</div>
          <div className="metric-value">
            {criticalAlerts + warningAlerts}<span className="metric-unit">条</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {criticalAlerts > 0 && <span className="tag tag-red">紧急 {criticalAlerts}</span>}
            {warningAlerts > 0 && <span className="tag tag-yellow">警告 {warningAlerts}</span>}
            {criticalAlerts + warningAlerts === 0 && <span className="tag tag-green">全部正常</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            总记录 {state.alerts.length} 条，已处理 {state.alerts.filter((a) => a.resolved).length} 条
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ minHeight: 0 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📈 24小时负荷预测曲线</div>
              <div className="card-subtitle">当前时间 {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => onNavigate?.('forecast')}>查看详情 →</button>
          </div>
          <div style={{ height: 200 }}>
            <Line data={loadChartData} options={chartOptions} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
            <span>高峰: {state.energyPrice.peakHours[0]}:00-{state.energyPrice.peakHours[1]}:00</span>
            <span>谷段: {state.energyPrice.valleyHours[0]}:00-{state.energyPrice.valleyHours[1]}:00</span>
            <button className="btn btn-sm" onClick={() => onNavigate?.('schedule')}>去排程 →</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🏭 车间运行状态</div>
              <div className="card-subtitle">共 {state.workshops.length} 个车间</div>
            </div>
            <button className="btn btn-sm" onClick={() => onNavigate?.('production')}>产线管理 →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.workshops.map((ws) => {
              const loadRate = (ws.currentLoad / ws.maxLoad) * 100
              return (
                <div key={ws.id} style={{ padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={statusClass[ws.status]} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{ws.name}</span>
                      <span className={`tag ${ws.status === 'running' ? 'tag-green' : ws.status === 'idle' ? 'tag-yellow' : ws.status === 'maintenance' ? 'tag-purple' : 'tag-gray'}`}>
                        {statusText[ws.status]}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: ws.efficiency >= 85 ? 'var(--accent-green)' : ws.efficiency >= 75 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                      效率 {ws.efficiency}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${loadRate}%`,
                          background: loadRate > 90 ? 'var(--accent-red)' : loadRate > 70 ? 'var(--accent-yellow)' : 'var(--accent-green)',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 90, textAlign: 'right' }}>
                      {ws.currentLoad}/{ws.maxLoad} kW ({loadRate.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
