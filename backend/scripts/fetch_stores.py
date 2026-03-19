"""
One-time script: fetch grocery store locations in Boston from OSM Overpass API.

Usage (from repo root):
    python backend/scripts/fetch_stores.py

Output:
    backend/app/data/stores.geojson
"""
import json
import urllib.parse
import urllib.request
from pathlib import Path

OUTPUT_PATH = Path(__file__).parent.parent / "app" / "data" / "stores.geojson"

# Bounding box: south, west, north, east (Boston proper)
BBOX = (42.22, -71.19, 42.40, -70.99)

OVERPASS_QUERY = f"""
[out:json][timeout:60];
(
  node["shop"="supermarket"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["shop"="supermarket"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  node["shop"="grocery"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["shop"="grocery"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
);
out center;
"""


def _coords_from_element(el: dict) -> tuple[float, float] | None:
    """Return (lat, lon) from a node or way element, or None if unavailable."""
    if el["type"] == "node":
        return el.get("lat"), el.get("lon")
    if el["type"] == "way":
        center = el.get("center", {})
        return center.get("lat"), center.get("lon")
    return None, None


def main() -> None:
    url = "https://overpass-api.de/api/interpreter"
    payload = urllib.parse.urlencode({"data": OVERPASS_QUERY}).encode()

    print("Querying Overpass API…")
    req = urllib.request.Request(url, data=payload, method="POST")
    with urllib.request.urlopen(req, timeout=90) as resp:
        raw = json.loads(resp.read())

    features = []
    for el in raw.get("elements", []):
        lat, lon = _coords_from_element(el)
        if lat is None or lon is None:
            continue
        name = el.get("tags", {}).get("name") or "Unknown Store"
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id": str(el["id"]),
                "name": name,
                "lat": lat,
                "lon": lon,
            },
        })

    geojson = {"type": "FeatureCollection", "features": features}
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(geojson, indent=2))

    print(f"Stores found : {len(features)}")
    print(f"Saved → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
