"""
One-time script: generate synthetic training data for the stockout risk classifier.

Requires app/data/stores.geojson (run fetch_stores.py first).

Usage (from repo root):
    python backend/scripts/generate_training_data.py

Output:
    backend/app/data/training_data.parquet
"""
import json
import numpy as np
import pandas as pd
from pathlib import Path

STORES_PATH = Path(__file__).parent.parent / "app" / "data" / "stores.geojson"
OUTPUT_PATH = Path(__file__).parent.parent / "app" / "data" / "training_data.parquet"

N_SCENARIOS = 200
STORE_SIZES = ["small", "medium", "large"]
SIZE_DISCOUNT = {"small": 0.0, "medium": 0.1, "large": 0.2}
RNG = np.random.default_rng(42)


def load_store_ids() -> list[str]:
    if not STORES_PATH.exists():
        raise FileNotFoundError(f"stores.geojson not found at {STORES_PATH}. Run fetch_stores.py first.")
    data = json.loads(STORES_PATH.read_text())
    return [f["properties"]["id"] for f in data["features"]]


def generate_scenarios(store_id: str, store_size: str) -> list[dict]:
    demand = RNG.uniform(0.8, 2.5, size=N_SCENARIOS)
    nearby_closed = RNG.integers(0, 5, size=N_SCENARIOS)  # 0–4 inclusive
    days_disrupted = RNG.integers(0, 15, size=N_SCENARIOS)  # 0–14 inclusive
    weather = RNG.uniform(0.0, 1.0, size=N_SCENARIOS)

    score = (
        (demand - 1.0) * 0.4
        + nearby_closed * 0.15
        + days_disrupted * 0.03
        + weather * 0.2
        - SIZE_DISCOUNT[store_size]
    )
    stockout_risk = (score > 0.65).astype(int)

    return [
        {
            "store_id": store_id,
            "store_size": store_size,
            "demand_multiplier": round(float(demand[i]), 4),
            "nearby_stores_closed": int(nearby_closed[i]),
            "days_supply_disrupted": int(days_disrupted[i]),
            "weather_severity": round(float(weather[i]), 4),
            "stockout_risk": int(stockout_risk[i]),
        }
        for i in range(N_SCENARIOS)
    ]


def main() -> None:
    store_ids = load_store_ids()
    print(f"Loaded {len(store_ids)} stores from {STORES_PATH}")

    # Assign each store a fixed size (consistent across all its scenarios)
    store_sizes = {sid: RNG.choice(STORE_SIZES) for sid in store_ids}

    rows = []
    for sid in store_ids:
        rows.extend(generate_scenarios(sid, store_sizes[sid]))

    df = pd.DataFrame(rows)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUTPUT_PATH, index=False)

    print(f"Total rows   : {len(df):,}")
    print(f"Class balance:\n{df['stockout_risk'].value_counts().to_string()}")
    print(f"Saved → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
