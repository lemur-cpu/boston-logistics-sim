import { useEffect, useRef } from 'react'
import type { StoreRisk } from '../types'

interface Props {
  store: StoreRisk
  onClose: () => void
}

export default function ExplainCard({ store, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  const riskColor =
    store.stockout_probability >= 0.6
      ? 'var(--risk-high)'
      : store.stockout_probability >= 0.3
        ? 'var(--risk-medium)'
        : 'var(--risk-low)'

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        bottom: 48,
        right: 16,
        width: 240,
        background: 'var(--bg-panel)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6,
        padding: '12px 14px',
        zIndex: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {store.name}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
            {store.store_id}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 16, lineHeight: 1,
            padding: '0 0 0 8px', flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Stockout probability */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 4, padding: '8px 10px', marginBottom: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          STOCKOUT RISK
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: riskColor, fontFamily: 'monospace' }}>
          {(store.stockout_probability * 100).toFixed(0)}%
        </span>
      </div>

      {/* Top factors */}
      {store.top_factors.length > 0 ? (
        <div>
          <div style={{
            fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
            letterSpacing: '0.08em', color: 'var(--text-muted)',
            marginBottom: 6, textTransform: 'uppercase',
          }}>
            Top Factors
          </div>
          {store.top_factors.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.feature.replace(/_/g, ' ')}
              </span>
              <span style={{
                fontSize: 10, fontFamily: 'monospace', marginLeft: 8, flexShrink: 0,
                color: f.direction === 'increases' ? 'var(--risk-high)' : 'var(--risk-low)',
              }}>
                {f.direction === 'increases' ? '+' : '−'}{f.magnitude.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No factor data available.
        </div>
      )}
    </div>
  )
}
