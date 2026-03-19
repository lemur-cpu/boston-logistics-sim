from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.graph.road_graph import RoadGraph
from app.models.stockout import StockoutModel
from app.routes import simulate, stores, neighborhoods, recommend


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.road_graph = RoadGraph()
    app.state.stockout_model = StockoutModel()
    yield


app = FastAPI(title="Boston Logistics Simulator", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulate.router)
app.include_router(stores.router)
app.include_router(neighborhoods.router)
app.include_router(recommend.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
