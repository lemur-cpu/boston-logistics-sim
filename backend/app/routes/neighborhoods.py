import json
from pathlib import Path
from fastapi import APIRouter

router = APIRouter()
NEIGHBORHOODS_PATH = Path(__file__).parent.parent / "data" / "neighborhoods.geojson"


@router.get("/neighborhoods")
def get_neighborhoods() -> dict:
    if not NEIGHBORHOODS_PATH.exists():
        return {"type": "FeatureCollection", "features": [], "note": "neighborhoods.geojson not found — download from Analyze Boston Open Data"}
    return json.loads(NEIGHBORHOODS_PATH.read_text())
