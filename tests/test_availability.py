"""Runs the shared availability cases against server.py's rules.

Usage: python3 tests/test_availability.py
"""
import json
import os
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import server  # noqa: E402

with open(os.path.join(ROOT, "tests", "availability-cases.json"), encoding="utf-8") as f:
    SPEC = json.load(f)

NOW = datetime.fromisoformat(SPEC["now"].replace("Z", "+00:00")).timestamp()
failed = 0
for case in SPEC["cases"]:
    result = server.compute_availability(
        case["date"], SPEC["orders"], SPEC["hireItems"], {**SPEC["settings"], **case.get("settings", {})}, NOW, case.get("ignore")
    )
    problems = [
        f"{pid} free {result['items'][pid]['free']}, expected {free}"
        for pid, free in case["expect"].items()
        if result["items"][pid]["free"] != free
    ]
    if result["dayFull"] != case["dayFull"]:
        problems.append(f"dayFull {result['dayFull']}, expected {case['dayFull']}")
    if problems:
        failed += 1
        print(f"FAIL {case['name']}: {'; '.join(problems)}")
    else:
        print(f"pass {case['name']}")

if failed:
    print(f"{failed} of {len(SPEC['cases'])} failed")
    sys.exit(1)
print(f"all {len(SPEC['cases'])} passed")
