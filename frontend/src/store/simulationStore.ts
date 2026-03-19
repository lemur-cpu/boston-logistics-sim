import { create } from 'zustand'
import type { SimulationResult } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

interface SimulationState {
  // Scenario inputs
  closedStoreIds: string[]
  demandOverrides: Record<string, number>
  weatherSeverity: number
  disruptions: Array<{ node_from: number; node_to: number }>

  // API response
  simulationResult: SimulationResult | null
  isLoading: boolean
  lastComputedAt: Date | null

  // Actions
  toggleStore: (storeId: string) => void
  setDemandOverride: (neighborhoodId: string, value: number) => void
  setWeatherSeverity: (value: number) => void
  runSimulation: () => Promise<void>
  reset: () => void
}

const initialInputs = {
  closedStoreIds: [] as string[],
  demandOverrides: {} as Record<string, number>,
  weatherSeverity: 0,
  disruptions: [] as Array<{ node_from: number; node_to: number }>,
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  ...initialInputs,
  simulationResult: null,
  isLoading: false,
  lastComputedAt: null,

  toggleStore: (storeId) =>
    set((s) => ({
      closedStoreIds: s.closedStoreIds.includes(storeId)
        ? s.closedStoreIds.filter((id) => id !== storeId)
        : [...s.closedStoreIds, storeId],
    })),

  setDemandOverride: (neighborhoodId, value) =>
    set((s) => ({ demandOverrides: { ...s.demandOverrides, [neighborhoodId]: value } })),

  setWeatherSeverity: (value) => set({ weatherSeverity: value }),

  runSimulation: async () => {
    const { closedStoreIds, demandOverrides, weatherSeverity, disruptions } = get()
    set({ isLoading: true })
    try {
      const res = await fetch(`${API_BASE}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closed_store_ids: closedStoreIds,
          disruptions,
          demand_overrides: demandOverrides,
          weather_severity: weatherSeverity,
        }),
      })
      if (!res.ok) throw new Error(`Simulation failed: ${res.status}`)
      const result: SimulationResult = await res.json()
      set({ simulationResult: result, lastComputedAt: new Date(), isLoading: false })
    } catch (err) {
      console.error('runSimulation error:', err)
      set({ isLoading: false })
    }
  },

  reset: () =>
    set({ ...initialInputs, simulationResult: null, isLoading: false, lastComputedAt: null }),
}))
