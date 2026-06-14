import { useMemo, useState } from 'react'
import { Bar, Radar, Doughnut } from 'react-chartjs-2'
import { useEnergyStore } from '../store/useEnergyStore'
import type { CostPlan, WindowKey } from '@shared/types'

interface Props {
  onNavigate?: (key: WindowKey) => void
}

const RISK_LABELS: Record<CostPlan['riskLevel'], { text: string; cls: string }> = {
  low: { text: '低风险', cls: 'tag-green' },
  medium: { text: '中风险', cls: 'tag-yellow' },
  high: { text: '高风险', cls: 'tag-red' },
}

export default function CostWindow({ onNavigate }: Props) {
  const state = useEnergyStore()
  const [selectedId, setSelectedId] = useState<string>(state.selectedPlanId || state.costPlans[1].id)
  const [viewMode, setViewMode] = useState<'preset' | 'saved'>('preset')
  const publishedPlan = state.savedPlans.find((p) => p.id === state.publishedPlanId)

  const allPlans = useMemo(() => {
    if (viewMode === 'preset') return state.costPlans
    return state.savedPlans.map((p) => p.costSnapshot)
  }, [viewMode, state.costPlans, state.savedPlans])

  const baseline = allPlans[0]
  const selected = allPlans.find((p) => p.id === selectedId) || baseline

  const compareBarData = useMemo(() => ({
    labels: allPlans.map((p) => p.name.split('（')[0]),
    datasets: [
      { label: '电费 (¥)', data: allPlans.map((p) => p.electricityCost), backgroundColor: 'rgba(59,130,246,0.75)', borderRadius: 4, stack: 'cost' },
      { label: '蒸汽费 (¥)', data: allPlans.map((p) => p.steamCost), backgroundColor: 'rgba(249,115,22,0.75)', borderRadius: 4, stack: 'cost' },
      { label: '压空费 (¥)', data: allPlans.map((p) => p.airCost), backgroundColor: 'rgba(139,92,246,0.75)', borderRadius: 4, stack: 'cost' },
    ],
  }), [allPlans])

  const radarData = useMemo(() => ({
    labels: ['成本节约', '碳排降低', '风险控制', '峰值削减', '执行便利', '产能保障'],
    datasets: allPlans.map((p, i) => {
      const saveRate = ((baseline.totalCost - p.totalCost) / baseline.totalCost * 100)
      const saveCarb = ((baseline.carbonEmission - p.carbonEmission) / baseline.carbonEmission * 100)
      const riskScore = p.riskLevel === 'low' ? 90 : p.riskLevel === 'medium' ? 60 : 30
      const peakCut = ((baseline.peakDemand - p.peakDemand) / baseline.peakDemand * 100)
      const ease = p.riskLevel === 'low' ? 90 : p.riskLevel === 'medium' ? 70 : 40
      const capacity = p.riskLevel === 'low' ? 95 : p.riskLevel === 'medium' ? 85 : 65
      const colors = [
        { bg: 'rgba(59,130,246,0.2)', bd: '#3b82f6' },
        { bg: 'rgba(16,185,129,0.25)', bd: '#10b981' },
        { bg: 'rgba(249,115,22,0.2)', bd: '#f97316' },
      ]
      return {
        label: p.name.split('（')[0],
        data: [saveRate + 10, saveCarb + 5, riskScore, peakCut + 5, ease, capacity],
        backgroundColor: colors[i % 3].bg,
        borderColor: colors[i % 3].bd,
        borderWidth: 2,
        pointRadius: 3,
      }
    }),
  }), [allPlans, baseline])

  const doughnutData = useMemo(() => ({
    labels: ['电费', '蒸汽费', '压空费'],
    datasets: [{
      data: [selected.electricityCost, selected.steamCost, selected.airCost],
      backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(249,115,22,0.8)', 'rgba(139,92,246,0.8)'],
      borderColor: 'var(--bg-card)',
      borderWidth: 3,
    }],
  }), [selected])

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, usePointStyle: true } },
      tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10, cornerRadius: 6 },
    },
  }

  const barOptions = {
    ...baseOptions,
    scales: {
      x: { grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 } },
      y: { stacked: true, grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#64748b', font: { size: 10 } } },
    },
  }

  const radarOptions = {
    ...baseOptions,
    scales: {
      r: {
        grid: { color: 'rgba(100,116,139,0.3)' },
        angleLines: { color: 'rgba(100,116,139,0.3)' },
        pointLabels: { color: '#94a3b8', font: { size: 11 } },
        ticks: { display: false, backdropColor: 'transparent' },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
  }

  const savingAmount = baseline.totalCost - selected.totalCost
  const savingRate = (savingAmount / baseline.totalCost * 100).toFixed(1)
  const carbonSaving = (baseline.carbonEmission - selected.carbonEmission).toFixed(2)
  const peakCutAmount = (baseline.peakDemand - selected.peakDemand)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div className="grid grid-4">
        <div className="metric-card">
          <div className="metric-label">💰 方案总费用</div>
          <div className="metric-value">¥{selected.totalCost.toLocaleString()}</div>
          <div className={`metric-trend ${savingAmount > 0 ? 'trend-down' : 'trend-up'}`}>
            较基准方案 {savingAmount > 0 ? '↓' : '↑'} ¥{Math.abs(savingAmount).toLocaleString()} ({savingRate}%)
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">🌱 碳排放量</div>
          <div className="metric-value">{selected.carbonEmission.toFixed(1)}<span className="metric-unit">tCO₂</span></div>
          <div className="metric-trend trend-down">
            减排 {carbonSaving} tCO₂ ({((Number(carbonSaving) / baseline.carbonEmission) * 100).toFixed(1)}%)
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">⚡ 峰值负荷</div>
          <div className="metric-value" style={{ color: selected.peakDemand > state.demandRedLine ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {selected.peakDemand}<span className="metric-unit">kW</span>
          </div>
          <div className="metric-trend trend-down">
            削减 {peakCutAmount} kW ({((peakCutAmount / baseline.peakDemand) * 100).toFixed(1)}%)
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">🎯 风险评估</div>
          <div className="metric-value" style={{ color: selected.riskLevel === 'low' ? 'var(--accent-green)' : selected.riskLevel === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
            <span className={`tag ${RISK_LABELS[selected.riskLevel].cls}`} style={{ fontSize: 13 }}>
              {RISK_LABELS[selected.riskLevel].text}
            </span>
          </div>
          <div className="metric-trend trend-neutral">
            基准: {RISK_LABELS[baseline.riskLevel].text} · 当前方案: {selected.id === state.costPlans[1].id ? '⭐ 推荐' : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-3" style={{ flex: '0 0 auto' }}>
        {allPlans.map((p) => {
          const save = ((baseline.totalCost - p.totalCost) / baseline.totalCost * 100).toFixed(1)
          return (
            <div
              key={p.id}
              className={`plan-card ${selectedId === p.id ? 'selected' : ''}`}
              onClick={() => { setSelectedId(p.id); state.setSelectedPlan(p.id) }}
            >
              <div className="plan-header">
                <div>
                  <div className="plan-name">{p.name.split('（')[0]}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {p.name.includes('推荐') ? '⭐ 系统推荐' : ''}
                  </div>
                </div>
                <span className={`tag plan-badge ${RISK_LABELS[p.riskLevel].cls}`}>
                  {RISK_LABELS[p.riskLevel].text}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: p.id === baseline.id ? 'var(--text-primary)' : save.startsWith('-') ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  ¥{p.totalCost.toLocaleString()}
                </span>
                {p.id !== baseline.id && (
                  <span style={{ fontSize: 12, color: save.startsWith('-') ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 600 }}>
                    {save.startsWith('-') ? '+' : '-'}{save}%
                  </span>
                )}
              </div>
              <div className="stat-row"><span className="stat-label">峰值</span><span className="stat-value" style={{ color: p.peakDemand > state.demandRedLine ? 'var(--accent-red)' : 'var(--text-primary)' }}>{p.peakDemand} kW</span></div>
              <div className="stat-row"><span className="stat-label">碳排</span><span className="stat-value">{p.carbonEmission} t</span></div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.6 }}>{p.description}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-3" style={{ flex: 1, minHeight: 0 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">📊 方案费用构成对比</div>
              <div className="card-subtitle">电费 / 蒸汽 / 压缩空气 堆叠图</div>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 150 }}>
            <Bar data={compareBarData} options={barOptions} />
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">🎯 综合能力雷达图</div>
              <div className="card-subtitle">6维度方案评估</div>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 150 }}>
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">🥧 费用占比 - {selected.name.split('（')[0]}</div>
              <div className="card-subtitle">能源成本结构分析</div>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 120, position: 'relative' }}>
            <Doughnut data={doughnutData} options={baseOptions} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>总费用</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>¥{(selected.totalCost / 1000).toFixed(1)}k</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: 6, fontSize: 11 }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              ⚡ 电 {((selected.electricityCost / selected.totalCost) * 100).toFixed(0)}%
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              🔥 汽 {((selected.steamCost / selected.totalCost) * 100).toFixed(0)}%
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              💨 空 {((selected.airCost / selected.totalCost) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <span className="toolbar-title">📋 方案明细对比表</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {publishedPlan && <span className="tag tag-green" title={`发布人 ${publishedPlan.publishedBy}`}>🚀 执行版：{publishedPlan.name}</span>}
          <select value={viewMode} onChange={(e) => { setViewMode(e.target.value as 'preset' | 'saved'); setSelectedId('') }} style={{ fontSize: 12, padding: '4px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }}>
            <option value="preset">预设方案对比</option>
            <option value="saved">已保存方案快照</option>
          </select>
          {viewMode === 'saved' && state.savedPlans.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>（尚未保存方案，请先在排程窗另存）</span>
          )}
        </div>
        <div className="toolbar-spacer" />
        <button className="btn btn-sm" onClick={() => onNavigate?.('schedule')}>↩️ 返回排程调整</button>
        <button className="btn btn-sm">📤 导出对比报告</button>
        <button className="btn btn-sm btn-primary" disabled={!selectedId}
          onClick={() => { if (selectedId) { state.setSelectedPlan(selectedId); onNavigate?.('review') } }}>
          ✅ 确认此方案 →
        </button>
      </div>

      <div className="card" style={{ flexShrink: 0, padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>评估项</th>
              {allPlans.map((p) => (
                <th key={p.id} style={selectedId === p.id ? { background: 'rgba(59,130,246,0.15)', color: '#60a5fa' } : {}}>
                  {p.name.split('（')[0]}
                  {selectedId === p.id && ' ✓'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { k: 'totalCost', l: '总费用 (¥)', fmt: (v: number) => v.toLocaleString() },
              { k: 'electricityCost', l: '电费 (¥)', fmt: (v: number) => v.toLocaleString() },
              { k: 'steamCost', l: '蒸汽费 (¥)', fmt: (v: number) => v.toLocaleString() },
              { k: 'airCost', l: '压空费 (¥)', fmt: (v: number) => v.toLocaleString() },
              { k: 'carbonEmission', l: '碳排放 (t)', fmt: (v: number) => v.toFixed(1) },
              { k: 'peakDemand', l: '峰值负荷 (kW)', fmt: (v: number) => `${v}${v > state.demandRedLine ? ' ⚠️' : ''}` },
              { k: 'riskLevel', l: '风险等级', fmt: (v: string | number) => RISK_LABELS[v as CostPlan['riskLevel']].text, tag: true },
            ].map((row) => (
              <tr key={row.k}>
                <td style={{ color: 'var(--text-secondary)' }}>{row.l}</td>
                {allPlans.map((p) => {
                  const pAny = p as unknown as Record<string, unknown>
                  const v = pAny[row.k] as number | string
                  const isSelected = selectedId === p.id
                  return (
                    <td key={p.id} style={isSelected ? { background: 'rgba(59,130,246,0.05)', fontWeight: 600 } : {}}>
                      {row.tag ? (
                        <span className={`tag ${RISK_LABELS[v as CostPlan['riskLevel']].cls}`}>
                          {RISK_LABELS[v as CostPlan['riskLevel']].text}
                        </span>
                      ) : (
                        row.fmt(v as number)
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr>
              <td style={{ color: 'var(--text-secondary)' }}>方案说明</td>
              {allPlans.map((p) => (
                <td key={p.id} style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.description}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
