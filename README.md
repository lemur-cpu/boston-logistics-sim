# Boston Logistics Simulator

Interactive urban logistics simulation for Greater Boston. Toggle store closures,
introduce road disruptions, and spike neighborhood demand — the simulator predicts
grocery access time, stockout risk, and the optimal location for the next store.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  ┌──────────────┐  ┌──────────────────────┐  ┌───────────────┐  │
│  │ ControlPanel │  │   Map (Mapbox GL)     │  │ MetricsPanel  │  │
│  │  store toggle│  │  choropleth overlay  │  │ charts + SHAP │  │
│  │  demand slide│  │  store markers       │  │               │  │
│  └──────┬───────┘  └──────────────────────┘  └───────────────┘  │
│         │  Zustand simulationStore                               │
│         └──────────────── POST /simulate ──────────────────────►│
└────────────────────────────────────────────────────────────────┬┘
                                                                  │ HTTP
┌─────────────────────────────────────────────────────────────────▼┐
│  FastAPI (Python)                                                  │
│  /simulate  →  road_graph  →  NetworkX shortest-path              │
│             →  stockout.py →  XGBoost + SHAP                      │
│  /recommend →  facility.py →  P-Median optimizer                  │
│  /stores    →  GeoJSON (OSM Overpass)                             │
│  /neighborhoods → GeoJSON (Boston Open Data)                      │
└───────────────────────────────────────────────────────────────────┘
```

---

## Local Dev Setup

### Prerequisites
- Node ≥ 20, Python ≥ 3.11
- A [Mapbox access token](https://account.mapbox.com/)

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# One-time data setup (downloads ~200 MB from OSM)
python scripts/fetch_stores.py
python scripts/build_graph.py
python scripts/generate_training_data.py
# Then open notebooks/train_stockout_model.ipynb and run all cells

uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install

# Create .env.local
echo "VITE_MAPBOX_TOKEN=pk.your_token_here" > .env.local

npm run dev
# → http://localhost:5173
```

---

## Dataset Sources

| Dataset | Source | Script |
|---------|--------|--------|
| Boston road network | OpenStreetMap via OSMnx | `scripts/build_graph.py` |
| Grocery store locations | OSM Overpass API | `scripts/fetch_stores.py` |
| Neighborhood boundaries | [Analyze Boston Open Data](https://data.boston.gov) | manual download |
| Population by neighborhood | US Census ACS 2022 | manual download |
| Training labels | Synthetic (rule-based) | `scripts/generate_training_data.py` |

---

## Deploy

### Backend → Fly.io

```bash
cd backend
fly launch --no-deploy   # first time: sets up app
fly deploy
```

### Frontend → Vercel

```bash
cd frontend
vercel --prod
# Set VITE_MAPBOX_TOKEN in Vercel environment variables
# Set VITE_API_URL to your Fly.io app URL
```

---

## Project Structure

```
boston-logistics-sim/
├── frontend/src/
│   ├── components/   Map, ControlPanel, MetricsPanel, ExplainCard, StatusBar
│   ├── store/        Zustand simulation state
│   ├── hooks/        useSimulation (calls /simulate)
│   └── types/        Shared TypeScript interfaces
├── backend/app/
│   ├── routes/       simulate, stores, neighborhoods, recommend
│   ├── models/       stockout (XGBoost), facility (P-Median)
│   ├── graph/        road_graph (OSMnx + NetworkX)
│   └── schemas.py    Pydantic request/response models
└── backend/scripts/  One-time ETL + data generation
```
