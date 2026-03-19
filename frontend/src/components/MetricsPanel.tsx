import { useSimulationStore } from '../store/simulationStore'

export default function MetricsPanel() {
  const { simulationResult, isLoading } = useSimulationStore()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)' }}>RUNNING…</span>
      </div>
    )
  }

  if (!simulationResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, padding: '0 20px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>NO RESULTS YET</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          Configure a scenario and click RUN SIMULATION.
        </span>
      </div>
    )
  }

  const hoodsDesc = [...simulationResult.neighborhood_access].sort(
    (a, b) => b.access_time_minutes - a.access_time_minutes,
  )

  const topRisks = [...simulationResult.store_risks]
    .sort((a, b) => b.stockout_probability - a.stockout_probability)
    .slice(0, 5)

  const rec = simulationResult.recommended_store_location

  const accessColorVar = (min: number) =>
    min > 10 ? 'var(--risk-high)' : min > 5 ? 'var(--risk-medium)' : 'var(--risk-low)'

  const riskColorVar = (p: number) =>
    p >= 0.6 ? 'var(--risk-high)' : p >= 0.3 ? 'var(--risk-medium)' : 'var(--risk-low)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: 12 }}>

      {/* Neighborhood access */}
      <div style={{ marginBottom: 20 }}>
        <div style={sectionLabel}>Neighborhood Access</div>
        {hoodsDesc.map((n) => {
          const delta = n.access_time_minutes - n.baseline_minutes
          return (
            <div
              key={n.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: 8, marginBottom: 8,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span style={{
                fontSize: 13, color: 'var(--text-primary)',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {n.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: accessColorVar(n.access_time_minutes) }}>
                  {n.access_time_minutes.toFixed(1)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>min</span>
                {Math.abs(delta) >= 0.1 && (
                  <span style={{
                    fontSize: 12, fontFamily: 'monospace',
                    color: delta > 0 ? 'var(--risk-high)' : 'var(--risk-low)',
                  }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Top 5 store risks */}
      <div style={{ marginBottom: 20 }}>
        <div style={sectionLabel}>Top Store Risks</div>
        {topRisks.map((s) => (
          <div
            key={s.store_id}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              paddingBottom: 8, marginBottom: 8,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {s.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, fontFamily: 'monospace' }}>
                {s.lat.toFixed(3)}, {s.lon.toFixed(3)}
              </div>
              {s.top_factors.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {s.top_factors.map((f, i) => (
                    <span key={i} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {f.direction === 'increases' ? '↑' : '↓'} {f.feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span style={{
              fontSize: 15, fontWeight: 700,
              color: riskColorVar(s.stockout_probability),
              marginLeft: 12, flexShrink: 0,
            }}>
              {(s.stockout_probability * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Recommended location */}
      {rec && (
        <div>
          <div style={sectionLabel}>Recommended Location</div>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 4, padding: '8px 10px',
            border: '1px solid rgba(255,215,0,0.25)',
          }}>
            <div style={{ fontSize: 13, color: '#FFD700', fontFamily: 'monospace', marginBottom: 4 }}>
              {rec.lat.toFixed(4)}, {rec.lon.toFixed(4)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              {rec.covered_residents.toLocaleString()} residents covered
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {rec.reason}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.1em', color: 'var(--text-muted)',
  marginBottom: 8, textTransform: 'uppercase',
}
