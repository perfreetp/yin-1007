import { create } from 'zustand'
import type {
  AppState,
  ScheduleItem,
  Alert,
  WorkOrder,
  ReviewRecord,
  Equipment,
  WorkshopStatus,
  StorageSchedule,
} from '@shared/types'
import { createInitialState } from '@shared/mockData'

type StoreState = AppState & {
  selectedPlanId: string | null
  _syncing: boolean
  initFromPersisted: (data: Partial<AppState>) => void
  updateSchedule: (item: ScheduleItem) => void
  addSchedule: (item: ScheduleItem) => void
  removeSchedule: (id: string) => void
  updateStorageSchedule: (st: StorageSchedule) => void
  resolveAlert: (id: string) => void
  addAlert: (alert: Alert) => void
  updateAlert: (alert: Alert) => void
  addWorkOrder: (order: WorkOrder) => void
  updateWorkOrder: (order: WorkOrder) => void
  removeWorkOrder: (id: string) => void
  updateEquipment: (eq: Equipment) => void
  addEquipment: (eq: Equipment) => void
  updateWorkshop: (ws: WorkshopStatus) => void
  addReviewRecord: (record: ReviewRecord) => void
  updateReviewRecord: (record: ReviewRecord) => void
  setSelectedPlan: (id: string | null) => void
  applyPartial: (partial: Partial<StoreState>) => void
  resetAll: () => void
}

let broadcastTimer: ReturnType<typeof setTimeout> | null = null
let pendingPartial: Partial<StoreState> = {}

function debouncedBroadcast(getState: () => StoreState) {
  if (!window.electronAPI) return
  if (broadcastTimer) clearTimeout(broadcastTimer)
  broadcastTimer = setTimeout(() => {
    const full = getState()
    const { _syncing, initFromPersisted, applyPartial, resetAll, updateSchedule, addSchedule, removeSchedule, updateStorageSchedule, resolveAlert, addAlert, updateAlert, addWorkOrder, updateWorkOrder, removeWorkOrder, updateEquipment, addEquipment, updateWorkshop, addReviewRecord, updateReviewRecord, setSelectedPlan, ...cleanState } = full
    window.electronAPI!.sendStoreUpdate(pendingPartial, cleanState)
    pendingPartial = {}
    broadcastTimer = null
  }, 30)
}

function mergePartial<T extends object>(target: T, partial: Partial<T>): T {
  const out: any = { ...target }
  for (const k of Object.keys(partial) as (keyof T)[]) {
    const v = partial[k]
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object') {
      out[k] = mergePartial(target[k] as any, v as any)
    } else {
      out[k] = v
    }
  }
  return out
}

