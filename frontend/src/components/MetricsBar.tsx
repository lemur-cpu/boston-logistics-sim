import { useSimulationStore } from '../store/simulationStore'

// Hex values used where CSS vars can't be interpolated (e.g. rgba backgrounds)
const RISK_HEX = { high: '#f44336', med: '#ff9800', low: '#4caf50' }

function riskHex(min: number) {
  return min > 10 ? RISK_HEX.high : min > 5 ? RISK_HEX.med : RISK_HEX.low
}
function riskBg(min: number) {
  return min > 10
    ? 'rgba(244,67,54,0.15)'
    : min > 5
      ? 'rgba(255,152,0,0.15)'
      : 'rgba(76,175,80,0.15)'
}
function stockoutColor(p: number) {
  return p >= 0.6 ? 'var(--risk-high)' : p >= 0.3 ? 'var(--risk-medium)' : 'var(--risk-low)'
}
function resilienceColor(score: number) {
  return score >= 70 ? 'var(--risk-low)' : score >= 40 ? 'var(--risk-medium)' : 'var(--risk-high)'
}

const cardStyle: React.CSSProperties = {
  flex: 1, minWidth: 0,
  padding: '10px 14px',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.1em', color: 'var(--text-muted)',
  textTransform: 'uppercase', marginBottom: 8, flexShrink: 0,
}

const divider: React.CSSProperties = {
  width: 1, alignSelf: 'stretch', flexShrink: 0,
  background: 'rgba(255,255,255,0.07)',
}

const emptyNote: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic',
}

export default function MetricsBar() {
  const { simulationResult, closedStoreIds, lastComputedAt } = useSimulationStore()
  const rec = simulationResult?.recommended_store_location ?? null

  const hoodsDesc = simulationResult
    ? [...simulationResult.neighborhood_access].sort(
        (a, b) => b.access_time_minutes - a.access_time_minutes,
      )
    : []

  const topRisks = simulationResult
    ? [...simulationResult.store_risks]
        .sort((a, b) => b.stockout_probability - a.stockout_probability)
        .slice(0, 3)
    : []

  const worstId = hoodsDesc[0]?.id ?? null

  const timeStr = lastComputedAt
    ? lastComputedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <div style={{
      height: 160, minHeight: 160, flexShrink: 0,
      background: 'var(--bg-panel)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
    }}>

      {/* ── Card 1: Neighborhood Access ───────────────────────────── */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Neighborhood Access</div>
        {!simulationResult ? (
          <span style={emptyNote}>Run a simulation to see results.</span>
        ) : (
          <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', gap: 6, alignItems: 'center',
              overflowX: 'auto', height: '100%',
              paddingBottom: 4,
              // hide scrollbar visually but keep scroll functional
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            } as React.CSSProperties}>
              {hoodsDesc.map((n) => {
                const isWorst = n.id === worstId
                return (
                  <div
                    key={n.id}
                    style={{
                      flexShrink: 0,
                      padding: isWorst ? '6px 12px' : '4px 10px',
                      borderRadius: 4,
                      background: riskBg(n.access_time_minutes),
                      border: `1px solid ${riskHex(n.access_time_minutes)}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                    }}
                  >
                    <span style={{
                      fontSize: isWorst ? 12 : 10,
                      fontWeight: isWorst ? 700 : 400,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                    }}>
                      {n.name}
                    </span>
                    <span style={{
                      fontSize: isWorst ? 14 : 12,
                      fontWeight: 700,
                      color: riskHex(n.access_time_minutes),
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                    }}>
                      {n.access_time_minutes.toFixed(1)} min
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Right-fade gradient */}
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 48,
              background: 'linear-gradient(to right, transparent, var(--bg-panel))',
              pointerEvents: 'none',
            }} />
          </div>
        )}
      </div>

      <div style={divider} />

      {/* ── Card 2: Top Store Risks ───────────────────────────────── */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Top Store Risks</div>
        {!simulationResult ? (
          <span style={emptyNote}>Run a simulation to see results.</span>
        ) : (
          <div style={{ display: 'flex', flex: 1, gap: 10, overflow: 'hidden' }}>
            {topRisks.map((s) => (
              <div
                key={s.store_id}
                style={{
                  flex: 1, minWidth: 0,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  padding: '0 4px',
                  borderLeft: '2px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{
                  fontSize: 12, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}>
                  {s.name}
                </div>
                <div style={{
                  fontSize: 10, color: 'var(--text-muted)',
                  fontFamily: 'monospace', marginTop: 1,
                }}>
                  {s.lat.toFixed(3)}, {s.lon.toFixed(3)}
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 700,
                  color: stockoutColor(s.stockout_probability),
                  fontFamily: 'monospace', lineHeight: 1.2, marginTop: 4,
                }}>
                  {(s.stockout_probability * 100).toFixed(0)}%
                </div>
                {s.top_factors[0] && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    {s.top_factors[0].direction === 'increases' ? '↑' : '↓'}&nbsp;
                    {s.top_factors[0].feature}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={divider} />

      {/* ── Card 3: Simulation Status ─────────────────────────────── */}
      <div style={{ ...cardStyle, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <div style={{ ...sectionLabel, marginBottom: 4 }}>Simulation Status</div>

        {/* Resilience score */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontSize: 42, fontWeight: 700, lineHeight: 1,
            color: simulationResult
              ? resilienceColor(simulationResult.resilience_score)
              : 'var(--text-muted)',
            fontFamily: 'monospace',
          }}>
            {simulationResult ? simulationResult.resilience_score : '–'}
          </span>
          {simulationResult && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ 100</span>
          )}
        </div>

        {/* Closed stores */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          <span style={{
            color: closedStoreIds.length > 0 ? 'var(--risk-high)' : 'var(--text-primary)',
            fontWeight: closedStoreIds.length > 0 ? 700 : 400,
          }}>
            {closedStoreIds.length}
          </span>
          &nbsp;stores closed
        </div>

        {/* Last run */}
        {timeStr ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {timeStr}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            not yet run
          </div>
        )}

        {/* Recommended location */}
        {rec && (
          <div style={{
            fontSize: 11, color: 'var(--text-muted)',
            marginTop: 6, textAlign: 'center', lineHeight: 1.4,
            maxWidth: '100%', overflow: 'hidden',
          }}>
            📍 {rec.reason}
          </div>
        )}
      </div>

    </div>
  )
}
