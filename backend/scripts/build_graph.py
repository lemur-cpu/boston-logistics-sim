"""
One-time script: download Boston road network via OSMnx and serialize for runtime use.

Usage (from repo root):
    python backend/scripts/build_graph.py

Output:
    backend/app/data/road_graph.pkl
"""
import joblib
from pathlib import Path

OUTPUT_PATH = Path(__file__).parent.parent / "app" / "data" / "road_graph.pkl"


def main() -> None:
    import osmnx as ox

    print("Downloading Boston drive network from OSM…")
    G = ox.graph_from_place("Boston, Massachusetts, USA", network_type="drive")

    print("Adding edge speeds and travel times…")
    G = ox.add_edge_speeds(G)
    G = ox.add_edge_travel_times(G)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(G, OUTPUT_PATH)

    print(f"Nodes : {len(G.nodes):,}")
    print(f"Edges : {len(G.edges):,}")
    print(f"Saved → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
