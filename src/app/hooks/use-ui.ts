import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { PendingTailor } from '~/types/resume'

interface UIState {
  sidebarCollapsed: boolean
  activeResumeId: string | null
  targetCompanyKey: string
  pendingTailor: PendingTailor | null

  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setActiveResumeId: (id: string | null) => void
  setTargetCompanyKey: (key: string) => void
  setPendingTailor: (pending: PendingTailor | null) => void
  toggleAcceptedChange: (changeId: string) => void
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    sidebarCollapsed: false,
    activeResumeId: null,
    targetCompanyKey: 'none',
    pendingTailor: null,

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
  }))
)
