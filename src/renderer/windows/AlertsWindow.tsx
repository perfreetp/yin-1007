import { useMemo, useState } from 'react'
import { useEnergyStore } from '../store/useEnergyStore'
import type { Alert, AlertCategory, AlertLevel, WindowKey } from '@shared/types'

interface Props {
  onNavigate?: (key: WindowKey) => void
}

const CATEGORY_LABELS: Record<AlertCategory, { text: string; cls: string; icon: string }> = {
  overDemand: { text: '超需量', cls: 'tag-red', icon: '⚡' },
  lowEfficiency: { text: '低效率', cls: 'tag-yellow', icon: '📉' },
  wasteHeat: { text: '余热浪费', cls: 'tag-orange', icon: '🔥' },
  other: { text: '其他', cls: 'tag-blue', icon: 'ℹ️' },
}

const LEVEL_LABELS: Record<AlertLevel, { text: string; cls: string; borderCls: string }> = {
  critical: { text: '紧急', cls: 'tag-red', borderCls: 'critical' },
  warning: { text: '警告', cls: 'tag-yellow', borderCls: 'warning' },
  info: { text: '提示', cls: 'tag-blue', borderCls: 'info' },
}

type FilterKey = 'all' | 'unresolved' | AlertLevel

export default function AlertsWindow({ onNavigate }: Props) {
  const state = useEnergyStore()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | 'all'>('all')
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  const filteredAlerts = useMemo(() => {
    return state.alerts.filter((a) => {
      if (filter === 'unresolved' && a.resolved) return false
      if (filter !== 'all' && filter !== 'unresolved' && a.level !== filter) return false
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false
      return true
    })
  }, [state.alerts, filter, categoryFilter])

  const stats = useMemo(() => {
    const unresolved = state.alerts.filter((a) => !a.resolved)
    return {
      total: state.alerts.length,
      unresolved: unresolved.length,
      critical: unresolved.filter((a) => a.level === 'critical').length,
      warning: unresolved.filter((a) => a.level === 'warning').length,
      info: unresolved.filter((a) => a.level === 'info').length,
      overDemand: state.alerts.filter((a) => a.category === 'overDemand' && !a.resolved).length,
      lowEfficiency: state.alerts.filter((a) => a.category === 'lowEfficiency' && !a.resolved).length,
      wasteHeat: state.alerts.filter((a) => a.category === 'wasteHeat' && !a.resolved).length,
    }
  }, [state.alerts])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const diff = (Date.now() - ts) / 60000
    if (diff < 1) return '刚刚'
    if (diff < 60) return `${Math.floor(diff)} 分钟前`
    if (diff < 1440) return `${Math.floor(diff / 60)} 小时前`
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div className="grid grid-4">
        <div className="metric-card" style={{ borderLeft: '4px solid var(--accent-red)' }}>
          <div className="metric-label">🚨 紧急未处理</div>
          <div className="metric-value" style={{ color: 'var(--accent-red)' }}>{stats.critical}<span className="metric-unit">条</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>需立即响应，不超过15分钟</div>
        </div>
        <div className="metric-card" style={{ borderLeft: '4px solid var(--accent-yellow)' }}>
          <div className="metric-label">⚠️ 警告待处理</div>
          <div className="metric-value" style={{ color: 'var(--accent-yellow)' }}>{stats.warning}<span className="metric-unit">条</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>2小时内处理，避免扩大</div>
        </div>
        <div className="metric-card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
          <div className="metric-label">💡 优化建议</div>
          <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>{stats.info}<span className="metric-unit">条</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>可在排程调整时参考</div>
        </div>
        <div className="metric-card" style={{ borderLeft: '4px solid var(--accent-green)' }}>
          <div className="metric-label">✅ 已解决</div>
          <div className="metric-value" style={{ color: 'var(--accent-green)' }}>{state.alerts.filter((a) => a.resolved).length}<span className="metric-unit">条</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            解决率 {stats.total > 0 ? ((state.alerts.filter((a) => a.resolved).length / stats.total) * 100).toFixed(0) : 0}%
          </div>
        </div>
      </div>

      <div className="toolbar">
        <span className="toolbar-title">🔍 筛选</span>
        {state.publishedPlanId && (() => {
          const p = state.savedPlans.find((x) => x.id === state.publishedPlanId)
          return p ? <span className="tag tag-green" style={{ marginLeft: 12 }}>🚀 执行方案：{p.name}</span> : null
        })()}
        <div className="tabs">
          {[
            { k: 'all', t: `全部 (${stats.unresolved})` },
            { k: 'unresolved', t: `未处理 (${stats.unresolved})` },
            { k: 'critical', t: `紧急 (${stats.critical})` },
            { k: 'warning', t: `警告 (${stats.warning})` },
            { k: 'info', t: `提示 (${stats.info})` },
          ].map((x) => (
            <div key={x.k} className={`tab ${filter === x.k ? 'active' : ''}`} onClick={() => setFilter(x.k as FilterKey)}>
              {x.t}
            </div>
          ))}
        </div>
        <div className="tabs" style={{ marginLeft: 12 }}>
          <div className={`tab ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')}>全部分类</div>
          {(Object.keys(CATEGORY_LABELS) as AlertCategory[]).map((c) => (
            <div key={c} className={`tab ${categoryFilter === c ? 'active' : ''}`} onClick={() => setCategoryFilter(c)}>
              {CATEGORY_LABELS[c].icon} {CATEGORY_LABELS[c].text}
            </div>
          ))}
        </div>
        <div className="toolbar-spacer" />
        <button className="btn btn-sm" onClick={() => onNavigate?.('schedule')}>📅 调整排程</button>
        <button className="btn btn-sm btn-primary">📤 导出告警</button>
      </div>

      <div className="grid grid-2" style={{ flex: 1, minHeight: 0 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '10px 14px' }}>
            <div>
              <div className="card-title">告警列表（{filteredAlerts.length}）</div>
              <div className="card-subtitle">按时间倒序，点击查看详情</div>
            </div>
            <button className="btn btn-sm btn-success" disabled={!selectedAlert || selectedAlert.resolved}
              onClick={() => { if (selectedAlert) { state.resolveAlert(selectedAlert.id); setSelectedAlert({ ...selectedAlert, resolved: true }) } }}>
              ✓ 标记已处理
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
            {filteredAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>
                🎉 当前筛选条件下无告警记录
              </div>
            ) : (
              filteredAlerts.map((a) => (
                <div
                  key={a.id}
                  className={`alert-item ${LEVEL_LABELS[a.level].borderCls} ${a.resolved ? 'resolved' : ''}`}
                  onClick={() => setSelectedAlert(a)}
                  style={{ cursor: 'pointer', outline: selectedAlert?.id === a.id ? '2px solid var(--accent-blue)' : 'none' }}
                >
                  <div className="alert-header">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`tag ${LEVEL_LABELS[a.level].cls}`}>{LEVEL_LABELS[a.level].text}</span>
                      <span className={`tag ${CATEGORY_LABELS[a.category].cls}`}>
                        {CATEGORY_LABELS[a.category].icon} {CATEGORY_LABELS[a.category].text}
                      </span>
                      {a.resolved && <span className="tag tag-green">✓ 已处理</span>}
                    </div>
                    <span className="alert-time">{formatTime(a.timestamp)}</span>
                  </div>
                  <div className="alert-title">{a.title}</div>
                  <div className="alert-msg" style={{ marginTop: 4 }}>
                    {a.message.length > 80 ? a.message.slice(0, 80) + '...' : a.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <div>
              <div className="card-title">告警详情</div>
              <div className="card-subtitle">{selectedAlert ? '选中告警的完整信息和处置建议' : '请从左侧选择一条告警查看详情'}</div>
            </div>
          </div>
          {selectedAlert ? (
            <div style={{ flex: 1, overflow: 'auto', padding: '4px 4px 16px' }}>
              <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                  <span className={`tag ${LEVEL_LABELS[selectedAlert.level].cls}`} style={{ fontSize: 13, padding: '4px 12px' }}>
                    {LEVEL_LABELS[selectedAlert.level].text}
                  </span>
                  <span className={`tag ${CATEGORY_LABELS[selectedAlert.category].cls}`} style={{ fontSize: 13, padding: '4px 12px' }}>
                    {CATEGORY_LABELS[selectedAlert.category].icon} {CATEGORY_LABELS[selectedAlert.category].text}
                  </span>
                  {selectedAlert.resolved && <span className="tag tag-green" style={{ fontSize: 13, padding: '4px 12px' }}>✓ 已处理</span>}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
                  {selectedAlert.title}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  {selectedAlert.message}
                </p>
                <div className="stat-row"><span className="stat-label">告警编号</span><span className="stat-value">{selectedAlert.id}</span></div>
                <div className="stat-row"><span className="stat-label">发生时间</span><span className="stat-value">{new Date(selectedAlert.timestamp).toLocaleString('zh-CN')}</span></div>
                <div className="stat-row"><span className="stat-label">关联资源</span><span className="stat-value">{selectedAlert.relatedItemId || '无'}</span></div>
                <div className="stat-row"><span className="stat-label">处理状态</span><span className="stat-value" style={{ color: selectedAlert.resolved ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
                  {selectedAlert.resolved ? '已处理' : '待处理'}
                </span></div>
              </div>

              <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--accent-cyan)' }}>💡 处置建议</h4>
                {selectedAlert.category === 'overDemand' && (
                  <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                    <p style={{ marginBottom: 6 }}><b>1. 立即启动储能放电：</b>在 {state.energyPrice.peakHours[0]}:00-{state.energyPrice.peakHours[1]}:00 尖峰时段释放储能 400-500 kW，可削减峰值约 15%。</p>
                    <p style={{ marginBottom: 6 }}><b>2. 错峰非关键设备：</b>将注塑机#2、CNC#2等非P0级设备的启动延后至 11:00 后。</p>
                    <p style={{ marginBottom: 6 }}><b>3. 空压机优化：</b>关停 #2 空压机（当前#1可满足负载），节省 110 kW × 3小时。</p>
                    <p><b>4. 联系调度：</b>若以上措施不足，提前通知电网调度申请临时增容。</p>
                  </div>
                )}
                {selectedAlert.category === 'lowEfficiency' && (
                  <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                    <p style={{ marginBottom: 6 }}><b>1. 检查设备维护状态：</b>查看涂装烘干炉上次维护时间，是否超期。</p>
                    <p style={{ marginBottom: 6 }}><b>2. 清洗燃烧器：</b>积碳会导致燃烧效率下降，建议停机清洗。</p>
                    <p style={{ marginBottom: 6 }}><b>3. 检查保温层：</b>红外测温检测炉体表面散热热点，修复保温缺陷。</p>
                    <p><b>4. 优化负荷率：</b>避免低负荷长时间运行，批量生产提升效率。</p>
                  </div>
                )}
                {selectedAlert.category === 'wasteHeat' && (
                  <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                    <p style={{ marginBottom: 6 }}><b>1. 加装烟气预热器：</b>回收排烟热量预热助燃空气，可节省燃气 8-12%。</p>
                    <p style={{ marginBottom: 6 }}><b>2. 余热用于热水：</b>非采暖季可考虑接入生活热水系统。</p>
                    <p style={{ marginBottom: 6 }}><b>3. 检查空燃比：</b>烟气含氧量过高说明空气过剩，调整空燃比至 1.15-1.2。</p>
                    <p><b>4. 吹灰频次：</b>对流管束积灰严重，建议每日增加自动吹灰 1 次。</p>
                  </div>
                )}
                {selectedAlert.category === 'other' && (
                  <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                    <p style={{ marginBottom: 6 }}><b>1. 评估当前负载：</b>核实实时用气量是否匹配建议。</p>
                    <p style={{ marginBottom: 6 }}><b>2. 切换至单机运行：</b>通过排程窗口关停 #2 空压机，观察气压是否稳定。</p>
                    <p style={{ marginBottom: 6 }}><b>3. 记录节能效果：</b>全天空载损耗约 15kW × 16h = 240 kWh，约 ¥200/天。</p>
                    <p><b>4. 设置轮换规则：</b>确保单机运行不超过 16 小时，保护设备寿命。</p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-sm" onClick={() => onNavigate?.('schedule')}>📅 去排程调整</button>
                {!selectedAlert.resolved && (
                  <button className="btn btn-sm btn-success"
                    onClick={() => { state.resolveAlert(selectedAlert.id); setSelectedAlert({ ...selectedAlert, resolved: true }) }}>
                    ✓ 标记为已处理
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
              <div style={{ fontSize: 48 }}>🔍</div>
              <div style={{ fontSize: 13 }}>从左侧列表选择一条告警查看详情</div>
              <div style={{ fontSize: 11 }}>系统将给出处置建议与可能的排程方案</div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ flexShrink: 0 }}>
        <div className="card-title">📊 今日告警分布</div>
        <div className="grid grid-4" style={{ marginTop: 10 }}>
          {[
            { k: 'overDemand', n: stats.overDemand, color: 'var(--accent-red)' },
            { k: 'lowEfficiency', n: stats.lowEfficiency, color: 'var(--accent-yellow)' },
            { k: 'wasteHeat', n: stats.wasteHeat, color: 'var(--accent-orange)' },
            { k: 'resolved', n: state.alerts.filter((a) => a.resolved).length, color: 'var(--accent-green)' },
          ].map((x) => (
            <div key={x.k} style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 6, border: `1px solid ${x.color}33`, borderLeft: `4px solid ${x.color}` }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {x.k === 'overDemand' ? '超需量' : x.k === 'lowEfficiency' ? '低效率' : x.k === 'wasteHeat' ? '余热浪费' : '已处理'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: x.color }}>{x.n} 条</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
