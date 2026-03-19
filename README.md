# Boston Logistics Simulator

Interactive urban logistics simulation for Greater Boston. Toggle store closures, spike neighborhood demand, and introduce road disruptions to see how grocery access time, stockout risk, and network resilience respond in real time.

[Live Demo](https://your-vercel-url.vercel.app)

---

## Architecture

```
Browser (React + Mapbox)
     ↓ POST /simulate
FastAPI Backend
     ↓                    ↓
OSMnx Road Graph    XGBoost Model
     ↓                    ↓
NetworkX Dijkstra   SHAP Explainer
     ↓                    ↓
     └──── SimulationResponse ────→ UI
```

---

## Tech Stack

| Layer     | Tech                                                          |
|-----------|---------------------------------------------------------------|
| Frontend  | React 18, TypeScript, Mapbox GL JS, Zustand, Recharts        |
| Backend   | Python, FastAPI, OSMnx, NetworkX                             |
| ML        | XGBoost, SHAP, scikit-learn                                  |
| Data      | OSM Overpass, USDA FARA, Census ACS                          |
| Deploy    | Vercel (frontend), Fly.io (backend)                          |

---

## Dataset Sources

| Dataset              | Source              | Use                     |
|----------------------|---------------------|-------------------------|
| Road network         | OpenStreetMap/OSMnx | Graph traversal         |
| Grocery stores       | OSM Overpass API    | Store locations         |
| Neighborhoods        | Analyze Boston      | Choropleth + centroids  |
| Demographics         | Census ACS 5-year   | Population weights      |
| Food access baseline | USDA FARA           | Stockout features       |
| EMS stations         | Analyze Boston      | ER delay baseline       |

---

## Local Dev Setup

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python scripts/build_graph.py
python scripts/fetch_stores.py
python scripts/generate_training_data.py
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env  # add VITE_MAPBOX_TOKEN
npm run dev
```

---

## Model Notes

The stockout risk classifier (XGBoost) was trained on synthetically generated labels derived from a deterministic demand-disruption scoring rule applied to real store and neighborhood data. AUC-ROC: 0.9982 on held-out synthetic data. High AUC is expected — the model is recovering a known rule. In production, labels would be replaced with POS-derived stockout events; the pipeline architecture is identical.

SHAP values are computed per inference call and surface the top 2 contributing features in the UI.

---

## Deploy

**Frontend (Vercel)**
- Connect GitHub repo to Vercel
- Set environment variable: `VITE_MAPBOX_TOKEN`
- Build command: `npm run build`
- Output dir: `dist`

**Backend (Fly.io)**
- `fly launch` (from `backend/`)
- `fly secrets set FRONTEND_URL=https://your-vercel-url.vercel.app`
- `fly deploy`

Note: data files (pkl, parquet, geojson) must be built locally and copied into the container before deploy. They are not committed to git.
