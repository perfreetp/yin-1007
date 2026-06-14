import type { AppState } from './types'

export function createInitialState(): AppState {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]

  const defaultSchedules = [
    { id: 'sc1', type: 'equipment' as const, name: 'CNC加工中心#1', startHour: 8, endHour: 14, power: 75, resource: 'electricity' as const, color: '#3B82F6' },
    { id: 'sc2', type: 'equipment' as const, name: 'CNC加工中心#2', startHour: 10, endHour: 14, power: 75, resource: 'electricity' as const, color: '#3B82F6' },
    { id: 'sc3', type: 'equipment' as const, name: '注塑机#1', startHour: 9, endHour: 14, power: 120, resource: 'electricity' as const, color: '#3B82F6' },
    { id: 'sc4', type: 'equipment' as const, name: '焊接机器人#1', startHour: 7, endHour: 14, power: 90, resource: 'electricity' as const, color: '#3B82F6' },
    { id: 'sc5', type: 'equipment' as const, name: '焊接机器人#2', startHour: 13, endHour: 19, power: 90, resource: 'electricity' as const, color: '#3B82F6' },
    { id: 'sc6', type: 'equipment' as const, name: '装配流水线', startHour: 8, endHour: 16, power: 60, resource: 'electricity' as const, color: '#3B82F6' },
    { id: 'sc_charge_1', type: 'storage' as const, name: '储能组#1 充电', startHour: 0, endHour: 6, power: -500, resource: 'storage' as const, color: '#10B981', storageGroupIdx: 0 },
    { id: 'sc_discharge_1', type: 'storage' as const, name: '储能组#1 放电', startHour: 9, endHour: 12, power: 400, resource: 'storage' as const, color: '#F59E0B', storageGroupIdx: 0 },
    { id: 'sc_charge_2', type: 'storage' as const, name: '储能组#2 充电', startHour: 12, endHour: 14, power: -400, resource: 'storage' as const, color: '#14B8A6', storageGroupIdx: 1 },
    { id: 'sc_discharge_2', type: 'storage' as const, name: '储能组#2 放电', startHour: 18, endHour: 21, power: 320, resource: 'storage' as const, color: '#FB923C', storageGroupIdx: 1 },
    { id: 'sc9', type: 'boiler' as const, name: '燃气锅炉运行', startHour: 6, endHour: 20, power: 0, resource: 'steam' as const, color: '#EF4444' },
    { id: 'sc10', type: 'compressor' as const, name: '空压机#1运行', startHour: 7, endHour: 23, power: 110, resource: 'compressedAir' as const, color: '#8B5CF6' },
    { id: 'sc11', type: 'compressor' as const, name: '空压机#2运行', startHour: 9, endHour: 18, power: 110, resource: 'compressedAir' as const, color: '#8B5CF6' },
  ]

  const defaultStorage = [
    { id: 'st1', chargeStart: 0, chargeEnd: 6, dischargeStart: 9, dischargeEnd: 12, capacity: 3000, currentLevel: 2100 },
    { id: 'st2', chargeStart: 12, chargeEnd: 14, dischargeStart: 18, dischargeEnd: 21, capacity: 2000, currentLevel: 1200 },
  ]

  const demoPlanId = 'plan_demo'
  const demoPlan = {
    id: demoPlanId,
    name: '初始标准方案',
    note: '系统启动时的默认排程，作为基线参考方案',
    schedules: JSON.parse(JSON.stringify(defaultSchedules)),
    storageSchedules: JSON.parse(JSON.stringify(defaultStorage)),
    costSnapshot: { id: 'cp_demo', name: '初始标准方案', totalCost: 63420, electricityCost: 38200, steamCost: 17600, airCost: 7620, carbonEmission: 14.3, riskLevel: 'medium', peakDemand: 2680, description: '默认基线方案' },
    createdAt: Date.now() - 172800000,
    publishedAt: Date.now() - 86400000,
    publishedBy: '系统管理员',
  }

  return {
    currentDate: dateStr,
    demandRedLine: 2800,
    todayTotalLoad: 2156,
    publishedPlanId: demoPlanId,
    activePlanId: null,
    energyPrice: {
      electricity: [
        0.35, 0.35, 0.35, 0.35, 0.35, 0.35,
        0.68, 0.68, 1.05, 1.05, 1.05, 1.05,
        0.68, 0.68, 0.68, 0.68, 0.68, 1.05,
        1.05, 1.05, 0.68, 0.68, 0.35, 0.35,
      ],
      steam: 280,
      compressedAir: 0.12,
      peakHours: [8, 11],
      valleyHours: [23, 6],
    },
    workshops: [
      { id: 'w1', name: '一车间（机加工）', status: 'running', currentLoad: 680, maxLoad: 800, efficiency: 92 },
      { id: 'w2', name: '二车间（焊接）', status: 'running', currentLoad: 520, maxLoad: 700, efficiency: 85 },
      { id: 'w3', name: '三车间（装配）', status: 'running', currentLoad: 450, maxLoad: 600, efficiency: 88 },
      { id: 'w4', name: '四车间（涂装）', status: 'idle', currentLoad: 180, maxLoad: 500, efficiency: 76 },
      { id: 'w5', name: '动力车间', status: 'running', currentLoad: 326, maxLoad: 400, efficiency: 91 },
    ],
    shifts: [
      { id: 's1', name: '早班', startHour: 7, endHour: 15, days: [1, 2, 3, 4, 5, 6, 0] },
      { id: 's2', name: '中班', startHour: 15, endHour: 23, days: [1, 2, 3, 4, 5, 6] },
      { id: 's3', name: '夜班', startHour: 23, endHour: 7, days: [1, 2, 3, 4, 5] },
    ],
    equipments: [
      { id: 'e1', name: 'CNC加工中心#1', workshopId: 'w1', power: 75, steamConsumption: 0, airConsumption: 12, status: 'active' },
      { id: 'e2', name: 'CNC加工中心#2', workshopId: 'w1', power: 75, steamConsumption: 0, airConsumption: 12, status: 'active' },
      { id: 'e3', name: '注塑机#1', workshopId: 'w1', power: 120, steamConsumption: 150, airConsumption: 8, status: 'active' },
      { id: 'e4', name: '注塑机#2', workshopId: 'w1', power: 120, steamConsumption: 150, airConsumption: 8, status: 'standby' },
      { id: 'e5', name: '焊接机器人#1', workshopId: 'w2', power: 90, steamConsumption: 0, airConsumption: 5, status: 'active' },
      { id: 'e6', name: '焊接机器人#2', workshopId: 'w2', power: 90, steamConsumption: 0, airConsumption: 5, status: 'active' },
      { id: 'e7', name: '焊接机器人#3', workshopId: 'w2', power: 90, steamConsumption: 0, airConsumption: 5, status: 'standby' },
      { id: 'e8', name: '装配流水线', workshopId: 'w3', power: 60, steamConsumption: 0, airConsumption: 20, status: 'active' },
      { id: 'e9', name: '涂装烘干炉', workshopId: 'w4', power: 200, steamConsumption: 300, airConsumption: 0, status: 'maintenance' },
      { id: 'e10', name: '空压机#1', workshopId: 'w5', power: 110, steamConsumption: 0, airConsumption: 0, status: 'active' },
      { id: 'e11', name: '空压机#2', workshopId: 'w5', power: 110, steamConsumption: 0, airConsumption: 0, status: 'active' },
      { id: 'e12', name: '燃气锅炉#1', workshopId: 'w5', power: 0, steamConsumption: 0, airConsumption: 0, status: 'active' },
    ],
    workOrders: [
      { id: 'wo1', name: '订单A-500件壳体加工', equipmentId: 'e1', priority: 1, startTime: 8, duration: 6, cannotStop: true },
      { id: 'wo2', name: '订单B-300件注塑件', equipmentId: 'e3', priority: 2, startTime: 9, duration: 5, cannotStop: false },
      { id: 'wo3', name: '订单C-800件车架焊接', equipmentId: 'e5', priority: 1, startTime: 7, duration: 7, cannotStop: true },
      { id: 'wo4', name: '订单D-200套成品装配', equipmentId: 'e8', priority: 3, startTime: 8, duration: 8, cannotStop: false },
      { id: 'wo5', name: '订单E-150件精密件', equipmentId: 'e2', priority: 2, startTime: 10, duration: 4, cannotStop: false },
      { id: 'wo6', name: '订单F-600件焊件', equipmentId: 'e6', priority: 3, startTime: 13, duration: 6, cannotStop: false },
    ],
    loadForecast: Array.from({ length: 24 }, (_, h) => {
      let base = 120
      if (h >= 7 && h < 11) base = 2200
      else if (h >= 11 && h < 14) base = 1800
      else if (h >= 14 && h < 18) base = 2100
      else if (h >= 18 && h < 23) base = 1400
      const noise = Math.random() * 150 - 75
      return {
        hour: h,
        electricity: Math.max(100, base + noise),
        steam: Math.max(0, base * 0.35 + Math.random() * 100 - 50),
        compressedAir: Math.max(0, base * 0.08 + Math.random() * 30 - 15),
        confidence: 0.75 + Math.random() * 0.2,
      }
    }),
    weather: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + i - 3)
      return {
        date: d.toISOString().split('T')[0],
        temperature: 18 + Math.random() * 12,
        humidity: 45 + Math.random() * 40,
        isRainy: Math.random() > 0.75,
      }
    }),
    schedules: defaultSchedules,
    storageSchedules: defaultStorage,
    alerts: [
      { id: 'a1', level: 'critical', category: 'overDemand', title: '尖峰负荷超限预警', message: '预计10:00-11:00时段用电负荷将达到2950kW，超过需量红线2800kW，建议调整设备开机时间或启动储能放电。', timestamp: Date.now() - 3600000, resolved: false, relatedItemId: 'sc1' },
      { id: 'a2', level: 'warning', category: 'lowEfficiency', title: '四车间涂装线效率偏低', message: '涂装烘干炉综合效率76%，低于行业基准85%，建议检查保温层和燃烧系统。', timestamp: Date.now() - 7200000, resolved: false, relatedItemId: 'e9' },
      { id: 'a3', level: 'warning', category: 'wasteHeat', title: '锅炉余热回收率低', message: '燃气锅炉排烟温度185℃，余热回收不足，建议增加预热器或优化负荷分配。', timestamp: Date.now() - 10800000, resolved: false },
      { id: 'a4', level: 'info', category: 'other', title: '空压机组合优化建议', message: '当前用气量可通过#1单台运行满足，建议关停#2空压机以节省空载损耗约15kW。', timestamp: Date.now() - 1800000, resolved: false },
      { id: 'a5', level: 'info', category: 'overDemand', title: '谷期储能充电完成', message: '0:00-6:00谷期储能已充电3000kWh，当前SOC为70%。', timestamp: Date.now() - 14400000, resolved: true },
    ],
    costPlans: [
      { id: 'cp1', name: '基准方案（现有排程）', totalCost: 68520, electricityCost: 42300, steamCost: 18400, airCost: 7820, carbonEmission: 15.8, riskLevel: 'medium', peakDemand: 2950, description: '维持当前设备排程不变' },
      { id: 'cp2', name: '削峰填谷方案（推荐）', totalCost: 58240, electricityCost: 34100, steamCost: 17800, airCost: 6340, carbonEmission: 13.2, riskLevel: 'low', peakDemand: 2580, description: '错峰开机+储能调度，削减尖峰负荷370kW' },
      { id: 'cp3', name: '极致节能方案', totalCost: 52380, electricityCost: 29500, steamCost: 16200, airCost: 6680, carbonEmission: 11.5, riskLevel: 'high', peakDemand: 2350, description: '最大程度错峰，部分订单延迟至夜班' },
    ],
    reviewRecords: [
      { id: 'r1', date: '2026-06-13', relatedPlanId: demoPlanId, plannedLoad: 20800, actualLoad: 21560, deviation: 760, deviationRate: 3.65, plannedCost: 65800, actualCost: 68520, reason: '午间气温偏高，空调负荷增加；订单C焊接工作量超出预期', notes: '建议增加环境温度对负荷预测的权重系数', approval: 'approved', approver: '张主管', approvalRemark: '偏差原因分析清楚，改进建议合理，同意通过。后续重点优化温度系数。', approvalAt: Date.now() - 82800000, createdAt: Date.now() - 86400000, history: [
        { timestamp: Date.now() - 86400000, field: '偏差原因', oldValue: '', newValue: '午间气温偏高，空调负荷增加；订单C焊接工作量超出预期', operator: '操作员' },
        { timestamp: Date.now() - 82800000, field: '审批状态', oldValue: 'pending', newValue: 'approved', operator: '张主管' },
        { timestamp: Date.now() - 82800000, field: '审批意见', oldValue: '', newValue: '偏差原因分析清楚，改进建议合理，同意通过。后续重点优化温度系数。', operator: '张主管' },
      ] },
      { id: 'r2', date: '2026-06-12', relatedPlanId: null, plannedLoad: 19500, actualLoad: 18920, deviation: -580, deviationRate: -2.97, plannedCost: 61200, actualCost: 59800, reason: 'CNC#2下午因换刀停机1.5小时，涂装线维护提前完成', notes: '换刀计划需纳入排程模型', approval: 'approved', approver: '张主管', approvalRemark: '整体控制良好，节约费用值得肯定。换刀计划已排产系统需求同步。', approvalAt: Date.now() - 169200000, createdAt: Date.now() - 172800000, history: [
        { timestamp: Date.now() - 172800000, field: '偏差原因', oldValue: '', newValue: 'CNC#2下午因换刀停机1.5小时，涂装线维护提前完成', operator: '操作员' },
        { timestamp: Date.now() - 169200000, field: '审批状态', oldValue: 'pending', newValue: 'approved', operator: '张主管' },
      ] },
      { id: 'r3', date: '2026-06-11', relatedPlanId: null, plannedLoad: 22300, actualLoad: 23150, deviation: 850, deviationRate: 3.81, plannedCost: 69500, actualCost: 72100, reason: '注塑机#2临时启用处理紧急订单，锅炉超负荷运行', notes: '紧急订单需预留备用容量', approval: 'pending', approver: '', approvalRemark: '', approvalAt: 0, createdAt: Date.now() - 259200000, history: [] },
    ],
    savedPlans: [demoPlan],
    publishHistory: [{
      id: 'ph_1', planId: demoPlanId, planName: demoPlan.name,
      publishedAt: demoPlan.publishedAt, publishedBy: demoPlan.publishedBy,
      schedules: JSON.parse(JSON.stringify(demoPlan.schedules)),
      storageSchedules: JSON.parse(JSON.stringify(demoPlan.storageSchedules)),
    }],
    uiState: { comparePlanIds: null, lastReviewId: 'r1', lastPlanFilter: demoPlanId, lastWindowKey: 'overview' },
  }
}
