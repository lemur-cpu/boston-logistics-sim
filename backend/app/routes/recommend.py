from fastapi import APIRouter, Query, Request
from app.schemas import RecommendedLocation

router = APIRouter()

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


@router.get("/recommend", response_model=RecommendedLocation)
async def recommend(
    request: Request,
    closed_store_ids: str = Query(default="", description="Comma-separated store IDs"),
) -> RecommendedLocation:
    road_graph = request.app.state.road_graph

    closed_ids = [x.strip() for x in closed_store_ids.split(",") if x.strip()]
    neighborhood_access = road_graph.compute_neighborhood_access(closed_ids, [])

    worst = max(neighborhood_access, key=lambda n: n.access_time_minutes)
    hood = next((h for h in road_graph._neighborhoods if h["id"] == worst.id), None)

    lat = hood["lat"] if hood else 42.3601
    lon = hood["lon"] if hood else -71.0589
    covered_residents = NEIGHBORHOOD_POPULATION.get(worst.id, 0)

    return RecommendedLocation(
        lat=lat,
        lon=lon,
        covered_residents=covered_residents,
        reason=f"Covers {covered_residents:,} residents averaging {worst.access_time_minutes:.1f} min to nearest store",
    )
