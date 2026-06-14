export type EnergyType = 'electricity' | 'steam' | 'compressedAir' | 'storage'

export type WindowKey = 'overview' | 'production' | 'forecast' | 'schedule' | 'alerts' | 'cost' | 'review'

export type AlertLevel = 'critical' | 'warning' | 'info'
export type AlertCategory = 'overDemand' | 'lowEfficiency' | 'wasteHeat' | 'other'

export interface EnergyPrice {
  electricity: number[]
  steam: number
  compressedAir: number
  peakHours: [number, number]
  valleyHours: [number, number]
}

export interface WorkshopStatus {
  id: string
  name: string
  status: 'running' | 'idle' | 'maintenance' | 'offline'
  currentLoad: number
  maxLoad: number
  efficiency: number
}

export interface Shift {
  id: string
  name: string
  startHour: number
  endHour: number
  days: number[]
}

export interface Equipment {
  id: string
  name: string
  workshopId: string
  power: number
  steamConsumption: number
  airConsumption: number
  status: 'active' | 'standby' | 'maintenance'
}

export interface WorkOrder {
  id: string
  name: string
  equipmentId: string
  priority: 1 | 2 | 3 | 4 | 5
  startTime: number
  duration: number
  cannotStop: boolean
}

export interface LoadForecast {
  hour: number
  electricity: number
  steam: number
  compressedAir: number
  confidence: number
}

export interface WeatherData {
  date: string
  temperature: number
  humidity: number
  isRainy: boolean
}

export interface ScheduleItem {
  id: string
  type: 'equipment' | 'storage' | 'boiler' | 'compressor'
  name: string
  startHour: number
  endHour: number
  power: number
  resource: EnergyType
  color: string
  storageGroupIdx?: number
}

export interface StorageSchedule {
  id: string
  chargeStart: number
  chargeEnd: number
  dischargeStart: number
  dischargeEnd: number
  capacity: number
  currentLevel: number
}

export interface Alert {
  id: string
  level: AlertLevel
  category: AlertCategory
  title: string
  message: string
  timestamp: number
  resolved: boolean
  relatedItemId?: string
}

export interface CostPlan {
  id: string
  name: string
  totalCost: number
  electricityCost: number
  steamCost: number
  airCost: number
  carbonEmission: number
  riskLevel: 'low' | 'medium' | 'high'
  peakDemand: number
  description: string
}

export interface ReviewRecord {
  id: string
  date: string
  relatedPlanId: string | null
  plannedLoad: number
  actualLoad: number
  deviation: number
  deviationRate: number
  plannedCost: number
  actualCost: number
  reason: string
  notes: string
  approval: 'pending' | 'approved' | 'rejected'
  approver: string
  approvalRemark: string
  approvalAt: number
  createdAt: number
  history: ReviewHistoryEntry[]
}

export interface ReviewHistoryEntry {
  timestamp: number
  field: string
  oldValue: string
  newValue: string
  operator: string
}

export interface SchedulePlan {
  id: string
  name: string
  note: string
  schedules: ScheduleItem[]
  storageSchedules: StorageSchedule[]
  costSnapshot: CostPlan
  createdAt: number
  publishedAt: number
  publishedBy: string
}

export interface UiState {
  comparePlanIds: [string, string] | null
}

export interface AppState {
  energyPrice: EnergyPrice
  workshops: WorkshopStatus[]
  shifts: Shift[]
  equipments: Equipment[]
  workOrders: WorkOrder[]
  loadForecast: LoadForecast[]
  weather: WeatherData[]
  schedules: ScheduleItem[]
  storageSchedules: StorageSchedule[]
  alerts: Alert[]
  costPlans: CostPlan[]
  reviewRecords: ReviewRecord[]
  savedPlans: SchedulePlan[]
  activePlanId: string | null
  publishedPlanId: string | null
  uiState: UiState
  currentDate: string
  demandRedLine: number
  todayTotalLoad: number
}
