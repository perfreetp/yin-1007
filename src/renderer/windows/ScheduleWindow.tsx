import { useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useEnergyStore } from '../store/useEnergyStore'
import type { WindowKey, ScheduleItem } from '@shared/types'

interface Props {
  onNavigate?: (key: WindowKey) => void
}

const LABEL_WIDTH = 160
const HOUR_WIDTH = 40
const ROW_HEIGHT = 44
const TOTAL_HOURS = 24

const TYPE_ORDER: ScheduleItem['type'][] = ['equipment', 'storage', 'boiler', 'compressor']
const TYPE_LABELS: Record<ScheduleItem['type'], string> = {
  equipment: '🔧 生产设备',
  storage: '🔋 储能系统',
  boiler: '🔥 蒸汽锅炉',
  compressor: '💨 空压机组',
}

export default function ScheduleWindow({ onNavigate }: Props) {
  const state = useEnergyStore()
  const [dragging, setDragging] = useState<{ id: string; startX: number; origStart: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showStoragePanel, setShowStoragePanel] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sortedSchedules = useMemo(() => {
    return [...state.schedules].sort((a, b) => {
      const ta = TYPE_ORDER.indexOf(a.type)
      const tb = TYPE_ORDER.indexOf(b.type)
      if (ta !== tb) return ta - tb
      return a.startHour - b.startHour
    })
  }, [state.schedules])

  const groupedSchedules = useMemo(() => {
    const groups = new Map<ScheduleItem['type'], ScheduleItem[]>()
    TYPE_ORDER.forEach((t) => groups.set(t, []))
    sortedSchedules.forEach((s) => groups.get(s.type)?.push(s))
    return groups
  }, [sortedSchedules])

  const loadCurve = useMemo(() => {
    const arr = new Array(TOTAL_HOURS).fill(0)
    state.schedules.forEach((s) => {
      const start = Math.max(0, Math.floor(s.startHour))
      const end = Math.min(TOTAL_HOURS, Math.ceil(s.endHour))
      const load = Math.max(0, s.power)
      for (let h = start; h < end; h++) {
        arr[h] += load
      }
    })
    return arr
  }, [state.schedules])

  const netCurve = useMemo(() => {
    const arr = new Array(TOTAL_HOURS).fill(0)
    state.schedules.forEach((s) => {
      const start = Math.max(0, Math.floor(s.startHour))
      const end = Math.min(TOTAL_HOURS, Math.ceil(s.endHour))
      for (let h = start; h < end; h++) {
        arr[h] += s.power
      }
    })
    const forecast = state.loadForecast.map((f) => f.electricity)
    return arr.map((v, i) => (forecast[i] || 0) * 0.6 + v * 0.4)
  }, [state.schedules, state.loadForecast])

  const chartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        type: 'line' as const,
        label: '综合负荷 (kW)',
        data: netCurve,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        type: 'line' as const,
        label: '需量红线',
        data: Array(24).fill(state.demandRedLine),
        borderColor: '#ef4444',
        borderDash: [6, 4],
        pointRadius: 0,
        borderWidth: 2,
        fill: false,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, usePointStyle: true } },
      tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10, cornerRadius: 6 },
    },
    scales: {
      x: { grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 } },
      y: { grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true },
    },
  }

  const peakLoad = Math.max(...netCurve)
  const totalKwh = netCurve.reduce((a, b) => a + b, 0)
  const overDemand = netCurve.some((v) => v > state.demandRedLine)
  const totalCost = netCurve.reduce((a, b, i) => a + b * state.energyPrice.electricity[i], 0)

  const onMouseDown = (e: React.MouseEvent, item: ScheduleItem) => {
    e.preventDefault()
    setDragging({ id: item.id, startX: e.clientX, origStart: item.startHour })
    setSelectedId(item.id)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragging.startX
    const deltaH = dx / HOUR_WIDTH
    const newStart = Math.max(0, Math.min(TOTAL_HOURS - 2, Math.round((dragging.origStart + deltaH) * 2) / 2))
    const item = state.schedules.find((s) => s.id === dragging.id)
    if (!item) return
    const duration = item.endHour - item.startHour
    const newEnd = Math.min(TOTAL_HOURS, newStart + duration)
    state.updateSchedule({ ...item, startHour: newStart, endHour: newEnd })
  }

  const onMouseUp = () => setDragging(null)

  const formatH = (h: number) => {
    const hr = Math.floor(h)
    const min = Math.round((h - hr) * 60)
    return `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

  const selectedItem = state.schedules.find((s) => s.id === selectedId)

  const removeSelected = () => {
    if (!selectedId) return
    state.removeSchedule(selectedId)
    setSelectedId(null)
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className="toolbar">
        <span className="toolbar-title">📅 拖拽排程工作台</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="legend-item"><span className="swatch" style={{ background: '#3B82F6' }} />生产设备</span>
          <span className="legend-item"><span className="swatch" style={{ background: '#10B981' }} />充电</span>
          <span className="legend-item"><span className="swatch" style={{ background: '#F59E0B' }} />放电</span>
          <span className="legend-item"><span className="swatch" style={{ background: '#EF4444' }} />锅炉</span>
          <span className="legend-item"><span className="swatch" style={{ background: '#8B5CF6' }} />空压机</span>
        </div>
        <div className="toolbar-spacer" />
        <span className={`tag ${overDemand ? 'tag-red' : 'tag-green'}`}>峰值 {peakLoad.toFixed(0)}kW / 红线 {state.demandRedLine}kW</span>
        <span className="tag tag-blue">本日预估 ¥{totalCost.toFixed(0)}</span>
        <button className="btn btn-sm" onClick={() => setShowStoragePanel(!showStoragePanel)}>🔋 储能控制</button>
        <button className="btn btn-sm btn-primary" onClick={() => onNavigate?.('cost')}>成本对比 →</button>
      </div>

      <div className="grid grid-4" style={{ flexShrink: 0 }}>
        <div className="metric-card">
          <div className="metric-label">⚡ 排程后峰值负荷</div>
          <div className="metric-value" style={{ color: overDemand ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {peakLoad.toFixed(0)}<span className="metric-unit">kW</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {overDemand ? `超限 ${(peakLoad - state.demandRedLine).toFixed(0)} kW，需调整` : `安全裕量 ${(state.demandRedLine - peakLoad).toFixed(0)} kW`}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">🔋 总耗电量</div>
          <div className="metric-value">{totalKwh.toFixed(0)}<span className="metric-unit">kWh</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>含储能净放电 {state.storageSchedules.reduce((a, b) => a + (b.dischargeEnd - b.dischargeStart) * 300, 0)}kWh</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">💵 预估电费</div>
          <div className="metric-value">¥{totalCost.toFixed(0)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>蒸汽 ¥{state.energyPrice.steam * 8} · 压空 ¥{(state.energyPrice.compressedAir * 1800).toFixed(0)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">📊 排程任务数</div>
          <div className="metric-value">{state.schedules.length}<span className="metric-unit">项</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            设备 {state.schedules.filter((s) => s.type === 'equipment').length} · 储能 {state.schedules.filter((s) => s.type === 'storage').length} · 锅炉/空压 {state.schedules.filter((s) => s.type === 'boiler' || s.type === 'compressor').length}
          </div>
        </div>
      </div>

      {showStoragePanel && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔋 储能系统调度（两组电池）</div>
            <button className="btn btn-sm" onClick={() => setShowStoragePanel(false)}>收起</button>
          </div>
          <div className="grid grid-2">
            {state.storageSchedules.map((st, idx) => (
              <div key={st.id} style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600 }}>储能组 #{idx + 1}</span>
                  <span className="tag tag-green">容量 {st.capacity} kWh</span>
                </div>
                <div className="form-row"><label>谷段充电</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="number" min={0} max={24} value={st.chargeStart} style={{ width: 80 }}
                      onChange={(e) => state.updateStorageSchedule({ ...st, chargeStart: Math.max(0, Math.min(24, Number(e.target.value))) })} />
                    <span>—</span>
                    <input type="number" min={0} max={24} value={st.chargeEnd} style={{ width: 80 }}
                      onChange={(e) => state.updateStorageSchedule({ ...st, chargeEnd: Math.max(0, Math.min(24, Number(e.target.value))) })} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>时</span>
                  </div>
                </div>
                <div className="form-row"><label>尖峰放电</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="number" min={0} max={24} value={st.dischargeStart} style={{ width: 80 }}
                      onChange={(e) => state.updateStorageSchedule({ ...st, dischargeStart: Math.max(0, Math.min(24, Number(e.target.value))) })} />
                    <span>—</span>
                    <input type="number" min={0} max={24} value={st.dischargeEnd} style={{ width: 80 }}
                      onChange={(e) => state.updateStorageSchedule({ ...st, dischargeEnd: Math.max(0, Math.min(24, Number(e.target.value))) })} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>时</span>
                  </div>
                </div>
                <div className="stat-row"><span className="stat-label">当前电量SOC</span><span className="stat-value">{((st.currentLevel / st.capacity) * 100).toFixed(0)}% ({st.currentLevel}kWh)</span></div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${(st.currentLevel / st.capacity) * 100}%`, background: 'var(--accent-green)' }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '10px 14px' }}>
          <div>
            <div className="card-title">甘特图拖拽区（按住左键拖动任务块）</div>
            <div className="card-subtitle">红色虚线为需量红线，青线为当前时间</div>
          </div>
          {selectedItem && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="tag tag-blue">
                {selectedItem.name} · {formatH(selectedItem.startHour)}-{formatH(selectedItem.endHour)} · {Math.abs(selectedItem.power)}kW
              </span>
              <button className="btn btn-sm btn-danger" onClick={removeSelected}>删除</button>
            </div>
          )}
        </div>

        <div ref={scrollRef} className="gantt-container" style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `${LABEL_WIDTH}px repeat(${TOTAL_HOURS}, ${HOUR_WIDTH}px)`, width: LABEL_WIDTH + TOTAL_HOURS * HOUR_WIDTH }}>
            <div className="gantt-header-cell" style={{ position: 'sticky', left: 0, background: 'var(--bg-tertiary)', zIndex: 20, textAlign: 'left', paddingLeft: 12 }}>资源 / 时段</div>
            {Array.from({ length: TOTAL_HOURS }, (_, h) => {
              const isPeak = h >= state.energyPrice.peakHours[0] && h < state.energyPrice.peakHours[1]
              const isValley = h >= state.energyPrice.valleyHours[0] || h < state.energyPrice.valleyHours[1]
              return (
                <div key={h} className={`gantt-header-cell ${isPeak ? 'peak' : isValley ? 'valley' : ''}`}>
                  {h}:00
                  <div style={{ fontSize: 9, marginTop: 2, color: 'var(--text-muted)' }}>¥{state.energyPrice.electricity[h].toFixed(2)}</div>
                </div>
              )
            })}

            {Array.from(groupedSchedules.entries()).map(([type, items]) => (
              <div key={type} style={{ display: 'contents' }}>
                <div style={{
                  gridColumn: `1 / ${TOTAL_HOURS + 2}`,
                  padding: '6px 12px',
                  background: 'var(--bg-tertiary)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  {TYPE_LABELS[type]}
                  <span style={{ fontSize: 11, fontWeight: 400 }}>· {items.length}项</span>
                </div>

                {items.length === 0 ? (
                  <div style={{ gridColumn: `1 / ${TOTAL_HOURS + 2}`, padding: '14px 20px', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    暂无排程项，点击上方"新增排程"添加
                  </div>
                ) : (
                  items.map((item, rowIdx) => (
                    <div key={item.id + rowIdx} className="gantt-row" style={{ gridTemplateColumns: `subgrid` }}>
                      <div className="gantt-label" title={item.name} style={{ minHeight: ROW_HEIGHT, display: 'flex', alignItems: 'center' }}>
                        {item.name}
                        <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                          {Math.abs(item.power)}kW
                        </span>
                      </div>
                      {Array.from({ length: TOTAL_HOURS }, (_, h) => (
                        <div key={h} className="gantt-track" style={{ height: ROW_HEIGHT, position: 'relative' }}>
                          {h === state.energyPrice.peakHours[0] && (
                            <div className="gantt-red-line" style={{ left: 0 }} />
                          )}
                          {h === new Date().getHours() && (
                            <div className="now-line" style={{ left: `${HOUR_WIDTH * (new Date().getMinutes() / 60)}px` }} />
                          )}
                        </div>
                      ))}
                      <div
                        className={`gantt-bar ${dragging?.id === item.id ? 'dragging' : ''}`}
                        style={{
                          gridColumn: '2 / -1',
                          position: 'absolute',
                          left: LABEL_WIDTH + item.startHour * HOUR_WIDTH + 2,
                          width: Math.max(HOUR_WIDTH * 0.6, (item.endHour - item.startHour) * HOUR_WIDTH - 4),
                          top: rowIdx === 0 ? 4 : undefined,
                          background: item.color,
                          opacity: selectedId && selectedId !== item.id ? 0.6 : 1,
                          outline: selectedId === item.id ? '2px solid #fff' : 'none',
                        }}
                        onMouseDown={(e) => onMouseDown(e, item)}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <span style={{ fontSize: 11, fontWeight: 500 }}>
                          {formatH(item.startHour)}–{formatH(item.endHour)}
                          {item.type === 'storage' ? (item.power < 0 ? ' 充' : ' 放') : ''}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ flexShrink: 0 }}>
        <div className="card-header">
          <div className="card-title">📈 排程后负荷曲线预览</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => onNavigate?.('alerts')}>⚠️ 查看告警</button>
            <button className="btn btn-sm btn-success" onClick={() => onNavigate?.('review')}>✅ 保存排程方案</button>
          </div>
        </div>
        <div style={{ height: 160 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  )
}
