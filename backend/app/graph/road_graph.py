"""
Boston road network graph.
Loaded once at startup; shared via app.state.road_graph.
"""
import json
import joblib
import networkx as nx
from pathlib import Path

import osmnx as ox

DATA_DIR = Path(__file__).parent.parent / "data"

# Free-flow speed limits underestimate real Boston drive times.
# This scalar aligns computed times with observed traffic conditions.
TRAFFIC_MULTIPLIER = 2.5

SUPERMARKET_KEYWORDS = {
    "stop & shop", "whole foods", "market basket", "shaw's", "shaws",
    "star market", "trader joe's", "trader joes", "h mart", "price rite",
    "roche bros", "demoulas", "aldi", "lidl", "costco", "walmart", "target",
    "wegmans", "c-town", "compare foods", "bravo", "western beef",
    "hannaford", "big y", "price chopper",
}


def _is_supermarket(name: str) -> bool:
    n = name.lower()
    return any(k in n for k in SUPERMARKET_KEYWORDS)
GRAPH_PATH = DATA_DIR / "road_graph.pkl"
STORES_PATH = DATA_DIR / "stores.geojson"
NEIGHBORHOODS_PATH = DATA_DIR / "neighborhoods.geojson"

# Used when neighborhoods.geojson has not been downloaded yet
FALLBACK_NEIGHBORHOODS = [
    {"id": "roxbury",        "name": "Roxbury",        "lat": 42.3180, "lon": -71.0850, "population": 59000},
    {"id": "dorchester",     "name": "Dorchester",     "lat": 42.2980, "lon": -71.0600, "population": 92000},
    {"id": "jamaica_plain",  "name": "Jamaica Plain",  "lat": 42.3100, "lon": -71.1100, "population": 38000},
    {"id": "south_end",      "name": "South End",      "lat": 42.3410, "lon": -71.0720, "population": 34000},
    {"id": "fenway",         "name": "Fenway",         "lat": 42.3450, "lon": -71.0970, "population": 27000},
    {"id": "back_bay",       "name": "Back Bay",       "lat": 42.3500, "lon": -71.0800, "population": 22000},
    {"id": "south_boston",   "name": "South Boston",   "lat": 42.3350, "lon": -71.0480, "population": 33000},
    {"id": "east_boston",    "name": "East Boston",    "lat": 42.3790, "lon": -71.0330, "population": 44000},
    {"id": "charlestown",    "name": "Charlestown",    "lat": 42.3782, "lon": -71.0603, "population": 18000},
    {"id": "allston",        "name": "Allston",        "lat": 42.3530, "lon": -71.1320, "population": 29000},
]


def _load_neighborhoods() -> list[dict]:
    if not NEIGHBORHOODS_PATH.exists():
        return FALLBACK_NEIGHBORHOODS
    fc = json.loads(NEIGHBORHOODS_PATH.read_text())
    hoods = []
    for f in fc.get("features", []):
        props = f.get("properties", {})
        coords = f["geometry"]["coordinates"][0]  # outer ring
        lats = [c[1] for c in coords]
        lons = [c[0] for c in coords]
        hoods.append({
            "id": props.get("id", props.get("Name", "unknown")),
            "name": props.get("name", props.get("Name", "Unknown")),
            "lat": (min(lats) + max(lats)) / 2,
            "lon": (min(lons) + max(lons)) / 2,
            "population": props.get("population", 0),
        })
    return hoods or FALLBACK_NEIGHBORHOODS


class RoadGraph:
    def __init__(self) -> None:
        print("Loading road graph…")
        self._G: nx.MultiDiGraph = joblib.load(GRAPH_PATH)

        fc = json.loads(STORES_PATH.read_text())
        self._stores: list[dict] = [
            f["properties"] for f in fc["features"]
            if _is_supermarket(f["properties"].get("name", ""))
        ]

        # Bulk snap all store locations to nearest graph nodes
        lons = [s["lon"] for s in self._stores]
        lats = [s["lat"] for s in self._stores]
        nodes = ox.nearest_nodes(self._G, lons, lats)
        self._store_nodes: dict[str, int] = {
            s["id"]: int(n) for s, n in zip(self._stores, nodes)
        }

        self._neighborhoods = _load_neighborhoods()

        # Bulk snap neighborhood centroids
        h_lons = [h["lon"] for h in self._neighborhoods]
        h_lats = [h["lat"] for h in self._neighborhoods]
        h_nodes = ox.nearest_nodes(self._G, h_lons, h_lats)
        self._neighborhood_nodes: dict[str, int] = {
            h["id"]: int(n) for h, n in zip(self._neighborhoods, h_nodes)
        }

        # Precompute baseline (all stores open, no disruptions)
        self._baseline_access = self._access_times(self._G, list(self._store_nodes.values()))
        print(f"RoadGraph ready — {len(self._stores)} stores, {len(self._neighborhoods)} neighborhoods")

    def nearest_node(self, lat: float, lon: float) -> int:
        return int(ox.nearest_nodes(self._G, lon, lat))

    def get_access_time(self, origin_node: int, destination_node: int) -> float:
        """Travel time in minutes between two graph nodes."""
        secs = nx.shortest_path_length(self._G, origin_node, destination_node, weight="travel_time")
        return secs / 60

    def apply_disruptions(self, disruptions: list) -> nx.MultiDiGraph:
        """Return a copy of the graph with disrupted edges removed."""
        G = self._G.copy()
        for d in disruptions:
            if G.has_edge(d.node_from, d.node_to):
                for k in list(G[d.node_from][d.node_to]):
                    G.remove_edge(d.node_from, d.node_to, key=k)
        return G

    def compute_neighborhood_access(self, closed_store_ids: list[str], disruptions: list) -> list:
        from app.schemas import NeighborhoodAccess
        open_nodes = [
            self._store_nodes[s["id"]]
            for s in self._stores
            if s["id"] not in closed_store_ids and s["id"] in self._store_nodes
        ]
        G_disrupted = self.apply_disruptions(disruptions)
        current = self._access_times(G_disrupted, open_nodes)
        return [
            NeighborhoodAccess(
                id=h["id"],
                name=h["name"],
                access_time_minutes=current[h["id"]],
                baseline_minutes=self._baseline_access[h["id"]],
            )
            for h in self._neighborhoods
        ]

    def _access_times(self, G: nx.MultiDiGraph, store_nodes: list[int]) -> dict[str, float]:
        """
        For each neighborhood centroid, return travel time (minutes) to the nearest store.
        Uses reverse-graph multi-source Dijkstra: one pass covers all neighborhoods.
        """
        if not store_nodes:
            return {h["id"]: 999.0 for h in self._neighborhoods}

        G_rev = G.reverse(copy=False)
        dist = dict(nx.multi_source_dijkstra_path_length(G_rev, store_nodes, weight="travel_time"))
        result = {}
        for h in self._neighborhoods:
            secs = dist.get(self._neighborhood_nodes[h["id"]], float("inf"))
            result[h["id"]] = round(secs / 60 * TRAFFIC_MULTIPLIER, 2) if secs != float("inf") else 999.0
        return result
