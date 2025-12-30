# backend/reporting.py

from pathlib import Path
from models import ScanReport  # <-- plain import, not relative
import json
from datetime import datetime, timezone

# data/reports.jsonl (relative to backend folder)
REPORTS_PATH = Path(__file__).parent / "data" / "reports.jsonl"


def append_scan_report(report: ScanReport) -> None:
    """
    Append a single ScanReport as one line of JSON to reports.jsonl.

    This is your 'live report' log. Each scan of a page will write
    one line here, so you can analyze unknown/low-confidence fields later.
    """
    REPORTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with REPORTS_PATH.open("a", encoding="utf-8") as f:
        f.write(report.json() + "\n")


RAG_TRACE_PATH = Path(__file__).parent / "data" / "rag_traces.jsonl"


def append_rag_trace(payload: dict) -> None:
    """
    Append one line of JSON for Gemini/RAG decisions (debugging only).
    """
    RAG_TRACE_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    with RAG_TRACE_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")