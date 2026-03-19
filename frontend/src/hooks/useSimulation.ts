import { useSimulationStore } from '../store/simulationStore'

export function useSimulation() {
  const run = useSimulationStore((s) => s.runSimulation)
  return { run }
}
