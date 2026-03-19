import math
from fastapi import APIRouter, Request
from app.schemas import SimulationRequest, SimulationResponse, StoreRisk, TopFactor, RecommendedLocation

NEIGHBORHOOD_POPULATION: dict[str, int] = {
    "roxbury":       60000,
    "dorchester":    92000,
    "jamaica_plain": 38000,
    "south_end":     35000,
    "fenway":        40000,
    "back_bay":      22000,
    "south_boston":  33000,
    "east_boston":   44000,
    "charlestown":   18000,
    "allston":       35000,
}

router = APIRouter()


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _nearest_neighborhood_id(lat: float, lon: float, neighborhoods: list[dict]) -> str:
    return min(neighborhoods, key=lambda h: _haversine_km(lat, lon, h["lat"], h["lon"]))["id"]


def _nearby_closed_count(store: dict, all_stores: list[dict], closed_set: set[str]) -> int:
    return sum(
        1 for s in all_stores
        if s["id"] in closed_set and _haversine_km(store["lat"], store["lon"], s["lat"], s["lon"]) <= 2.0
    )


@router.post("/simulate", response_model=SimulationResponse)
async def simulate(req: SimulationRequest, request: Request) -> SimulationResponse:
    road_graph = request.app.state.road_graph
    stockout_model = request.app.state.stockout_model

    neighborhood_access = road_graph.compute_neighborhood_access(req.closed_store_ids, req.disruptions)

    closed_set = set(req.closed_store_ids)
    open_stores = [s for s in road_graph._stores if s["id"] not in closed_set]
    neighborhoods = road_graph._neighborhoods

    store_risks = []
    for store in open_stores:
        nearest_hood_id = _nearest_neighborhood_id(store["lat"], store["lon"], neighborhoods)
        result = stockout_model.predict({
            "demand_multiplier": req.demand_overrides.get(nearest_hood_id, 1.0),
            "nearby_stores_closed": _nearby_closed_count(store, road_graph._stores, closed_set),
            "days_supply_disrupted": len(req.disruptions),
            "weather_severity": req.weather_severity,
            "store_size": store.get("store_size", "medium"),
        })
        store_risks.append(StoreRisk(
            store_id=store["id"],
            name=store["name"],
            lat=store["lat"],
            lon=store["lon"],
            stockout_probability=result["stockout_probability"],
            top_factors=[TopFactor(**f) for f in result["top_factors"]],
        ))

    closed_store_penalty = min(40, len(req.closed_store_ids) * 2)
    disruption_penalty = min(20, len(req.disruptions) * 3)
    access_penalty = min(30, sum(10 for na in neighborhood_access if na.access_time_minutes > 15))
    resilience_score = max(0, round(100 - closed_store_penalty - disruption_penalty - access_penalty))

    recommended: RecommendedLocation | None = None
    if neighborhood_access:
        worst = max(neighborhood_access, key=lambda n: n.access_time_minutes)
        hood = next((h for h in road_graph._neighborhoods if h["id"] == worst.id), None)
        covered = NEIGHBORHOOD_POPULATION.get(worst.id, 0)
        recommended = RecommendedLocation(
            lat=hood["lat"] if hood else 42.3601,
            lon=hood["lon"] if hood else -71.0589,
            covered_residents=covered,
            reason=f"Covers {covered:,} residents averaging {worst.access_time_minutes:.1f} min to nearest store",
        )

    return SimulationResponse(
        neighborhood_access=neighborhood_access,
        store_risks=store_risks,
        resilience_score=resilience_score,
        recommended_store_location=recommended,
    )
