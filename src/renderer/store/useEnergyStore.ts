import { create } from 'zustand'
import type {
  AppState,
  ScheduleItem,
  Alert,
  WorkOrder,
  ReviewRecord,
  Equipment,
  WorkshopStatus,
} from '@shared/types'
import { createInitialState } from '@shared/mockData'

type StoreState = AppState & {
  updateSchedule: (item: ScheduleItem) => void
  addSchedule: (item: ScheduleItem) => void
  removeSchedule: (id: string) => void
  resolveAlert: (id: string) => void
  addAlert: (alert: Alert) => void
  addWorkOrder: (order: WorkOrder) => void
  updateWorkOrder: (order: WorkOrder) => void
  removeWorkOrder: (id: string) => void
  updateEquipment: (eq: Equipment) => void
  updateWorkshop: (ws: WorkshopStatus) => void
  addReviewRecord: (record: ReviewRecord) => void
  updateReviewRecord: (record: ReviewRecord) => void
  setSelectedPlan: (id: string | null) => void
  selectedPlanId: string | null
}

export const useEnergyStore = create<StoreState>((set) => ({
  ...createInitialState(),
  selectedPlanId: null,
  updateSchedule: (item) =>
    set((s) => ({
      schedules: s.schedules.map((x) => (x.id === item.id ? item : x)),
    })),
  addSchedule: (item) => set((s) => ({ schedules: [...s.schedules, item] })),
  removeSchedule: (id) => set((s) => ({ schedules: s.schedules.filter((x) => x.id !== id) })),
  resolveAlert: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
    })),
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts] })),
  addWorkOrder: (order) => set((s) => ({ workOrders: [...s.workOrders, order] })),
  updateWorkOrder: (order) =>
    set((s) => ({
      workOrders: s.workOrders.map((w) => (w.id === order.id ? order : w)),
    })),
  removeWorkOrder: (id) => set((s) => ({ workOrders: s.workOrders.filter((w) => w.id !== id) })),
  updateEquipment: (eq) =>
    set((s) => ({
      equipments: s.equipments.map((e) => (e.id === eq.id ? eq : e)),
    })),
  updateWorkshop: (ws) =>
    set((s) => ({
      workshops: s.workshops.map((w) => (w.id === ws.id ? ws : w)),
    })),
  addReviewRecord: (record) => set((s) => ({ reviewRecords: [record, ...s.reviewRecords] })),
  updateReviewRecord: (record) =>
    set((s) => ({
      reviewRecords: s.reviewRecords.map((r) => (r.id === record.id ? record : r)),
    })),
  setSelectedPlan: (id) => set({ selectedPlanId: id }),
}))

export type { StoreState }
