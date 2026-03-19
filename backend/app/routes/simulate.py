import math
from fastapi import APIRouter, Request
from app.schemas import SimulationRequest, SimulationResponse, StoreRisk, TopFactor

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

    score = (
        100.0
        - 5 * len(req.closed_store_ids)
        - 3 * len(req.disruptions)
        - (10 if any(na.access_time_minutes > 20.0 for na in neighborhood_access) else 0)
    )

    return SimulationResponse(
        neighborhood_access=neighborhood_access,
        store_risks=store_risks,
        resilience_score=round(max(0.0, min(100.0, score)), 1),
        recommended_store_location=None,
    )
