from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional


class DisruptedEdge(BaseModel):
    node_from: int
    node_to: int


class SimulationRequest(BaseModel):
    closed_store_ids: list[str] = Field(default_factory=list)
    disruptions: list[DisruptedEdge] = Field(default_factory=list)
    demand_overrides: dict[str, float] = Field(default_factory=dict)
    weather_severity: float = Field(default=0.0, ge=0.0, le=1.0)


class TopFactor(BaseModel):
    feature: str
    direction: str  # "increases" | "decreases"
    magnitude: float


class NeighborhoodAccess(BaseModel):
    id: str
    name: str
    access_time_minutes: float
    baseline_minutes: float


class StoreRisk(BaseModel):
    store_id: str
    name: str
    lat: float
    lon: float
    stockout_probability: float
    top_factors: list[TopFactor]


class RecommendedLocation(BaseModel):
    lat: float
    lon: float
    covered_residents: int
    reason: str


class SimulationResponse(BaseModel):
    neighborhood_access: list[NeighborhoodAccess]
    store_risks: list[StoreRisk]
    resilience_score: float
    recommended_store_location: Optional[RecommendedLocation] = None
