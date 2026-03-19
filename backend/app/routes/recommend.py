from fastapi import APIRouter, Query, Request
from app.schemas import RecommendedLocation

router = APIRouter()


@router.get("/recommend", response_model=RecommendedLocation)
async def recommend(
    request: Request,
    closed_store_ids: str = Query(default="", description="Comma-separated store IDs"),
    weather_severity: float = Query(default=0.0, ge=0.0, le=1.0),
) -> RecommendedLocation:
    road_graph = request.app.state.road_graph

    closed_ids = [x.strip() for x in closed_store_ids.split(",") if x.strip()]
    neighborhood_access = road_graph.compute_neighborhood_access(closed_ids, [])

    worst = max(neighborhood_access, key=lambda n: n.access_time_minutes)
    hood = next((h for h in road_graph._neighborhoods if h["id"] == worst.id), None)

    lat = hood["lat"] if hood else 42.3601
    lon = hood["lon"] if hood else -71.0589
    pop = hood.get("population", 0) if hood else 0

    return RecommendedLocation(
        lat=lat,
        lon=lon,
        covered_residents=pop,
        reason=f"Covers ~{pop:,} residents currently averaging {worst.access_time_minutes:.1f} min access time",
    )