export const useEnergyStore = create<StoreState>((set, get) => ({
  ...createInitialState(),
  selectedPlanId: null,
  _syncing: false,

  initFromPersisted: (data) => {
    set((s) => ({ ...s, ...data, _syncing: false }))
  },

  applyPartial: (partial) => {
    set((s) => {
      const next = mergePartial(s, partial as any)
      return { ...next, _syncing: true }
    })
    setTimeout(() => set({ _syncing: false }), 0)
  },

  resetAll: () => {
    set({ ...createInitialState(), selectedPlanId: null, _syncing: false })
  },

  updateSchedule: (item) =>
    set((s) => {
      const schedules = s.schedules.map((x) => (x.id === item.id ? item : x))
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, schedules }
        debouncedBroadcast(get)
      }
      return { schedules }
    }),

  addSchedule: (item) =>
    set((s) => {
      const schedules = [...s.schedules, item]
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, schedules }
        debouncedBroadcast(get)
      }
      return { schedules }
    }),

  removeSchedule: (id) =>
    set((s) => {
      const schedules = s.schedules.filter((x) => x.id !== id)
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, schedules }
        debouncedBroadcast(get)
      }
      return { schedules }
    }),

  updateStorageSchedule: (st) =>
    set((s) => {
      const storageSchedules = s.storageSchedules.map((x) => (x.id === st.id ? st : x))
      const chargeItem = s.schedules.find((x) => x.type === 'storage' && x.power < 0 && x.id.endsWith(st.id.slice(-1)))
      const dischargeItem = s.schedules.find((x) => x.type === 'storage' && x.power > 0 && x.id.endsWith(st.id.slice(-1)))
      let schedules = s.schedules
      if (chargeItem) {
        schedules = schedules.map((x) => x.id === chargeItem.id ? { ...x, startHour: st.chargeStart, endHour: st.chargeEnd } : x)
      }
      if (dischargeItem) {
        schedules = schedules.map((x) => x.id === dischargeItem.id ? { ...x, startHour: st.dischargeStart, endHour: st.dischargeEnd } : x)
      }
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, storageSchedules, schedules }
        debouncedBroadcast(get)
      }
      return { storageSchedules, schedules }
    }),

  resolveAlert: (id) =>
    set((s) => {
      const alerts = s.alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a))
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, alerts }
        debouncedBroadcast(get)
      }
      return { alerts }
    }),

  addAlert: (alert) =>
    set((s) => {
      const alerts = [alert, ...s.alerts]
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, alerts }
        debouncedBroadcast(get)
      }
      return { alerts }
    }),

  updateAlert: (alert) =>
    set((s) => {
      const alerts = s.alerts.map((a) => (a.id === alert.id ? alert : a))
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, alerts }
        debouncedBroadcast(get)
      }
      return { alerts }
    }),

  addWorkOrder: (order) =>
    set((s) => {
      const workOrders = [...s.workOrders, order]
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, workOrders }
        debouncedBroadcast(get)
      }
      return { workOrders }
    }),

  updateWorkOrder: (order) =>
    set((s) => {
      const workOrders = s.workOrders.map((w) => (w.id === order.id ? order : w))
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, workOrders }
        debouncedBroadcast(get)
      }
      return { workOrders }
    }),

  removeWorkOrder: (id) =>
    set((s) => {
      const workOrders = s.workOrders.filter((w) => w.id !== id)
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, workOrders }
        debouncedBroadcast(get)
      }
      return { workOrders }
    }),

  updateEquipment: (eq) =>
    set((s) => {
      const equipments = s.equipments.map((e) => (e.id === eq.id ? eq : e))
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, equipments }
        debouncedBroadcast(get)
      }
      return { equipments }
    }),

  addEquipment: (eq) =>
    set((s) => {
      const equipments = [...s.equipments, eq]
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, equipments }
        debouncedBroadcast(get)
      }
      return { equipments }
    }),

  updateWorkshop: (ws) =>
    set((s) => {
      const workshops = s.workshops.map((w) => (w.id === ws.id ? ws : w))
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, workshops }
        debouncedBroadcast(get)
      }
      return { workshops }
    }),

  addReviewRecord: (record) =>
    set((s) => {
      const reviewRecords = [record, ...s.reviewRecords]
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, reviewRecords }
        debouncedBroadcast(get)
      }
      return { reviewRecords }
    }),

  updateReviewRecord: (record) =>
    set((s) => {
      const reviewRecords = s.reviewRecords.map((r) => (r.id === record.id ? record : r))
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, reviewRecords }
        debouncedBroadcast(get)
      }
      return { reviewRecords }
    }),

  setSelectedPlan: (id) =>
    set((s) => {
      if (!s._syncing && window.electronAPI) {
        pendingPartial = { ...pendingPartial, selectedPlanId: id }
        debouncedBroadcast(get)
      }
      return { selectedPlanId: id }
    }),
}))

export function setupStoreSync() {
  if (!window.electronAPI) return

  window.electronAPI.onStoreSync((partial) => {
    useEnergyStore.getState().applyPartial(partial as Partial<StoreState>)
  })

  window.electronAPI.onStoreReset(() => {
    useEnergyStore.getState().resetAll()
  })

  window.electronAPI.loadStore().then((data) => {
    if (data && typeof data === 'object') {
      useEnergyStore.getState().initFromPersisted(data as Partial<AppState>)
    }
  })
}

export type { StoreState }
