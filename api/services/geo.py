import json
import math
from pathlib import Path
from shapely.geometry import shape, Point
import h3 as h3lib

WARDS_GEOJSON_PATH = Path(__file__).parent.parent / "wards.geojson"

_wards = None


def load_wards():
    with open(WARDS_GEOJSON_PATH) as f:
        data = json.load(f)
    return [(feat["properties"]["ward_id"], shape(feat["geometry"])) for feat in data["features"]]


def get_ward_for_point(lat: float, lng: float) -> str:
    global _wards
    if _wards is None:
        _wards = load_wards()
    pt = Point(lng, lat)
    for ward_id, polygon in _wards:
        if polygon.contains(pt):
            return ward_id
    return "ward_unknown"


def latlng_to_h3(lat: float, lng: float, resolution: int = 8) -> str:
    return h3lib.geo_to_h3(lat, lng, resolution)


def h3_to_latlng(h3_cell: str):
    return h3lib.h3_to_geo(h3_cell)
