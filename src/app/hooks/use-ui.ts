import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { PendingTailor } from '~/types/resume'

export type UpgradeModalState = {
  feature?: string
  limit?: number
  featureLabel?: string
  period?: string
}

interface UIState {
  sidebarCollapsed: boolean
  activeResumeId: string | null
  targetCompanyKey: string
  pendingTailor: PendingTailor | null
  upgradeModal: { open: boolean; data: UpgradeModalState }

  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setActiveResumeId: (id: string | null) => void
  setTargetCompanyKey: (key: string) => void
  setPendingTailor: (pending: PendingTailor | null) => void
  toggleAcceptedChange: (changeId: string) => void
  openUpgradeModal: (data?: UpgradeModalState) => void
  closeUpgradeModal: () => void
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    sidebarCollapsed: false,
    activeResumeId: null,
    targetCompanyKey: 'none',
    pendingTailor: null,
    upgradeModal: { open: false, data: {} },

    toggleSidebar: () =>
      set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed
      }),
    setSidebarCollapsed: (collapsed) =>
      set((state) => {
        state.sidebarCollapsed = collapsed
      }),
    setActiveResumeId: (id) =>
      set((state) => {
        state.activeResumeId = id
      }),
    setTargetCompanyKey: (key) =>
      set((state) => {
        state.targetCompanyKey = key
      }),
    setPendingTailor: (pending) =>
      set((state) => {
        state.pendingTailor = pending
      }),
    toggleAcceptedChange: (changeId) =>
      set((state) => {
        if (!state.pendingTailor) return
        const accepted = new Set(state.pendingTailor.accepted)
        if (accepted.has(changeId)) {
          accepted.delete(changeId)
        } else {
          accepted.add(changeId)
        }
        state.pendingTailor.accepted = accepted
      }),
    openUpgradeModal: (data = {}) =>
      set((state) => {
        state.upgradeModal = { open: true, data }
      }),
    closeUpgradeModal: () =>
      set((state) => {
        state.upgradeModal.open = false
      }),
  }))
)
