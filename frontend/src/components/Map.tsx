import { useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
import mapboxgl from 'mapbox-gl'
import { useSimulationStore } from '../store/simulationStore'
import type { Store, StoreRisk, SimulationResult } from '../types'

interface Props {
  stores: Store[]
  selectedStore: StoreRisk | null
  onStoreClick: (store: StoreRisk | null) => void
}

const BOSTON: [number, number] = [-71.0589, 42.3601]

// Colors used in Mapbox paint expressions (CSS vars don't work there)
const C = {
  accessGood: '#4caf50',
  accessWarn: '#ff9800',
  accessBad: '#f44336',
  riskLow: '#4caf50',
  riskMed: '#ff9800',
  riskHigh: '#f44336',
  accent: '#4A90D9',
  recommended: '#FFD700',
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

function buildStoresGeoJSON(
  stores: Store[],
  closedStoreIds: string[],
  result: SimulationResult | null,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stores.map((s) => {
      const risk = result?.store_risks.find((r) => r.store_id === s.store_id)
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: {
          store_id: s.store_id,
          name: s.name,
          is_closed: closedStoreIds.includes(s.store_id) ? 1 : 0,
          stockout: risk?.stockout_probability ?? 0,
        },
      }
    }),
  }
}

function buildNeighborhoodsGeoJSON(
  base: GeoJSON.FeatureCollection,
  result: SimulationResult | null,
): GeoJSON.FeatureCollection {
  if (!result || !base.features.length) return base
  return {
    ...base,
    features: base.features.map((f: any) => {
      const id = f.properties?.id ?? f.properties?.Name ?? ''
      const access = result.neighborhood_access.find((n) => n.id === id)
      return {
        ...f,
        properties: { ...f.properties, access_minutes: access?.access_time_minutes ?? 0 },
      }
    }),
  }
}

function stylePopup(popup: mapboxgl.Popup) {
  const el = popup.getElement()
  if (!el) return
  const content = el.querySelector('.mapboxgl-popup-content') as HTMLElement | null
  if (content) {
    content.style.background = '#161b27'
    content.style.border = '1px solid rgba(255,255,255,0.12)'
    content.style.borderRadius = '6px'
    content.style.padding = '8px 10px'
    content.style.color = '#e8eaf0'
    content.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)'
    content.style.minWidth = '160px'
  }
  const tip = el.querySelector('.mapboxgl-popup-tip') as HTMLElement | null
  if (tip) tip.style.display = 'none'
}

