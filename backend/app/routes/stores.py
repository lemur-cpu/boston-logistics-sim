import json
from pathlib import Path
from fastapi import APIRouter

router = APIRouter()
STORES_PATH = Path(__file__).parent.parent / "data" / "stores.geojson"


@router.get("/stores")
def get_stores() -> dict:
    if not STORES_PATH.exists():
        return {"type": "FeatureCollection", "features": []}
    return json.loads(STORES_PATH.read_text())
