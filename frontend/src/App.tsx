import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
import { useSimulationStore } from './store/simulationStore'
import type { Store, StoreRisk } from './types'
import MapView from './components/Map'
import ControlBar from './components/ControlBar'
import ControlPanel from './components/ControlPanel'
import MetricsBar from './components/MetricsBar'
import StatusBar from './components/StatusBar'
import ExplainCard from './components/ExplainCard'

export default function App() {
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<StoreRisk | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/stores`)
      .then((r) => r.json())
      .then((data) => {
        const mapped: Store[] = (data.features ?? []).map((f: any) => ({
          store_id: f.properties.id,
          name: f.properties.name,
          lat: f.properties.lat,
          lon: f.properties.lon,
        }))
        setStores(mapped)
      })
      .catch(console.error)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Header — 64px */}
      <header style={{ height: 64, minHeight: 64, flexShrink: 0, background: 'var(--bg-panel)', borderBottom: '1px solid var(--bg-card)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.12em', fontSize: 20, color: 'var(--text-primary)' }}>
          BOSTON LOGISTICS SIMULATOR
        </span>
      </header>

      {/* Control bar — 52px */}
      <ControlBar />

      {/* Middle — flex row, fills remaining space above MetricsBar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left panel — 300px */}
        <div style={{ width: 300, flexShrink: 0, background: 'var(--bg-panel)', borderRight: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <ControlPanel stores={stores} />
        </div>

        {/* Map — flex-grow */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <MapView
            stores={stores}
            selectedStore={selectedStore}
            onStoreClick={setSelectedStore}
          />
          {selectedStore && (
            <ExplainCard store={selectedStore} onClose={() => setSelectedStore(null)} />
          )}
          {/* Choropleth legend */}
          <div style={{
            position: 'absolute', bottom: 28, left: 12, zIndex: 1,
            background: 'rgba(22,27,39,0.85)', borderRadius: 4, padding: '8px 10px',
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Neighborhood Access
            </div>
            {([
              { color: '#4caf50', label: '< 5 min' },
              { color: '#ff9800', label: '5–10 min' },
              { color: '#f44336', label: '> 10 min' },
            ] as const).map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Metrics bar — 160px */}
      <MetricsBar />

      {/* Status bar — 40px */}
      <StatusBar />

    </div>
  )
}