export default function MapView({ stores, onStoreClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapLoaded = useRef(false)
  const neighborhoodsBase = useRef<GeoJSON.FeatureCollection>(emptyFC())

  // Keep latest sim state accessible inside stable callbacks without re-creating them
  const simResultRef = useRef<SimulationResult | null>(null)
  const closedIdsRef = useRef<string[]>([])
  const storesRef = useRef<Store[]>(stores)

  const hoverPopupRef = useRef(new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8 }))
  const clickPopupRef = useRef(new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8 }))

  useEffect(() => {
    storesRef.current = stores
  }, [stores])

  useEffect(
    () =>
      useSimulationStore.subscribe((state) => {
        simResultRef.current = state.simulationResult
        closedIdsRef.current = state.closedStoreIds
      }),
    [],
  )

  // ── Initialise map once ──────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const token = import.meta.env.VITE_MAPBOX_TOKEN as string
    if (!token) {
      console.warn('VITE_MAPBOX_TOKEN is not set — map will not render.')
      return
    }

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: BOSTON,
      zoom: 12,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      mapLoaded.current = true

      // ── Source: neighborhood polygons ──────────────────────────────────
      map.addSource('neighborhoods', { type: 'geojson', data: emptyFC() })
      map.addLayer({
        id: 'neighborhoods-fill',
        type: 'fill',
        source: 'neighborhoods',
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.05 },
      })

      // ── Source: store point markers ────────────────────────────────────
      map.addSource('stores', { type: 'geojson', data: emptyFC() })
      map.addLayer({
        id: 'stores-circles',
        type: 'circle',
        source: 'stores',
        paint: {
          'circle-radius': 7,
          'circle-color': C.accent,
          'circle-opacity': 1,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      })

      // ── Source: recommended location pin ──────────────────────────────
      map.addSource('recommended', { type: 'geojson', data: emptyFC() })
      map.addLayer({
        id: 'recommended-circle',
        type: 'circle',
        source: 'recommended',
        paint: {
          'circle-radius': 14,
          'circle-color': C.recommended,
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      // ── Cursor + hover tooltip ────────────────────────────────────────
      map.on('mouseenter', 'stores-circles', (e) => {
        map.getCanvas().style.cursor = 'pointer'
        const [feature] = e.features ?? []
        if (!feature) return
        const name = (feature.properties?.name as string) ?? ''
        hoverPopupRef.current
          .setLngLat(e.lngLat)
          .setHTML(`<span style="font-size:11px;font-family:monospace;color:#e8eaf0">${name}</span>`)
          .addTo(map)
        stylePopup(hoverPopupRef.current)
      })
      map.on('mouseleave', 'stores-circles', () => {
        map.getCanvas().style.cursor = ''
        hoverPopupRef.current.remove()
      })

      // ── Store click: toggle + popup ───────────────────────────────────
      map.on('click', 'stores-circles', (e) => {
        const [feature] = e.features ?? []
        if (!feature) return
        const storeId = feature.properties?.store_id as string
        const name = (feature.properties?.name as string) ?? storeId

        hoverPopupRef.current.remove()

        const wasClosed = closedIdsRef.current.includes(storeId)
        useSimulationStore.getState().toggleStore(storeId)
        const nowClosed = !wasClosed

        const risk = simResultRef.current?.store_risks.find((r) => r.store_id === storeId) ?? null

        const statusColor = nowClosed ? '#f44336' : '#4caf50'
        const statusText = nowClosed ? 'CLOSED' : 'OPEN'
        const actionText = nowClosed ? 'Click to reopen' : 'Click to close'
        const riskHex = !risk ? '' : risk.stockout_probability >= 0.6 ? '#f44336' : risk.stockout_probability >= 0.3 ? '#ff9800' : '#4caf50'
        const stockoutLine = risk
          ? `<div style="font-size:11px;color:#8892a4;margin-top:4px">Stockout risk: <strong style="color:${riskHex}">${(risk.stockout_probability * 100).toFixed(0)}%</strong></div>`
          : ''

        clickPopupRef.current.remove()
        clickPopupRef.current
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-weight:700;font-size:12px;color:#e8eaf0;margin-bottom:6px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</div>
            <div style="font-size:11px;font-family:monospace;color:${statusColor}">● ${statusText}</div>
            ${stockoutLine}
            <div style="font-size:10px;color:#8892a4;margin-top:6px;font-style:italic">${actionText}</div>
          `)
          .addTo(map)
        stylePopup(clickPopupRef.current)

        onStoreClick(risk)
        e.originalEvent.stopPropagation()
      })

      // Click on empty map space → deselect + dismiss click popup
      map.on('click', () => {
        clickPopupRef.current.remove()
        onStoreClick(null)
      })

      // ── Fetch neighborhood GeoJSON (may be empty if file not generated) ─
      fetch(`${API_BASE}/api/neighborhoods`)
        .then((r) => r.json())
        .then((data) => {
          neighborhoodsBase.current = data
          if (data.features?.length) {
            ;(map.getSource('neighborhoods') as mapboxgl.GeoJSONSource).setData(data)
          }
        })
        .catch(console.error)

      // Populate store markers if stores already loaded
      if (storesRef.current.length) {
        ;(map.getSource('stores') as mapboxgl.GeoJSONSource).setData(
          buildStoresGeoJSON(storesRef.current, closedIdsRef.current, simResultRef.current),
        )
      }
    })

    return () => {
      mapLoaded.current = false
      mapRef.current = null
      hoverPopupRef.current.remove()
      clickPopupRef.current.remove()
      map.remove()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update store markers when stores list loads ──────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapLoaded.current) return
    ;(mapRef.current.getSource('stores') as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildStoresGeoJSON(stores, closedIdsRef.current, simResultRef.current),
    )
  }, [stores])

  // ── Update all layers when simulation result changes ─────────────────────
  const { simulationResult, closedStoreIds } = useSimulationStore()

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded.current) return

    // Store circles: color by risk / closed state
    ;(map.getSource('stores') as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildStoresGeoJSON(storesRef.current, closedStoreIds, simulationResult),
    )
    map.setPaintProperty('stores-circles', 'circle-color', [
      'case',
      ['==', ['get', 'is_closed'], 1],
      C.riskHigh,
      ['<', ['get', 'stockout'], 0.3],
      C.riskLow,
      ['<', ['get', 'stockout'], 0.6],
      C.riskMed,
      C.riskHigh,
    ])
    map.setPaintProperty('stores-circles', 'circle-opacity', [
      'case',
      ['==', ['get', 'is_closed'], 1],
      0.4,
      1,
    ])

    // Neighborhood choropleth
    const hoodsData = buildNeighborhoodsGeoJSON(neighborhoodsBase.current, simulationResult)
    ;(map.getSource('neighborhoods') as mapboxgl.GeoJSONSource | undefined)?.setData(hoodsData)
    if (!simulationResult) {
      map.setPaintProperty('neighborhoods-fill', 'fill-color', '#ffffff')
      map.setPaintProperty('neighborhoods-fill', 'fill-opacity', 0.05)
    } else if (hoodsData.features.length) {
      map.setPaintProperty('neighborhoods-fill', 'fill-color', [
        'step',
        ['get', 'access_minutes'],
        C.accessGood,
        5,
        C.accessWarn,
        10,
        C.accessBad,
      ])
      map.setPaintProperty('neighborhoods-fill', 'fill-opacity', 0.25)
    }

    // Recommended location pin
    const rec = simulationResult?.recommended_store_location
    ;(map.getSource('recommended') as mapboxgl.GeoJSONSource | undefined)?.setData(
      rec
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [rec.lon, rec.lat] },
                properties: {},
              },
            ],
          }
        : emptyFC(),
    )
  }, [simulationResult, closedStoreIds])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
