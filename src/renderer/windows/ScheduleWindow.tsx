import { useMemo, useRef, useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import { useEnergyStore } from '../store/useEnergyStore'
import type { WindowKey, ScheduleItem } from '@shared/types'

interface Props {
  onNavigate?: (key: WindowKey) => void
}

const LABEL_WIDTH = 170
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
  const [showPlanPanel, setShowPlanPanel] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [publishPublisher, setPublishPublisher] = useState('')
  const [planName, setPlanName] = useState('')
  const [planNote, setPlanNote] = useState('')
  const [localCompareIds, setLocalCompareIds] = useState<[string, string] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.uiState.comparePlanIds && !localCompareIds) {
      setLocalCompareIds(state.uiState.comparePlanIds)
    }
  }, [state.uiState.comparePlanIds])

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
      for (let h = start; h < end; h++) arr[h] += load
    })
    return arr
  }, [state.schedules])

  const netCurve = useMemo(() => {
    const arr = new Array(TOTAL_HOURS).fill(0)
    state.schedules.forEach((s) => {
      const start = Math.max(0, Math.floor(s.startHour))
      const end = Math.min(TOTAL_HOURS, Math.ceil(s.endHour))
      for (let h = start; h < end; h++) arr[h] += s.power
    })
    const forecast = state.loadForecast.map((f) => f.electricity)
    return arr.map((v, i) => (forecast[i] || 0) * 0.6 + v * 0.4)
  }, [state.schedules, state.loadForecast])

  const storageBenefit = useMemo(() => {
    return state.storageSchedules.map((st, idx) => {
      const chargeCost = Array.from({ length: 24 }, (_, h) => {
        if (h >= Math.floor(st.chargeStart) && h < Math.ceil(st.chargeEnd)) {
          return (state.energyPrice.electricity[h] || 0) * 500
        }
        return 0
      }).reduce((a, b) => a + b, 0)
      const dischargeValue = Array.from({ length: 24 }, (_, h) => {
        if (h >= Math.floor(st.dischargeStart) && h < Math.ceil(st.dischargeEnd)) {
          return (state.energyPrice.electricity[h] || 0) * 400
        }
        return 0
      }).reduce((a, b) => a + b, 0)
      return {
        idx,
        chargeKwh: (st.chargeEnd - st.chargeStart) * 500,
        dischargeKwh: (st.dischargeEnd - st.dischargeStart) * 400,
        chargeCost: Math.round(chargeCost),
        dischargeValue: Math.round(dischargeValue),
        profit: Math.round(dischargeValue - chargeCost),
      }
    })
  }, [state.storageSchedules, state.energyPrice])

  const totalStorageProfit = storageBenefit.reduce((a, b) => a + b.profit, 0)

  const compareDiff = useMemo(() => {
    const ids = localCompareIds
    if (!ids || !ids[0] || !ids[1]) return null
    const planA = state.savedPlans.find((p) => p.id === ids[0])
    const planB = state.savedPlans.find((p) => p.id === ids[1])
    if (!planA || !planB) return null
    const diffItems: { name: string; type: string; field: string; aVal: string; bVal: string }[] = []
    const allIds = new Set([...planA.schedules.map((s) => s.id), ...planB.schedules.map((s) => s.id)])
    allIds.forEach((id) => {
      const a = planA.schedules.find((s) => s.id === id)
      const b = planB.schedules.find((s) => s.id === id)
      if (!a && b) diffItems.push({ name: b.name, type: b.type, field: '新增', aVal: '-', bVal: `${fmtH(b.startHour)}-${fmtH(b.endHour)}` })
      else if (a && !b) diffItems.push({ name: a.name, type: a.type, field: '移除', aVal: `${fmtH(a.startHour)}-${fmtH(a.endHour)}`, bVal: '-' })
      else if (a && b) {
        if (a.startHour !== b.startHour || a.endHour !== b.endHour)
          diffItems.push({ name: a.name, type: a.type, field: '时段变更', aVal: `${fmtH(a.startHour)}-${fmtH(a.endHour)}`, bVal: `${fmtH(b.startHour)}-${fmtH(b.endHour)}` })
        if (a.power !== b.power)
          diffItems.push({ name: a.name, type: a.type, field: '功率变更', aVal: `${a.power}kW`, bVal: `${b.power}kW` })
      }
    })
    const curveA = new Array(24).fill(0)
    const curveB = new Array(24).fill(0)
    planA.schedules.forEach((s) => { for (let h = Math.max(0, Math.floor(s.startHour)); h < Math.min(24, Math.ceil(s.endHour)); h++) curveA[h] += s.power })
    planB.schedules.forEach((s) => { for (let h = Math.max(0, Math.floor(s.startHour)); h < Math.min(24, Math.ceil(s.endHour)); h++) curveB[h] += s.power })
    return { diffItems, curveA, curveB, planA, planB }
  }, [localCompareIds, state.savedPlans])

  const chartData = useMemo(() => {
    if (compareDiff) {
      return {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [
          {
            type: 'line' as const, label: `${compareDiff.planA.name} 负荷`, data: compareDiff.curveA,
            borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: false, tension: 0.35, pointRadius: 0, borderWidth: 2,
          },
          {
            type: 'line' as const, label: `${compareDiff.planB.name} 负荷`, data: compareDiff.curveB,
            borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', fill: false, tension: 0.35, pointRadius: 0, borderWidth: 2,
          },
          {
            type: 'bar' as const, label: '差异', data: compareDiff.curveB.map((v, i) => v - compareDiff.curveA[i]),
            backgroundColor: compareDiff.curveB.map((v, i) => v - compareDiff.curveA[i] > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'),
            borderRadius: 2,
          },
          {
            type: 'line' as const, label: '需量红线', data: Array(24).fill(state.demandRedLine),
            borderColor: '#ef4444', borderDash: [6, 4], pointRadius: 0, borderWidth: 2, fill: false,
          },
        ],
      }
    }
    return {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          type: 'line' as const, label: '综合负荷 (kW)', data: netCurve,
          borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2,
        },
        {
          type: 'line' as const, label: '需量红线', data: Array(24).fill(state.demandRedLine),
          borderColor: '#ef4444', borderDash: [6, 4], pointRadius: 0, borderWidth: 2, fill: false,
        },
      ],
    }
  }, [netCurve, state.demandRedLine, compareDiff])

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

  function fmtH(h: number) {
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

  const activePlan = state.savedPlans.find((p) => p.id === state.activePlanId)
  const publishedPlan = state.savedPlans.find((p) => p.id === state.publishedPlanId)

  const handlePublish = (planId: string) => {
    if (!publishPublisher.trim()) return alert('请输入发布人姓名')
    state.publishPlan(planId, publishPublisher.trim())
    setShowPublishDialog(false)
    setPublishPublisher('')
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
        {publishedPlan && (
          <span className="tag tag-green" title={`由 ${publishedPlan.publishedBy || '-'} 于 ${publishedPlan.publishedAt ? new Date(publishedPlan.publishedAt).toLocaleString('zh-CN') : '-'}`}>
            🚀 执行版：{publishedPlan.name}
          </span>
        )}
        {activePlan && <span className="tag tag-blue">📋 {activePlan.name}</span>}
        <span className={`tag ${overDemand ? 'tag-red' : 'tag-green'}`}>峰值 {peakLoad.toFixed(0)}kW / 红线 {state.demandRedLine}kW</span>
        <span className="tag tag-blue">本日预估 ¥{totalCost.toFixed(0)}</span>
        {totalStorageProfit > 0 && <span className="tag tag-green">🔋储能收益 ¥{totalStorageProfit}</span>}
        <button className="btn btn-sm" onClick={() => setShowStoragePanel(!showStoragePanel)}>🔋 储能控制</button>
        <button className="btn btn-sm" onClick={() => setShowPlanPanel(!showPlanPanel)}>📋 方案管理</button>
        {activePlan && (
          <button className="btn btn-sm btn-success" onClick={() => { setShowPublishDialog(true); setPublishPublisher('') }}>🚀 发布执行版</button>
        )}
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
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>含储能净放电 {state.storageSchedules.reduce((a, b) => a + (b.dischargeEnd - b.dischargeStart) * 300, 0).toFixed(0)}kWh</div>
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
            <div className="card-title">🔋 储能系统调度（两组电池分别控制，实时联动甘特图/负荷/成本）</div>
            <button className="btn btn-sm" onClick={() => setShowStoragePanel(false)}>收起</button>
          </div>
          <div className="grid grid-2">
            {state.storageSchedules.map((st, idx) => {
              const ben = storageBenefit[idx]
              return (
                <div key={st.id} style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>储能组 #{idx + 1}</span>
                      <span className="tag tag-green" style={{ marginLeft: 8 }}>容量 {st.capacity} kWh</span>
                      {ben && <span className="tag" style={{ marginLeft: 6, background: ben.profit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: ben.profit >= 0 ? '#10B981' : '#ef4444', border: `1px solid ${ben.profit >= 0 ? '#10B981' : '#ef4444'}44` }}>
                        💰 收益 ¥{ben.profit}
                      </span>}
                    </div>
                  </div>
                  <div className="form-row"><label>充电时段（谷段，-500kW）</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="number" min={0} max={24} step={0.5} value={st.chargeStart} style={{ width: 80 }}
                        onChange={(e) => state.updateStorageSchedule({ ...st, chargeStart: Math.max(0, Math.min(24, Number(e.target.value))) })} />
                      <span>—</span>
                      <input type="number" min={0} max={24} step={0.5} value={st.chargeEnd} style={{ width: 80 }}
                        onChange={(e) => state.updateStorageSchedule({ ...st, chargeEnd: Math.max(0, Math.min(24, Number(e.target.value))) })} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>时</span>
                      <span className="tag tag-green" style={{ marginLeft: 6, fontSize: 10 }}>
                        充电 {ben?.chargeKwh}kWh / ¥{ben?.chargeCost}
                      </span>
                    </div>
                  </div>
                  <div className="form-row"><label>放电时段（尖峰，+400kW）</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="number" min={0} max={24} step={0.5} value={st.dischargeStart} style={{ width: 80 }}
                        onChange={(e) => state.updateStorageSchedule({ ...st, dischargeStart: Math.max(0, Math.min(24, Number(e.target.value))) })} />
                      <span>—</span>
                      <input type="number" min={0} max={24} step={0.5} value={st.dischargeEnd} style={{ width: 80 }}
                        onChange={(e) => state.updateStorageSchedule({ ...st, dischargeEnd: Math.max(0, Math.min(24, Number(e.target.value))) })} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>时</span>
                      <span className="tag tag-yellow" style={{ marginLeft: 6, fontSize: 10 }}>
                        放电 {ben?.dischargeKwh}kWh / ¥{ben?.dischargeValue}
                      </span>
                    </div>
                  </div>
                  <div className="stat-row"><span className="stat-label">当前SOC</span><span className="stat-value">{((st.currentLevel / st.capacity) * 100).toFixed(0)}% ({st.currentLevel}kWh)</span></div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${(st.currentLevel / st.capacity) * 100}%`, background: 'var(--accent-green)' }} /></div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {state.schedules.filter((s) => s.type === 'storage' && s.storageGroupIdx === idx).map((s) => (
                      <span key={s.id} className="tag" style={{ fontSize: 10, background: s.color + '22', color: s.color, border: `1px solid ${s.color}44` }}>
                        {s.power < 0 ? '🔋 充' : '⚡ 放'} {s.name}: {fmtH(s.startHour)}–{fmtH(s.endHour)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showPlanPanel && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 方案版本管理（保存快照、加载对比、发布执行版）</div>
            <button className="btn btn-sm" onClick={() => setShowPlanPanel(false)}>收起</button>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 400 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-primary" onClick={() => { setPlanName(`方案_${state.savedPlans.length + 1}`); setPlanNote(''); setShowSaveDialog(true) }}>💾 另存当前方案</button>
                <button className="btn btn-sm" onClick={() => { setLocalCompareIds(null); state.setComparePlanIds(null) }} disabled={!localCompareIds}>退出对比</button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                  {localCompareIds ? `已选对比：[${localCompareIds[0].slice(-5)}] vs [${localCompareIds[1] ? localCompareIds[1].slice(-5) : '？'}]` : '点击任意方案的「对比」开始选择两版对比'}
                </span>
              </div>
              {state.savedPlans.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  尚未保存方案快照，调整完排程后点击「另存当前方案」
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {state.savedPlans.map((p) => (
                    <div key={p.id} style={{
                      padding: '10px 12px',
                      background: state.activePlanId === p.id ? 'rgba(59,130,246,0.15)' : 'var(--bg-primary)',
                      border: `1px solid ${state.publishedPlanId === p.id ? 'var(--accent-green)' : state.activePlanId === p.id ? 'var(--accent-blue)' : 'var(--border)'}`,
                      borderRadius: 8, minWidth: 180, cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                        {state.publishedPlanId === p.id && <span className="tag tag-green" style={{ fontSize: 9 }}>🚀 执行版</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {new Date(p.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {p.note && ` · ${p.note.slice(0, 15)}`}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        费用 ¥{p.costSnapshot.totalCost.toLocaleString()} · 峰值 {p.costSnapshot.peakDemand}kW
                      </div>
                      {p.publishedAt > 0 && (
                        <div style={{ fontSize: 9, color: 'var(--accent-green)', marginBottom: 6 }}>
                          发布：{p.publishedBy} · {new Date(p.publishedAt).toLocaleDateString('zh-CN')}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm" style={{ fontSize: 10, padding: '2px 6px' }}
                          onClick={() => state.loadPlan(p.id)}>加载</button>
                        <button className="btn btn-sm" style={{ fontSize: 10, padding: '2px 6px' }}
                          onClick={() => {
                            const next: [string, string] = localCompareIds
                              ? (localCompareIds[0] ? (localCompareIds[1] ? [p.id, ''] : [localCompareIds[0], p.id]) : [p.id, ''])
                              : [p.id, '']
                            setLocalCompareIds(next)
                            if (next[0] && next[1]) state.setComparePlanIds(next)
                          }}>{localCompareIds && !localCompareIds[1] && localCompareIds[0] !== p.id ? '作为对比' : '对比'}</button>
                        <button className="btn btn-sm btn-success" style={{ fontSize: 10, padding: '2px 6px' }}
                          onClick={() => { state.loadPlan(p.id); setShowPublishDialog(true); setPublishPublisher('') }}>🚀发布</button>
                        <button className="btn btn-sm btn-danger" style={{ fontSize: 10, padding: '2px 6px' }}
                          onClick={() => { state.deletePlan(p.id); if (localCompareIds && (localCompareIds[0] === p.id || localCompareIds[1] === p.id)) { setLocalCompareIds(null); state.setComparePlanIds(null) } }}>删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {localCompareIds && localCompareIds[0] && localCompareIds[1] && compareDiff && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--accent-orange)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--accent-orange)' }}>
                    🔄 方案对比：{compareDiff.planA.name} ↔ {compareDiff.planB.name}
                  </div>
                  {compareDiff.diffItems.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>两版方案排程完全一致，无差异</div>
                  ) : (
                    <table style={{ width: '100%', fontSize: 11 }}>
                      <thead><tr><th>项目</th><th>类型</th><th>差异类型</th><th>{compareDiff.planA.name}</th><th>{compareDiff.planB.name}</th></tr></thead>
                      <tbody>
                        {compareDiff.diffItems.map((d, i) => (
                          <tr key={i}>
                            <td>{d.name}</td>
                            <td>{d.type}</td>
                            <td><span className={`tag ${d.field === '新增' ? 'tag-green' : d.field === '移除' ? 'tag-red' : 'tag-yellow'}`}>{d.field}</span></td>
                            <td>{d.aVal}</td>
                            <td style={{ color: d.aVal !== d.bVal ? 'var(--accent-orange)' : undefined }}>{d.bVal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '10px 14px' }}>
          <div>
            <div className="card-title">甘特图拖拽区（按住左键拖动任务块，储能充放电可单独拖动）</div>
            <div className="card-subtitle">红色虚线为需量红线，青线为当前时间{localCompareIds ? ' · 对比模式下橙色条为差异项' : ''}</div>
          </div>
          {selectedItem && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="tag tag-blue">
                {selectedItem.name} · {fmtH(selectedItem.startHour)}-{fmtH(selectedItem.endHour)} · {Math.abs(selectedItem.power)}kW
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
                    暂无排程项
                  </div>
                ) : (
                  items.map((item, rowIdx) => {
                    const isDiff = compareDiff && compareDiff.diffItems.some((d) => d.name === item.name)
                    return (
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
                            background: isDiff ? '#f97316' : item.color,
                            outline: isDiff ? '2px solid #f97316' : selectedId === item.id ? '2px solid #fff' : 'none',
                            opacity: selectedId && selectedId !== item.id ? 0.6 : 1,
                          }}
                          onMouseDown={(e) => onMouseDown(e, item)}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <span style={{ fontSize: 11, fontWeight: 500 }}>
                            {fmtH(item.startHour)}–{fmtH(item.endHour)}
                            {item.type === 'storage' ? (item.power < 0 ? ' 🔋充' : ' ⚡放') : ''}
                            {isDiff ? ' ⚡' : ''}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ flexShrink: 0 }}>
        <div className="card-header">
          <div className="card-title">📈 排程后负荷曲线预览{localCompareIds ? '（对比模式）' : ''}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => onNavigate?.('alerts')}>⚠️ 查看告警</button>
            <button className="btn btn-sm btn-success" onClick={() => { setPlanName(`方案_${state.savedPlans.length + 1}`); setPlanNote(''); setShowSaveDialog(true) }}>💾 保存排程方案</button>
          </div>
        </div>
        <div style={{ height: 160 }}>
          <Line data={chartData as any} options={chartOptions} />
        </div>
      </div>

      {showSaveDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            width: 420, background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div className="card-header" style={{ marginTop: -4 }}><div className="card-title">💾 另存方案快照</div></div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <label>方案名称 *</label>
              <input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="如：削峰填谷方案V2" />
            </div>
            <div className="form-row" style={{ marginTop: 8 }}>
              <label>备注说明</label>
              <textarea value={planNote} onChange={(e) => setPlanNote(e.target.value)} placeholder="记录方案调整要点、适用场景等..." style={{ minHeight: 60 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              将保存当前 {state.schedules.length} 项排程 + {state.storageSchedules.length} 组储能的完整快照，预估费用 ¥{totalCost.toFixed(0)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowSaveDialog(false)}>取消</button>
              <button className="btn btn-primary" disabled={!planName.trim()} onClick={() => {
                state.savePlan(planName.trim(), planNote)
                setShowSaveDialog(false)
                setShowPlanPanel(true)
              }}>保存方案</button>
            </div>
          </div>
        </div>
      )}

      {showPublishDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            width: 420, background: 'var(--bg-card)', border: '1px solid var(--accent-green)',
            borderRadius: 12, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div className="card-header" style={{ marginTop: -4 }}>
              <div className="card-title" style={{ color: 'var(--accent-green)' }}>🚀 发布为今日执行方案</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, padding: '8px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: 6 }}>
              发布后，总览窗、告警窗、成本窗和复盘窗将默认使用此方案数据。所有窗口将同步更新。
            </div>
            <div className="form-row" style={{ marginTop: 14 }}>
              <label>发布人姓名 *</label>
              <input value={publishPublisher} onChange={(e) => setPublishPublisher(e.target.value)} placeholder="如：张主管" />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              当前方案：{activePlan ? activePlan.name : publishedPlan ? publishedPlan.name : '（将使用当前已加载方案）'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowPublishDialog(false)}>取消</button>
              <button className="btn btn-success" disabled={!publishPublisher.trim()}
                onClick={() => handlePublish(activePlan?.id || publishedPlan?.id || state.savedPlans[0].id)}>
                确认发布执行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
