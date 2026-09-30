import os
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock

import pytest


TEST_ROOT = Path(tempfile.mkdtemp(prefix="ube-inspection-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{(TEST_ROOT / 'test.db').as_posix()}"
os.environ["UPLOAD_DIR"] = str(TEST_ROOT / "uploads")

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import Inspection


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr("app.main.asyncio.sleep", AsyncMock())
    with TestClient(app) as test_client:
        yield test_client


def analyse(client: TestClient, filename: str, content_type: str = "image/jpeg"):
    return client.post(
        "/api/analyse",
        data={"lot_number": "PB-2026-001"},
        files={"image": (filename, b"demo-image-content", content_type)},
    )


@pytest.mark.parametrize(
    ("filename", "recommendation", "confidence", "defect"),
    [
        ("good-pass.jpg", "Pass", 94, "None"),
        ("sample-torn.jpg", "Fail", 92, "Torn or Damaged Bag"),
        ("sample-stain.png", "Fail", 90, "Stain or Contamination"),
        ("sample-print.webp", "Fail", 91, "Printing Defect"),
        ("unknown.jpg", "Manual Review", 65, "None"),
    ],
)
def test_filename_analysis_mapping(
    client,
    filename,
    recommendation,
    confidence,
    defect,
):
    response = analyse(client, filename)
    assert response.status_code == 200
    body = response.json()
    assert body["recommendation"] == recommendation
    assert body["confidence_score"] == confidence
    assert body["defect_category"] == defect


def test_lot_lookup_and_missing_lot(client):
    response = client.get("/api/lots/PB-2026-001")
    assert response.status_code == 200
    assert response.json()["product_name"] == "Industrial Paper Bag"
    assert client.get("/api/lots/UNKNOWN").status_code == 404


def test_rejects_unsupported_file_type(client):
    response = analyse(client, "document.pdf", "application/pdf")
    assert response.status_code == 415


def test_create_filter_and_read_inspection(client):
    analysis = analyse(client, "good-pass.jpg").json()
    payload = {
        "lot_number": "PB-2026-001",
        "image_filename": analysis["image_filename"],
        "stored_image_filename": analysis["stored_image_filename"],
        "ai_recommendation": analysis["recommendation"],
        "confidence_score": analysis["confidence_score"],
        "ai_defect_category": analysis["defect_category"],
        "inspector_final_decision": "Pass",
        "inspector_note": "Bag is in good condition.",
        "override_reason": "",
    }
    created = client.post("/api/inspections", json=payload)
    assert created.status_code == 201
    inspection_id = created.json()["inspection_id"]
    assert inspection_id.startswith("INS-")

    filtered = client.get("/api/inspections", params={"lot_number": "pb-2026-001"})
    assert filtered.status_code == 200
    assert any(row["inspection_id"] == inspection_id for row in filtered.json())

    detail = client.get(f"/api/inspections/{inspection_id}")
    assert detail.status_code == 200
    assert detail.json()["image_url"].startswith("/uploads/")
    assert client.get("/api/inspections/INS-MISSING").status_code == 404


def test_override_reason_is_required(client):
    analysis = analyse(client, "good-pass.jpg").json()
    payload = {
        "lot_number": "PB-2026-001",
        "image_filename": analysis["image_filename"],
        "stored_image_filename": analysis["stored_image_filename"],
        "ai_recommendation": "Pass",
        "confidence_score": 94,
        "ai_defect_category": "None",
        "inspector_final_decision": "Fail",
        "inspector_note": "",
        "override_reason": " ",
    }
    response = client.post("/api/inspections", json=payload)
    assert response.status_code == 422

    payload["override_reason"] = "A seam split was visible on manual review."
    assert client.post("/api/inspections", json=payload).status_code == 201


def test_final_decision_must_be_pass_or_fail(client):
    analysis = analyse(client, "unknown.jpg").json()
    payload = {
        "lot_number": "PB-2026-001",
        "image_filename": analysis["image_filename"],
        "stored_image_filename": analysis["stored_image_filename"],
        "ai_recommendation": "Manual Review",
        "confidence_score": 65,
        "ai_defect_category": "None",
        "inspector_final_decision": "Manual Review",
        "inspector_note": "",
        "override_reason": "",
    }
    assert client.post("/api/inspections", json=payload).status_code == 422

    payload["inspector_final_decision"] = "Pass"
    assert client.post("/api/inspections", json=payload).status_code == 201


def test_history_keeps_legacy_manual_review_records(client):
    record = Inspection(
        inspection_id="INS-LEGACY1",
        lot_number="PB-2026-002",
        product_name="Industrial Paper Bag",
        product_type="Paper Bag",
        production_date="2026-07-16",
        image_filename="legacy.jpg",
        stored_image_filename="legacy-history.jpg",
        ai_recommendation="Manual Review",
        confidence_score=65,
        ai_defect_category="None",
        inspector_final_decision="Manual Review",
        inspector_note="Saved by an earlier demo version.",
        override_reason=None,
        inspection_timestamp="2026-07-20T08:00:00Z",
    )
    with SessionLocal() as db:
        db.merge(record)
        db.commit()

    response = client.get("/api/inspections")
    assert response.status_code == 200
    legacy = next(
        row for row in response.json() if row["inspection_id"] == "INS-LEGACY1"
    )
    assert legacy["inspector_final_decision"] == "Manual Review"


def test_delete_inspection_removes_record_and_uploaded_image(client):
    analysis = analyse(client, "delete-pass.jpg").json()
    payload = {
        "lot_number": "PB-2026-003",
        "image_filename": analysis["image_filename"],
        "stored_image_filename": analysis["stored_image_filename"],
        "ai_recommendation": analysis["recommendation"],
        "confidence_score": analysis["confidence_score"],
        "ai_defect_category": analysis["defect_category"],
        "inspector_final_decision": "Pass",
        "inspector_note": "",
        "override_reason": "",
    }
    created = client.post("/api/inspections", json=payload)
    inspection_id = created.json()["inspection_id"]
    image_path = TEST_ROOT / "uploads" / analysis["stored_image_filename"]
    assert image_path.is_file()

    deleted = client.delete(f"/api/inspections/{inspection_id}")
    assert deleted.status_code == 200
    assert deleted.json() == {"inspection_id": inspection_id}
    assert client.get(f"/api/inspections/{inspection_id}").status_code == 404
    assert client.delete(f"/api/inspections/{inspection_id}").status_code == 404
    assert not image_path.exists()
