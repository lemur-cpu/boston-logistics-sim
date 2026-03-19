import { useState } from 'react'
import { useSimulationStore } from '../store/simulationStore'
import type { Store } from '../types'

const NEIGHBORHOODS: Array<{ id: string; label: string }> = [
  { id: 'downtown',      label: 'Downtown' },
  { id: 'south_end',     label: 'South End' },
  { id: 'back_bay',      label: 'Back Bay' },
  { id: 'roxbury',       label: 'Roxbury' },
  { id: 'dorchester',    label: 'Dorchester' },
  { id: 'jamaica_plain', label: 'Jamaica Plain' },
  { id: 'east_boston',   label: 'East Boston' },
  { id: 'south_boston',  label: 'South Boston' },
  { id: 'charlestown',   label: 'Charlestown' },
  { id: 'fenway',        label: 'Fenway' },
]

type Tab = 'stores' | 'demand'
type SortOrder = 'az' | 'za' | 'risk' | 'proximity'

const BOSTON_LAT = 42.3601
const BOSTON_LON = -71.0589

const SORT_LABELS: Record<SortOrder, string> = {
  az: 'A–Z',
  za: 'Z–A',
  risk: 'Risk ↑',
  proximity: 'Proximity',
}

interface Props {
  stores: Store[]
}

export default function ControlPanel({ stores }: Props) {
  const { closedStoreIds, demandOverrides, simulationResult, toggleStore, setDemandOverride } = useSimulationStore()
  const [activeTab, setActiveTab] = useState<Tab>('stores')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('az')
  const [hoveredSort, setHoveredSort] = useState<SortOrder | null>(null)

  const filteredStores = searchQuery.trim()
    ? stores.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : stores

  const sortedStores = [...filteredStores].sort((a, b) => {
    if (sortOrder === 'za') return b.name.localeCompare(a.name)
    if (sortOrder === 'proximity') {
      const da = (a.lat - BOSTON_LAT) ** 2 + (a.lon - BOSTON_LON) ** 2
      const db = (b.lat - BOSTON_LAT) ** 2 + (b.lon - BOSTON_LON) ** 2
      return da - db
    }
    if (sortOrder === 'risk') {
      const risks = simulationResult?.store_risks
      if (!risks) return a.name.localeCompare(b.name)
      const ra = risks.find((r) => r.store_id === a.store_id)?.stockout_probability ?? -1
      const rb = risks.find((r) => r.store_id === b.store_id)?.stockout_probability ?? -1
      return rb - ra
    }
    // default: az
    return a.name.localeCompare(b.name)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Tab bar */}
      <div style={{
        display: 'flex', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {(['stores', 'demand'] as Tab[]).map((tab) => {
          const label = tab === 'stores'
            ? `STORES${closedStoreIds.length > 0 ? ` (${closedStoreIds.length})` : ''}`
            : 'DEMAND'
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, height: 36, border: 'none', cursor: 'pointer',
                background: 'transparent',
                fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.08em',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'color 0.1s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* STORES tab */}
      {activeTab === 'stores' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '10px 12px 0' }}>

          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: 8, flexShrink: 0 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter stores..."
              style={{
                width: '100%', height: 28, boxSizing: 'border-box',
                background: 'var(--bg-card)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                color: 'var(--text-primary)',
                fontSize: 11, fontFamily: 'inherit',
                padding: '0 28px 0 8px',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 14, lineHeight: 1,
                  padding: 0,
                }}
                aria-label="Clear filter"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sort:</span>
            <div style={{
              display: 'inline-flex',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              {(['az', 'za', 'risk', 'proximity'] as SortOrder[]).map((s) => {
                const active = sortOrder === s
                const hovered = hoveredSort === s && !active
                return (
                  <button
                    key={s}
                    onClick={() => setSortOrder(s)}
                    onMouseEnter={() => setHoveredSort(s)}
                    onMouseLeave={() => setHoveredSort(null)}
                    style={{
                      fontSize: 10, padding: '4px 10px', border: 'none', cursor: 'pointer',
                      fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: active ? 'var(--accent)' : hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {SORT_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Store count hint */}
          {searchQuery && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 6, flexShrink: 0 }}>
              {filteredStores.length} of {stores.length}
            </div>
          )}

          {/* Scrollable store list */}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
            {sortedStores.length === 0 && stores.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading…</div>
            )}
            {sortedStores.length === 0 && stores.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No matches.</div>
            )}
            {sortedStores.map((store) => {
              const closed = closedStoreIds.includes(store.store_id)
              const truncated = store.name.length > 18 ? `${store.name.slice(0, 18)}…` : store.name
              return (
                <div
                  key={store.store_id}
                  onClick={() => toggleStore(store.store_id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    height: 28, cursor: 'pointer',
                    opacity: closed ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    background: closed ? 'var(--risk-high)' : 'var(--risk-low)',
                  }} />
                  <span style={{
                    fontSize: 12, color: 'var(--text-primary)',
                    userSelect: 'none', lineHeight: 1,
                  }}>
                    {truncated}
                  </span>
                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* DEMAND tab */}
      {activeTab === 'demand' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          <div style={sectionLabel}>Demand Override</div>
          {NEIGHBORHOODS.map((n) => {
            const val = demandOverrides[n.id] ?? 1
            return (
              <div key={n.id} style={{ marginBottom: 8 }}>
                <div style={{ marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.label} ·&nbsp;</span>
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace' }}>
                    {val.toFixed(1)}×
                  </span>
                </div>
                <input
                  type="range" min={0.5} max={3} step={0.1}
                  value={val}
                  onChange={(e) => setDemandOverride(n.id, parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', height: 16 }}
                />
              </div>
            )
          })}
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
