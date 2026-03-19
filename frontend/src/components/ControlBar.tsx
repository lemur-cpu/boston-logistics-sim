import { useState } from 'react'
import { useSimulationStore } from '../store/simulationStore'

const NEIGHBORHOOD_IDS = [
  'downtown', 'south_end', 'back_bay', 'roxbury', 'dorchester',
  'jamaica_plain', 'east_boston', 'south_boston', 'charlestown', 'fenway',
]
type Preset = 'winter_storm' | 'pandemic_surge' | null

const Divider = () => (
  <div style={{
    width: 1, height: 24, flexShrink: 0,
    background: 'rgba(255,255,255,0.07)',
    margin: '0 16px',
  }} />
)

export default function ControlBar() {
  const {
    weatherSeverity, setWeatherSeverity,
    setDemandOverride, runSimulation, reset, isLoading,
  } = useSimulationStore()

  const [activePreset, setActivePreset] = useState<Preset>(null)

  function applyPreset(preset: Preset) {
    if (preset === null) {
      reset()
      setActivePreset(null)
      return
    }
    // Toggle off if already active
    if (activePreset === preset) {
      reset()
      setActivePreset(null)
      return
    }
    setActivePreset(preset)
    if (preset === 'winter_storm') {
      setWeatherSeverity(1.0)
      NEIGHBORHOOD_IDS.forEach((id) => setDemandOverride(id, 1.8))
    } else {
      setWeatherSeverity(0.3)
      NEIGHBORHOOD_IDS.forEach((id) => setDemandOverride(id, 1.8))
    }
  }

  return (
    <div style={{
      height: 52, minHeight: 52, flexShrink: 0,
      background: 'var(--bg-panel)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 8,
      overflow: 'hidden',
    }}>

      {/* Preset buttons */}
      <button style={presetBtn(false)} onClick={() => applyPreset(null)}>
        BASELINE
      </button>
      <button style={presetBtn(activePreset === 'winter_storm')} onClick={() => applyPreset('winter_storm')}>
        WINTER STORM
      </button>
      <button style={presetBtn(activePreset === 'pandemic_surge')} onClick={() => applyPreset('pandemic_surge')}>
        PANDEMIC SURGE
      </button>

      <Divider />

      {/* Weather slider */}
      <span style={{
        fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        WEATHER&nbsp;·&nbsp;
        <span style={{ color: 'var(--accent)' }}>{weatherSeverity.toFixed(2)}</span>
      </span>
      <input
        type="range" min={0} max={1} step={0.05}
        value={weatherSeverity}
        onChange={(e) => {
          setWeatherSeverity(parseFloat(e.target.value))
          setActivePreset(null)
        }}
        style={{ width: 200, flexShrink: 0, accentColor: 'var(--accent)' }}
      />

      <Divider />

      {/* Run + Reset */}
      <button
        onClick={runSimulation}
        disabled={isLoading}
        style={{
          padding: '7px 16px', flexShrink: 0,
          fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em',
          background: isLoading ? 'var(--bg-card)' : 'var(--accent)',
          color: isLoading ? 'var(--text-muted)' : '#fff',
          border: 'none', borderRadius: 4,
          cursor: isLoading ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {isLoading ? 'RUNNING…' : 'RUN SIMULATION'}
      </button>
      <button
        onClick={() => { reset(); setActivePreset(null) }}
        style={{
          padding: '7px 12px', flexShrink: 0,
          fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em',
          background: 'var(--bg-card)', color: 'var(--text-muted)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        RESET
      </button>

    </div>
  )
}

const presetBtn = (active: boolean): React.CSSProperties => ({
  padding: '5px 10px', flexShrink: 0,
  fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, cursor: 'pointer',
  background: active ? 'var(--accent)' : 'var(--bg-card)',
  color: active ? '#fff' : 'var(--text-muted)',
  whiteSpace: 'nowrap',
})
