import json
from pathlib import Path

ROUTING_TABLE_PATH = Path(__file__).parent.parent / "routing_table.json"

_routing = None


def get_routing():
    global _routing
    if _routing is None:
        with open(ROUTING_TABLE_PATH) as f:
            _routing = json.load(f)
    return _routing


def route_complaint(category: str, ward_id: str) -> dict:
    routing = get_routing()
    cat = routing.get(category, routing.get("default", {}))
    assignment = cat.get(ward_id, cat.get("*", {"dept": "BBMP General", "officer": "Duty Officer"}))
    return assignment
