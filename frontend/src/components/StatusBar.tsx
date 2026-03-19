import { useSimulationStore } from '../store/simulationStore'

const sep: React.CSSProperties = { color: 'var(--text-muted)', padding: '0 10px' }

export default function StatusBar() {
  const { closedStoreIds, disruptions, simulationResult, lastComputedAt } = useSimulationStore()

  const worstHood = simulationResult?.neighborhood_access.length
    ? simulationResult.neighborhood_access.reduce((a, b) =>
        b.access_time_minutes > a.access_time_minutes ? b : a,
      )
    : null

  const timeStr = lastComputedAt
    ? lastComputedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  const accessColor = (min: number) =>
    min > 10 ? 'var(--risk-high)' : min > 5 ? 'var(--risk-medium)' : 'var(--risk-low)'

  return (
    <div style={{
      height: 40, minHeight: 40, flexShrink: 0,
      background: 'var(--bg-panel)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px',
      fontFamily: 'monospace', fontSize: 13,
      color: 'var(--text-muted)',
      overflow: 'hidden',
    }}>
      <span>
        CLOSED&nbsp;
        <strong style={{ color: closedStoreIds.length > 0 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
          {closedStoreIds.length}
        </strong>
      </span>

      <span style={sep}>·</span>

      <span>
        DISRUPTIONS&nbsp;
        <strong style={{ color: disruptions.length > 0 ? 'var(--risk-medium)' : 'var(--text-primary)' }}>
          {disruptions.length}
        </strong>
      </span>

      {worstHood && (
        <>
          <span style={sep}>·</span>
          <span>
            WORST&nbsp;
            <strong style={{ color: accessColor(worstHood.access_time_minutes) }}>
              {worstHood.access_time_minutes.toFixed(1)} min
            </strong>
            &nbsp;· {worstHood.name}
          </span>
        </>
      )}

      {timeStr && (
        <>
          <span style={{ ...sep, marginLeft: 'auto' }}>·</span>
          <span>
            LAST RUN&nbsp;<strong style={{ color: 'var(--text-primary)' }}>{timeStr}</strong>
          </span>
        </>
      )}
    </div>
  )
}
