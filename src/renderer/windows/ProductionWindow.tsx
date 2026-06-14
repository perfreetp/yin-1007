import { useState } from 'react'
import { useEnergyStore } from '../store/useEnergyStore'
import type { WindowKey, Equipment, WorkOrder } from '@shared/types'

interface Props {
  onNavigate?: (key: WindowKey) => void
}

type TabKey = 'shifts' | 'equipments' | 'workorders' | 'rules'

const PRIORITY_LABELS: Record<number, { text: string; cls: string }> = {
  1: { text: 'P0 紧急', cls: 'tag-red' },
  2: { text: 'P1 高', cls: 'tag-orange' },
  3: { text: 'P2 中', cls: 'tag-yellow' },
  4: { text: 'P3 低', cls: 'tag-blue' },
  5: { text: 'P4 可延后', cls: 'tag-gray' },
}

const EQ_STATUS: Record<Equipment['status'], { text: string; cls: string }> = {
  active: { text: '运行中', cls: 'tag-green' },
  standby: { text: '待机', cls: 'tag-yellow' },
  maintenance: { text: '维护', cls: 'tag-purple' },
}

export default function ProductionWindow({ onNavigate }: Props) {
  const state = useEnergyStore()
  const [tab, setTab] = useState<TabKey>('workorders')
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null)
  const [editingEq, setEditingEq] = useState<Equipment | null>(null)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [showEqForm, setShowEqForm] = useState(false)
  const [newOrder, setNewOrder] = useState<Partial<WorkOrder>>({
    name: '', equipmentId: '', priority: 3 as const, startTime: 8, duration: 4, cannotStop: false,
  })
  const [newEq, setNewEq] = useState<Partial<Equipment>>({
    name: '', workshopId: '', power: 0, steamConsumption: 0, airConsumption: 0, status: 'standby',
  })

  const workshopMap = Object.fromEntries(state.workshops.map((w) => [w.id, w.name]))
  const eqMap = Object.fromEntries(state.equipments.map((e) => [e.id, e.name]))

  const formatHours = (h: number) => `${String(h).padStart(2, '0')}:00`
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  const submitOrder = () => {
    if (!newOrder.name || !newOrder.equipmentId) return
    const order: WorkOrder = {
      id: `wo_${Date.now()}`,
      name: newOrder.name!,
      equipmentId: newOrder.equipmentId!,
      priority: newOrder.priority as 1 | 2 | 3 | 4 | 5,
      startTime: newOrder.startTime!,
      duration: newOrder.duration!,
      cannotStop: newOrder.cannotStop!,
    }
    state.addWorkOrder(order)
    setNewOrder({ name: '', equipmentId: '', priority: 3, startTime: 8, duration: 4, cannotStop: false })
    setShowOrderForm(false)
  }

  const submitEq = () => {
    if (!newEq.name || !newEq.workshopId) return
    const eq: Equipment = {
      id: `eq_${Date.now()}`,
      name: newEq.name!,
      workshopId: newEq.workshopId!,
      power: newEq.power!,
      steamConsumption: newEq.steamConsumption!,
      airConsumption: newEq.airConsumption!,
      status: newEq.status as Equipment['status'],
    }
    state.addEquipment(eq)
    setNewEq({ name: '', workshopId: '', power: 0, steamConsumption: 0, airConsumption: 0, status: 'standby' })
    setShowEqForm(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div className="toolbar">
        <span className="toolbar-title">🏭 产线管理工作台</span>
        <div className="tabs">
          {([
            { k: 'workorders', t: '📋 工单管理' },
            { k: 'equipments', t: '⚙️ 设备台账' },
            { k: 'shifts', t: '⏰ 班次配置' },
            { k: 'rules', t: '🚫 排程规则' },
          ] as { k: TabKey; t: string }[]).map((x) => (
            <div key={x.k} className={`tab ${tab === x.k ? 'active' : ''}`} onClick={() => setTab(x.k)}>
              {x.t}
            </div>
          ))}
        </div>
        <div className="toolbar-spacer" />
        <button className="btn btn-sm btn-primary" onClick={() => onNavigate?.('schedule')}>📅 转到排程</button>
      </div>

      {tab === 'workorders' && (
        <div className="card" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">工单列表（{state.workOrders.length}）</div>
              <div className="card-subtitle">优先级 P0→P4 数字越小越紧急</div>
            </div>
            <button className="btn btn-sm btn-success" onClick={() => setShowOrderForm(true)}>+ 新加工单</button>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table>
              <thead>
                <tr>
                  <th>工单名称</th>
                  <th>对应设备</th>
                  <th>优先级</th>
                  <th>开始</th>
                  <th>时长</th>
                  <th>不可停机</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {state.workOrders.map((wo) => (
                  <tr key={wo.id}>
                    <td style={{ fontWeight: 500 }}>{wo.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{eqMap[wo.equipmentId] || wo.equipmentId}</td>
                    <td>
                      <span className={`tag ${PRIORITY_LABELS[wo.priority].cls}`}>{PRIORITY_LABELS[wo.priority].text}</span>
                    </td>
                    <td>{formatHours(wo.startTime)}</td>
                    <td>{wo.duration}h</td>
                    <td>{wo.cannotStop ? <span className="tag tag-red">是</span> : <span className="tag tag-gray">否</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm" onClick={() => { setEditingOrder(wo); setShowOrderForm(true) }}>编辑</button>
                        <button className="btn btn-sm btn-danger" onClick={() => state.removeWorkOrder(wo.id)}>删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'equipments' && (
        <div className="card" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">设备台账（{state.equipments.length}）</div>
              <div className="card-subtitle">录入设备额定功率、蒸汽/压空消耗</div>
            </div>
            <button className="btn btn-sm btn-success" onClick={() => setShowEqForm(true)}>+ 新增设备</button>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table>
              <thead>
                <tr>
                  <th>设备名称</th>
                  <th>所属车间</th>
                  <th>电功率 (kW)</th>
                  <th>蒸汽 (kg/h)</th>
                  <th>压空 (m³/h)</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {state.equipments.map((eq) => (
                  <tr key={eq.id}>
                    <td style={{ fontWeight: 500 }}>{eq.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{workshopMap[eq.workshopId] || eq.workshopId}</td>
                    <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{eq.power}</td>
                    <td>{eq.steamConsumption}</td>
                    <td>{eq.airConsumption}</td>
                    <td><span className={`tag ${EQ_STATUS[eq.status].cls}`}>{EQ_STATUS[eq.status].text}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm" onClick={() => { setEditingEq(eq); setShowEqForm(true) }}>编辑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'shifts' && (
        <div className="grid grid-3" style={{ flex: 1 }}>
          {state.shifts.map((s) => (
            <div key={s.id} className="card">
              <div className="card-header">
                <div className="card-title">⏰ {s.name}</div>
                <span className="tag tag-blue">{s.days.length === 7 ? '全周' : s.days.length + '天'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">开始时间</span>
                <span className="stat-value">{formatHours(s.startHour)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">结束时间</span>
                <span className="stat-value">{formatHours(s.endHour)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">工作时长</span>
                <span className="stat-value">{((s.endHour - s.startHour + 24) % 24 || 24)} 小时</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>排班日：</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {dayNames.map((d, i) => (
                    <span key={d} className={`tag ${s.days.includes(i) ? 'tag-green' : 'tag-gray'}`}>{d}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'rules' && (
        <div className="grid grid-2" style={{ flex: 1 }}>
          <div className="card">
            <div className="card-title">🚫 不可停机规则</div>
            <div className="card-subtitle" style={{ marginBottom: 12 }}>以下工单在排程时不允许中途暂停或拆分</div>
            {state.workOrders.filter((w) => w.cannotStop).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>暂无不可停机工单</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {state.workOrders.filter((w) => w.cannotStop).map((wo) => (
                  <div key={wo.id} style={{ padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--accent-red)', borderLeftWidth: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>{wo.name}</span>
                      <span className={`tag ${PRIORITY_LABELS[wo.priority].cls}`}>{PRIORITY_LABELS[wo.priority].text}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {eqMap[wo.equipmentId]} · {formatHours(wo.startTime)} 起 · {wo.duration}小时
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">📋 其他排程约束</div>
            <div className="card-subtitle" style={{ marginBottom: 12 }}>系统内置的硬约束规则</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              {[
                { t: '涂装烘干炉升温曲线', d: '启动后至少运行3小时，冷启动需提前预热45分钟', c: 'tag-red' },
                { t: '空压机轮换运行', d: '单日单台运行不超过16小时，需自动切换备用机', c: 'tag-yellow' },
                { t: '储能SOC安全区间', d: '充放电不得超过容量90%/低于15%，防止电池损伤', c: 'tag-purple' },
                { t: '锅炉最小负荷率', d: '燃气锅炉负荷率不得低于30%，否则效率骤降', c: 'tag-blue' },
                { t: '交接班缓冲期', d: '早晚7:00-7:30为交接班，允许负荷±15%波动', c: 'tag-green' },
              ].map((r) => (
                <div key={r.t} style={{ padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className={`tag ${r.c}`}>{r.t}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showOrderForm && (
        <div style={modalBg}>
          <div style={modalBox}>
            <div className="card-header"><div className="card-title">{editingOrder ? '编辑工单' : '新加工单'}</div></div>
            <div style={{ padding: '0 4px' }}>
              <div className="form-row">
                <label>工单名称 *</label>
                <input placeholder="如：订单A-500件壳体加工" value={editingOrder?.name ?? newOrder.name}
                  onChange={(e) => editingOrder ? (editingOrder.name = e.target.value) : setNewOrder({ ...newOrder, name: e.target.value })} />
              </div>
              <div className="form-row">
                <label>对应设备 *</label>
                <select value={editingOrder?.equipmentId ?? newOrder.equipmentId}
                  onChange={(e) => editingOrder ? (editingOrder.equipmentId = e.target.value) : setNewOrder({ ...newOrder, equipmentId: e.target.value })}>
                  <option value="">-- 请选择设备 --</option>
                  {state.equipments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>优先级</label>
                <select value={editingOrder?.priority ?? newOrder.priority}
                  onChange={(e) => editingOrder ? (editingOrder.priority = Number(e.target.value) as 1 | 2 | 3 | 4 | 5) : setNewOrder({ ...newOrder, priority: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>
                  {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p].text}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>开始时间</label>
                <input type="number" min={0} max={23} value={editingOrder?.startTime ?? newOrder.startTime}
                  onChange={(e) => editingOrder ? (editingOrder.startTime = Number(e.target.value)) : setNewOrder({ ...newOrder, startTime: Number(e.target.value) })} />
              </div>
              <div className="form-row">
                <label>持续时长 (h)</label>
                <input type="number" min={1} max={24} value={editingOrder?.duration ?? newOrder.duration}
                  onChange={(e) => editingOrder ? (editingOrder.duration = Number(e.target.value)) : setNewOrder({ ...newOrder, duration: Number(e.target.value) })} />
              </div>
              <div className="form-row">
                <label>不可停机</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={editingOrder?.cannotStop ?? newOrder.cannotStop}
                    onChange={(e) => editingOrder ? (editingOrder.cannotStop = e.target.checked) : setNewOrder({ ...newOrder, cannotStop: e.target.checked })}
                    style={{ width: 'auto' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>勾选后排程不可中途暂停或拆分</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => { setShowOrderForm(false); setEditingOrder(null) }}>取消</button>
              <button className="btn btn-primary" onClick={() => {
                if (editingOrder) { state.updateWorkOrder(editingOrder); setEditingOrder(null) }
                else { submitOrder() }
                setShowOrderForm(false)
              }}>确定</button>
            </div>
          </div>
        </div>
      )}

      {showEqForm && (
        <div style={modalBg}>
          <div style={modalBox}>
            <div className="card-header"><div className="card-title">{editingEq ? '编辑设备' : '新增设备'}</div></div>
            <div style={{ padding: '0 4px' }}>
              <div className="form-row"><label>设备名称 *</label>
                <input value={editingEq?.name ?? newEq.name}
                  onChange={(e) => editingEq ? (editingEq.name = e.target.value) : setNewEq({ ...newEq, name: e.target.value })} />
              </div>
              <div className="form-row"><label>所属车间 *</label>
                <select value={editingEq?.workshopId ?? newEq.workshopId}
                  onChange={(e) => editingEq ? (editingEq.workshopId = e.target.value) : setNewEq({ ...newEq, workshopId: e.target.value })}>
                  <option value="">-- 请选择车间 --</option>
                  {state.workshops.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="form-row"><label>电功率 (kW)</label>
                <input type="number" min={0} value={editingEq?.power ?? newEq.power}
                  onChange={(e) => editingEq ? (editingEq.power = Number(e.target.value)) : setNewEq({ ...newEq, power: Number(e.target.value) })} />
              </div>
              <div className="form-row"><label>蒸汽消耗 (kg/h)</label>
                <input type="number" min={0} value={editingEq?.steamConsumption ?? newEq.steamConsumption}
                  onChange={(e) => editingEq ? (editingEq.steamConsumption = Number(e.target.value)) : setNewEq({ ...newEq, steamConsumption: Number(e.target.value) })} />
              </div>
              <div className="form-row"><label>压空消耗 (m³/h)</label>
                <input type="number" min={0} value={editingEq?.airConsumption ?? newEq.airConsumption}
                  onChange={(e) => editingEq ? (editingEq.airConsumption = Number(e.target.value)) : setNewEq({ ...newEq, airConsumption: Number(e.target.value) })} />
              </div>
              <div className="form-row"><label>状态</label>
                <select value={editingEq?.status ?? newEq.status}
                  onChange={(e) => editingEq ? (editingEq.status = e.target.value as Equipment['status']) : setNewEq({ ...newEq, status: e.target.value as Equipment['status'] })}>
                  {Object.entries(EQ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.text}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => { setShowEqForm(false); setEditingEq(null) }}>取消</button>
              <button className="btn btn-primary" onClick={() => {
                if (editingEq) { state.updateEquipment(editingEq); setEditingEq(null) }
                else { submitEq() }
                setShowEqForm(false)
              }}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const modalBg: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalBox: React.CSSProperties = {
  width: 480, background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
}
