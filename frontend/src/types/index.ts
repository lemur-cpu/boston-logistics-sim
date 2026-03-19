export interface Store {
  store_id: string
  name: string
  lat: number
  lon: number
}

export interface NeighborhoodAccess {
  id: string
  name: string
  access_time_minutes: number
  baseline_minutes: number
}

export interface TopFactor {
  feature: string
  direction: 'increases' | 'decreases'
  magnitude: number
}

export interface StoreRisk {
  store_id: string
  name: string
  lat: number
  lon: number
  stockout_probability: number
  top_factors: TopFactor[]
}

export interface SimulationResult {
  neighborhood_access: NeighborhoodAccess[]
  store_risks: StoreRisk[]
  resilience_score: number
  recommended_store_location: {
    lat: number
    lon: number
    covered_residents: number
    reason: string
  } | null
}
