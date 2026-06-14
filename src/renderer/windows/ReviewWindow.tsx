import { useMemo, useState } from 'react'
import { Chart } from 'react-chartjs-2'
import { useEnergyStore } from '../store/useEnergyStore'
import type { ReviewRecord, WindowKey } from '@shared/types'

interface Props {
  onNavigate?: (key: WindowKey) => void
}

const APPROVAL_LABELS: Record<ReviewRecord['approval'], { text: string; cls: string }> = {
  pending: { text: '待审批', cls: 'tag-yellow' },
  approved: { text: '已通过', cls: 'tag-green' },
  rejected: { text: '已驳回', cls: 'tag-red' },
}

export default function ReviewWindow({ onNavigate }: Props) {
  const state = useEnergyStore()
  const [selectedId, setSelectedId] = useState<string>(state.reviewRecords[0]?.id || '')
  const [showAdd, setShowAdd] = useState(false)
  const [editReason, setEditReason] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [approver, setApprover] = useState('')

  const selected = state.reviewRecords.find((r) => r.id === selectedId)

  const newRecord: Partial<ReviewRecord> = {
    date: state.currentDate,
    plannedLoad: 20800,
    actualLoad: 0,
    plannedCost: 65000,
    actualCost: 0,
    reason: '',
    notes: '',
    approval: 'pending',
    approver: '',
  }

  const deviationChartData = useMemo(() => {
    const sorted = [...state.reviewRecords].sort((a, b) => a.date.localeCompare(b.date))
    return {
      labels: sorted.map((r) => r.date.slice(5)),
      datasets: [
        {
          type: 'bar' as const,
          label: '计划负荷 (kWh)',
          data: sorted.map((r) => r.plannedLoad),
          backgroundColor: 'rgba(59,130,246,0.6)',
          borderRadius: 4,
          yAxisID: 'y',
        },
        {
          type: 'bar' as const,
          label: '实际负荷 (kWh)',
          data: sorted.map((r) => r.actualLoad),
          backgroundColor: 'rgba(16,185,129,0.6)',
          borderRadius: 4,
          yAxisID: 'y',
        },
        {
          type: 'line' as const,
          label: '偏差率 (%)',
          data: sorted.map((r) => r.deviationRate),
          borderColor: '#f97316',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 4,
          yAxisID: 'y1',
        },
      ],
    }
  }, [state.reviewRecords])

  const costChartData = useMemo(() => {
    const sorted = [...state.reviewRecords].sort((a, b) => a.date.localeCompare(b.date))
    return {
      labels: sorted.map((r) => r.date.slice(5)),
      datasets: [
        {
          label: '计划费用 (¥)',
          data: sorted.map((r) => r.plannedCost),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.15)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
        },
        {
          label: '实际费用 (¥)',
          data: sorted.map((r) => r.actualCost),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
        },
      ],
    }
  }, [state.reviewRecords])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, usePointStyle: true } },
      tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8', padding: 10, cornerRadius: 6 },
    },
    scales: {
      x: { grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(100,116,139,0.15)' }, ticks: { color: '#64748b', font: { size: 10 } }, beginAtZero: true },
      y1: { position: 'right' as const, grid: { drawOnChartArea: false }, ticks: { color: '#f97316', font: { size: 10 } } },
    },
  }

  const simpleOptions = {
    ...chartOptions,
    scales: {
      x: chartOptions.scales.x,
      y: chartOptions.scales.y,
    },
  }

  const stats = useMemo(() => {
    const n = state.reviewRecords.length
    if (n === 0) return { avgDev: 0, avgCost: 0, overCount: 0, approved: 0 }
    return {
      avgDev: (state.reviewRecords.reduce((a, b) => a + Math.abs(b.deviationRate), 0) / n).toFixed(2),
      avgCost: Math.round(state.reviewRecords.reduce((a, b) => a + b.actualCost, 0) / n),
      overCount: state.reviewRecords.filter((r) => r.deviationRate > 0).length,
      approved: state.reviewRecords.filter((r) => r.approval === 'approved').length,
    }
  }, [state.reviewRecords])

  const exportReport = () => {
    const headers = ['日期', '计划负荷(kWh)', '实际负荷(kWh)', '偏差(kWh)', '偏差率(%)', '计划费用(¥)', '实际费用(¥)', '偏差原因', '备注', '审批状态', '审批人']
    const rows = state.reviewRecords.map((r) => [
      r.date, r.plannedLoad, r.actualLoad, r.deviation, r.deviationRate.toFixed(2),
      r.plannedCost, r.actualCost, r.reason, r.notes, APPROVAL_LABELS[r.approval].text, r.approver || '-',
    ])
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `能源排程复盘报表_${state.currentDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div className="grid grid-4">
        <div className="metric-card">
          <div className="metric-label">📊 平均偏差率</div>
          <div className="metric-value">±{stats.avgDev}<span className="metric-unit">%</span></div>
          <div style={{ fontSize: 11, color: Number(stats.avgDev) > 3 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
            {Number(stats.avgDev) > 5 ? '偏差偏大，需优化模型' : Number(stats.avgDev) > 3 ? '轻微偏差，可接受' : '偏差控制良好'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">💰 日均实际费用</div>
          <div className="metric-value">¥{stats.avgCost.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            较计划 {((stats.avgCost / (state.reviewRecords.reduce((a, b) => a + b.plannedCost, 0) / state.reviewRecords.length) - 1) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">📈 超计划天数</div>
          <div className="metric-value">{stats.overCount}<span className="metric-unit">/{state.reviewRecords.length}天</span></div>
          <div style={{ fontSize: 11, color: stats.overCount > state.reviewRecords.length / 2 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
            {stats.overCount > state.reviewRecords.length / 2 ? '需加强成本控制' : '总体控制良好'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">✅ 审批通过</div>
          <div className="metric-value">{stats.approved}<span className="metric-unit">/{state.reviewRecords.length}份</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            通过率 {state.reviewRecords.length > 0 ? ((stats.approved / state.reviewRecords.length) * 100).toFixed(0) : 0}%
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ flex: '0 0 auto', maxHeight: 180 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px' }}>
          <div className="card-header" style={{ marginBottom: 4, paddingBottom: 6 }}>
            <div className="card-title">负荷偏差趋势</div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Chart type="bar" data={deviationChartData as any} options={chartOptions} />
          </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px' }}>
          <div className="card-header" style={{ marginBottom: 4, paddingBottom: 6 }}>
            <div className="card-title">计划 vs 实际费用</div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Chart type="line" data={costChartData as any} options={simpleOptions} />
          </div>
        </div>
      </div>

      <div className="toolbar">
        <span className="toolbar-title">📋 历史复盘记录</span>
        <div className="tabs">
          <div className="tab active">全部 ({state.reviewRecords.length})</div>
          <div className="tab">待审批 ({state.reviewRecords.filter((r) => r.approval === 'pending').length})</div>
          <div className="tab">已通过 ({stats.approved})</div>
        </div>
        <div className="toolbar-spacer" />
        <button className="btn btn-sm" onClick={() => onNavigate?.('forecast')}>📈 查看预测模型</button>
        <button className="btn btn-sm" onClick={exportReport}>📤 导出CSV报表</button>
        <button className="btn btn-sm btn-success" onClick={() => setShowAdd(true)}>+ 新增今日复盘</button>
      </div>

      <div className="grid grid-5" style={{ flex: 1, minHeight: 0 }}>
        <div className="card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '10px 14px' }}>
            <div>
              <div className="card-title">复盘列表</div>
              <div className="card-subtitle">点击选择查看或编辑详情</div>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table>
              <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <tr>
                  <th>日期</th>
                  <th>负荷偏差</th>
                  <th>费用差异</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {state.reviewRecords.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setSelectedId(r.id)
                      setEditReason(r.reason)
                      setEditNotes(r.notes)
                    }}
                    style={{
                      cursor: 'pointer',
                      background: selectedId === r.id ? 'rgba(59,130,246,0.1)' : undefined,
                      outline: selectedId === r.id ? '1px solid var(--accent-blue)' : undefined,
                    }}
                  >
                    <td style={{ fontWeight: 600 }}>{r.date}</td>
                    <td style={{ color: r.deviationRate > 3 ? 'var(--accent-red)' : r.deviationRate < -3 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                      {r.deviationRate > 0 ? '+' : ''}{r.deviationRate.toFixed(2)}%
                    </td>
                    <td style={{ color: r.actualCost > r.plannedCost ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                      {r.actualCost > r.plannedCost ? '+' : ''}¥{(r.actualCost - r.plannedCost).toLocaleString()}
                    </td>
                    <td>
                      <span className={`tag ${APPROVAL_LABELS[r.approval].cls}`}>{APPROVAL_LABELS[r.approval].text}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <div>
              <div className="card-title">{selected ? `${selected.date} 复盘详情` : '复盘详情'}</div>
              <div className="card-subtitle">{selected ? `编号：${selected.id}` : '请在左侧选择一条记录'}</div>
            </div>
            {selected && (
              <div style={{ display: 'flex', gap: 6 }}>
                <span className={`tag ${APPROVAL_LABELS[selected.approval].cls}`}>{APPROVAL_LABELS[selected.approval].text}</span>
                {selected.approver && <span className="tag tag-blue">审批人：{selected.approver}</span>}
              </div>
            )}
          </div>
          {selected ? (
            <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>
              <div className="grid grid-2" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>⚡ 用电负荷</div>
                  <div className="stat-row"><span className="stat-label">计划值</span><span className="stat-value">{selected.plannedLoad.toLocaleString()} kWh</span></div>
                  <div className="stat-row"><span className="stat-label">实际值</span><span className="stat-value">{selected.actualLoad.toLocaleString()} kWh</span></div>
                  <div className="stat-row">
                    <span className="stat-label">偏差</span>
                    <span className="stat-value" style={{ color: selected.deviation > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                      {selected.deviation > 0 ? '+' : ''}{selected.deviation.toLocaleString()} kWh ({selected.deviationRate > 0 ? '+' : ''}{selected.deviationRate.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>💰 费用支出</div>
                  <div className="stat-row"><span className="stat-label">计划值</span><span className="stat-value">¥{selected.plannedCost.toLocaleString()}</span></div>
                  <div className="stat-row"><span className="stat-label">实际值</span><span className="stat-value">¥{selected.actualCost.toLocaleString()}</span></div>
                  <div className="stat-row">
                    <span className="stat-label">差异</span>
                    <span className="stat-value" style={{ color: selected.actualCost > selected.plannedCost ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                      {selected.actualCost > selected.plannedCost ? '+' : ''}¥{(selected.actualCost - selected.plannedCost).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📌 偏差原因分析</div>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="输入偏差产生的原因..."
                  style={{ minHeight: 70 }}
                />
              </div>

              <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📝 改进建议与备注</div>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="输入改进建议、后续措施等备注信息..."
                  style={{ minHeight: 70 }}
                />
              </div>

              {selected.approval === 'pending' && (
                <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--accent-yellow)', borderStyle: 'dashed', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--accent-yellow)' }}>⚖️ 主管审批</div>
                  <div className="form-row">
                    <label>审批人姓名</label>
                    <input placeholder="如：张主管" value={approver} onChange={(e) => setApprover(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-sm btn-danger" onClick={() => {
                      if (!approver) return alert('请输入审批人姓名')
                      state.updateReviewRecord({
                        ...selected, reason: editReason, notes: editNotes,
                        approval: 'rejected', approver, createdAt: Date.now(),
                      })
                    }}>❌ 驳回</button>
                    <button className="btn btn-sm btn-success" onClick={() => {
                      if (!approver) return alert('请输入审批人姓名')
                      state.updateReviewRecord({
                        ...selected, reason: editReason, notes: editNotes,
                        approval: 'approved', approver, createdAt: Date.now(),
                      })
                    }}>✓ 审批通过</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-sm" onClick={() => onNavigate?.('schedule')}>📅 参考排程</button>
                <button className="btn btn-sm btn-primary" onClick={() => {
                  state.updateReviewRecord({ ...selected, reason: editReason, notes: editNotes })
                  alert('✓ 已保存修改')
                }}>💾 保存修改</button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
              <div style={{ fontSize: 48 }}>📝</div>
              <div style={{ fontSize: 13 }}>请在左侧列表选择一条复盘记录</div>
              <div style={{ fontSize: 11 }}>可以编辑原因、备注，并进行审批操作</div>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            width: 560, background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflow: 'auto',
          }}>
            <div className="card-header" style={{ marginTop: -4 }}><div className="card-title">+ 新增今日复盘 ({newRecord.date})</div></div>
            <div className="grid grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, margin: '14px 0' }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>计划负荷 (kWh)</label>
                <input type="number" defaultValue={newRecord.plannedLoad} id="rp_planned" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>实际负荷 (kWh)</label>
                <input type="number" defaultValue={newRecord.actualLoad} id="rp_actual" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>计划费用 (¥)</label>
                <input type="number" defaultValue={newRecord.plannedCost} id="rpc_planned" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>实际费用 (¥)</label>
                <input type="number" defaultValue={newRecord.actualCost} id="rpc_actual" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>偏差原因</label>
              <textarea id="rp_reason" placeholder="分析今日偏差产生的主要原因..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>改进建议</label>
              <textarea id="rp_notes" placeholder="后续改进措施与备注..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn btn-primary" onClick={() => {
                const pl = Number((document.getElementById('rp_planned') as HTMLInputElement).value)
                const al = Number((document.getElementById('rp_actual') as HTMLInputElement).value)
                const pc = Number((document.getElementById('rpc_planned') as HTMLInputElement).value)
                const ac = Number((document.getElementById('rpc_actual') as HTMLInputElement).value)
                const reason = (document.getElementById('rp_reason') as HTMLTextAreaElement).value
                const notes = (document.getElementById('rp_notes') as HTMLTextAreaElement).value
                if (!pl || !al || !pc || !ac) return alert('请填写完整数值')
                const rec: ReviewRecord = {
                  id: `r_${Date.now()}`, date: newRecord.date!,
                  plannedLoad: pl, actualLoad: al,
                  deviation: al - pl, deviationRate: ((al - pl) / pl) * 100,
                  plannedCost: pc, actualCost: ac,
                  reason, notes, approval: 'pending', approver: '', createdAt: Date.now(),
                }
                state.addReviewRecord(rec)
                setSelectedId(rec.id)
                setEditReason(reason)
                setEditNotes(notes)
                setShowAdd(false)
              }}>提交复盘</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
