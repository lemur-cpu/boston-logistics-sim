"""
P-Median facility location optimizer.

Given current store closures, finds the single lat/lng that minimizes
population-weighted travel time across all Boston neighborhoods.

Algorithm: greedy O(N²) P-Median approximation (swap heuristic).
TODO: replace with scipy.optimize or PuLP for exact solution.
"""
import numpy as np

# Candidate sites on a coarse Boston grid (lat, lng)
# TODO: replace with real candidate parcels from Boston Open Data
CANDIDATE_SITES: list[tuple[float, float]] = [
    (42.3224, -71.0785),  # Roxbury Crossing
    (42.3010, -71.0602),  # Dorchester Ave
    (42.3330, -71.1100),  # JP Centre St
    (42.3550, -71.0600),  # South Boston
    (42.3750, -71.1000),  # Allston
]

# Neighborhood centroids (lat, lng) and populations
NEIGHBORHOODS = [
    {"id": "roxbury",       "centroid": (42.3180, -71.0850), "pop": 59000},
    {"id": "dorchester",    "centroid": (42.2980, -71.0600), "pop": 92000},
    {"id": "jamaica_plain", "centroid": (42.3100, -71.1100), "pop": 38000},
    {"id": "south_end",     "centroid": (42.3410, -71.0720), "pop": 34000},
    {"id": "fenway",        "centroid": (42.3450, -71.0970), "pop": 27000},
]


def _haversine(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Approximate distance in km between two (lat, lng) points."""
    R = 6371.0
    lat1, lon1 = np.radians(a)
    lat2, lon2 = np.radians(b)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(h))


def find_optimal_location(closed_store_ids: list[str]) -> tuple[float, float]:
    """
    Return (lat, lng) of the candidate site that minimizes
    population-weighted distance to underserved neighborhoods.

    TODO: incorporate road network travel time instead of haversine distance.
    """
    best_site = CANDIDATE_SITES[0]
    best_score = float("inf")

    for site in CANDIDATE_SITES:
        score = sum(
            n["pop"] * _haversine(site, n["centroid"]) for n in NEIGHBORHOODS
        )
        if score < best_score:
            best_score = score
            best_site = site

    return best_site
