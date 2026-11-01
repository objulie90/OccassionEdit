"""Writes the public part of data/site-data.json for the preview build.

Uses the server's own filter, so the preview carries exactly what visitors to
the live site receive and never a sheet secret or bank detail.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import server  # noqa: E402

public = server.get_default_site_data()
public.pop("sheetConfig", None)
target = os.path.join(ROOT, "src", "data", "preview-site-data.json")
with open(target, "w", encoding="utf-8") as f:
    json.dump(public, f, ensure_ascii=False)
print(f"wrote {os.path.relpath(target, ROOT)}")
