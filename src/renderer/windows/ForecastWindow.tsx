import { useMemo } from 'react'
import { Chart } from 'react-chartjs-2'
import { useEnergyStore } from '../store/useEnergyStore'
import type { WindowKey } from '@shared/types'

interface Props {
  onNavigate?: (key: WindowKey) => void
}

export default function ForecastWindow({ onNavigate }: Props) {
  const state = useEnergyStore()

  const energyChartData = useMemo(() => {
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`)
    return {
      labels,
      datasets: [
        {
          type: 'line' as const,
          label: '电 (kW)',
          data: state.loadForecast.map((f) => f.electricity),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.12)',
          yAxisID: 'y',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          type: 'bar' as const,
          label: '蒸汽 (kg/h×10)',
          data: state.loadForecast.map((f) => f.steam),
          backgroundColor: 'rgba(249,115,22,0.6)',
          borderColor: '#f97316',
          yAxisID: 'y1',
          borderRadius: 2,
          barThickness: 8,
        },
        {
          type: 'bar' as const,
          label: '压空 (m³/h×10)',
          data: state.loadForecast.map((f) => f.compressedAir),
          backgroundColor: 'rgba(139,92,246,0.6)',
          borderColor: '#8b5cf6',
          yAxisID: 'y1',
          borderRadius: 2,
          barThickness: 8,
        },
      ],
    }
  }, [state.loadForecast])

  const historyData = useMemo(() => {
    const days = ['6/8', '6/9', '6/10', '6/11', '6/12', '6/13', '今日']
    return {
      labels: days,
      datasets: [
        {
          label: '实际产量 (件)',
          data: [1280, 1350, 1120, 1420, 1380, 1300, 1356],
          backgroundColor: 'rgba(59,130,246,0.7)',
          borderRadius: 4,
        },
        {
          label: '实际电耗 (kWh×10)',
          data: [1920, 2050, 1880, 2315, 1892, 2156, 2080],
          type: 'line' as const,
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          yAxisID: 'y1',
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
        },
      ],
    }
  }, [])

  const energyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, usePointStyle: true } },
      tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10, cornerRadius: 6 },
    },
    scales: {
      x: { grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 } },
      y: { position: 'left' as const, grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#3b82f6', font: { size: 10 } }, beginAtZero: true, title: { display: true, text: '电力 (kW)', color: '#3b82f6', font: { size: 10 } } },
      y1: { position: 'right' as const, grid: { drawOnChartArea: false }, ticks: { color: '#f97316', font: { size: 10 } }, beginAtZero: true, title: { display: true, text: '蒸汽/压空', color: '#f97316', font: { size: 10 } } },
    },
  }

  const historyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, usePointStyle: true } },
      tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10, cornerRadius: 6 },
    },
    scales: {
      x: { grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#64748b', font: { size: 11 } } },
      y: { position: 'left' as const, grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#3b82f6', font: { size: 10 } }, beginAtZero: true },
      y1: { position: 'right' as const, grid: { drawOnChartArea: false }, ticks: { color: '#10b981', font: { size: 10 } }, beginAtZero: true },
    },
  }

  const avgConfidence = (state.loadForecast.reduce((a, b) => a + b.confidence, 0) / state.loadForecast.length * 100).toFixed(0)
  const totalKwh = state.loadForecast.reduce((a, b) => a + b.electricity, 0)
  const totalSteam = state.loadForecast.reduce((a, b) => a + b.steam, 0)
  const totalAir = state.loadForecast.reduce((a, b) => a + b.compressedAir, 0)
  const peakHour = state.loadForecast.reduce((a, b) => (b.electricity > a.electricity ? b : a)).hour
  const todayWeather = state.weather.find((w) => w.date === state.currentDate) ?? state.weather[3]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div className="grid grid-4">
        <div className="metric-card">
          <div className="metric-label">📊 预测模型置信度</div>
          <div className="metric-value">{avgConfidence}<span className="metric-unit">%</span></div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${avgConfidence}%`, background: Number(avgConfidence) >= 80 ? 'var(--accent-green)' : 'var(--accent-yellow)' }} /></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>基于近30天历史数据训练</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">⚡ 今日预测总电</div>
          <div className="metric-value">{totalKwh.toFixed(0)}<span className="metric-unit">kWh</span></div>
          <div className="metric-trend trend-up">预计峰值 {peakHour}:00 ({state.loadForecast[peakHour].electricity.toFixed(0)} kW)</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">🔥 蒸汽/压空需求</div>
          <div className="metric-value">{(totalSteam / 1000).toFixed(1)}<span className="metric-unit">吨汽</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>压空 {(totalAir).toFixed(0)} m³</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">🌤️ 今日天气因素</div>
          <div className="metric-value">{todayWeather.temperature.toFixed(0)}°C</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            湿度 {todayWeather.humidity.toFixed(0)}% · {todayWeather.isRainy ? '🌧️ 雨天(负荷+8%)' : '☀️ 晴(正常)'}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ flex: 1, minHeight: 0 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">📈 24小时多能源负荷预测</div>
              <div className="card-subtitle">电、蒸汽、压缩空气联合估算</div>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => onNavigate?.('schedule')}>生成排程 →</button>
          </div>
          <div style={{ flex: 1, minHeight: 180 }}>
            <Chart type="line" data={energyChartData as any} options={energyOptions} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { k: '生产班次', v: '早7-15 / 中15-23 / 夜23-7', c: 'tag-blue' },
              { k: '历史数据', v: '近30天', c: 'tag-green' },
              { k: '算法', v: 'XGBoost+ARIMA集成', c: 'tag-purple' },
              { k: '温度校正', v: `+${((todayWeather.temperature - 20) * 1.5).toFixed(1)}%`, c: 'tag-yellow' },
            ].map((x) => <span key={x.k} className={`tag ${x.c}`} style={{ fontSize: 11 }}>{x.k}：{x.v}</span>)}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">📋 近7日产量与电耗趋势</div>
              <div className="card-subtitle">单耗分析与基准对比</div>
            </div>
            <button className="btn btn-sm" onClick={() => onNavigate?.('review')}>历史复盘 →</button>
          </div>
          <div style={{ flex: 1, minHeight: 180 }}>
            <Chart type="bar" data={historyData as any} options={historyOptions} />
          </div>
          <div className="stat-row"><span className="stat-label">7天平均产量</span><span className="stat-value">{((1280 + 1350 + 1120 + 1420 + 1380 + 1300 + 1356) / 7).toFixed(0)} 件</span></div>
          <div className="stat-row"><span className="stat-label">平均单件电耗</span><span className="stat-value">1.56 kWh/件</span></div>
          <div className="stat-row"><span className="stat-label">行业基准</span><span className="stat-value" style={{ color: 'var(--accent-green)' }}>1.62 kWh/件（优于基准）</span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">🌡️ 近7日气象与负荷影响因子</div>
        <div className="card-subtitle" style={{ marginBottom: 10 }}>高温高湿天气将显著增加空调与制冷负荷</div>
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>气温</th>
              <th>湿度</th>
              <th>天气</th>
              <th>温度系数</th>
              <th>湿度系数</th>
              <th>综合校正</th>
            </tr>
          </thead>
          <tbody>
            {state.weather.map((w) => {
              const tFactor = 1 + Math.max(0, (w.temperature - 20)) * 0.015
              const hFactor = 1 + Math.max(0, (w.humidity - 60)) * 0.003
              const rFactor = w.isRainy ? 0.96 : 1
              const total = tFactor * hFactor * rFactor
              return (
                <tr key={w.date}>
                  <td>{w.date}</td>
                  <td style={{ color: w.temperature > 28 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{w.temperature.toFixed(1)}°C</td>
                  <td>{w.humidity.toFixed(0)}%</td>
                  <td>{w.isRainy ? '🌧️ 雨' : '☀️ 晴'}</td>
                  <td>×{tFactor.toFixed(3)}</td>
                  <td>×{hFactor.toFixed(3)}</td>
                  <td style={{ color: total > 1.05 ? 'var(--accent-red)' : total < 0.98 ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: 600 }}>
                    {total > 1 ? '+' : ''}{((total - 1) * 100).toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
