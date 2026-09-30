import asyncio
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Inspection
from .schemas import (
    AnalysisResponse,
    InspectionCreate,
    InspectionDeleteResponse,
    InspectionResponse,
    LotResponse,
)


BACKEND_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BACKEND_DIR / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

SAMPLE_LOTS = {
    "PB-2026-001": {
        "lot_number": "PB-2026-001",
        "product_name": "Industrial Paper Bag",
        "product_type": "Paper Bag",
        "production_date": "2026-07-15",
    },
    "PB-2026-002": {
        "lot_number": "PB-2026-002",
        "product_name": "Industrial Paper Bag",
        "product_type": "Paper Bag",
        "production_date": "2026-07-16",
    },
    "PB-2026-003": {
        "lot_number": "PB-2026-003",
        "product_name": "Industrial Paper Bag",
        "product_type": "Paper Bag",
        "production_date": "2026-07-17",
    },
}

@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="UBE Smart Inspection Demo API",
    description="Local demo API for image-assisted product inspection.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def get_lot_or_404(lot_number: str) -> dict[str, str]:
    normalized = lot_number.strip().upper()
    lot = SAMPLE_LOTS.get(normalized)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot number not found.")
    return lot


def mock_result(filename: str) -> tuple[str, float, str]:
    lowered = filename.lower()
    if "pass" in lowered:
        return ("Pass", 94, "None")
    if "torn" in lowered:
        return ("Fail", 92, "Torn or Damaged Bag")
    if "stain" in lowered:
        return ("Fail", 90, "Stain or Contamination")
    if "print" in lowered:
        return ("Fail", 91, "Printing Defect")
    return ("Manual Review", 65, "None")


def serialize_inspection(record: Inspection) -> InspectionResponse:
    return InspectionResponse(
        inspection_id=record.inspection_id,
        lot_number=record.lot_number,
        product_name=record.product_name,
        product_type=record.product_type,
        production_date=record.production_date,
        image_filename=record.image_filename,
        image_url=f"/uploads/{record.stored_image_filename}",
        ai_recommendation=record.ai_recommendation,
        confidence_score=record.confidence_score,
        ai_defect_category=record.ai_defect_category,
        inspector_final_decision=record.inspector_final_decision,
        inspector_note=record.inspector_note,
        override_reason=record.override_reason,
        inspection_timestamp=record.inspection_timestamp,
    )


@app.get("/api/lots/{lot_number}", response_model=LotResponse)
def read_lot(lot_number: str) -> dict[str, str]:
    return get_lot_or_404(lot_number)


@app.post("/api/analyse", response_model=AnalysisResponse)
async def analyse_image(
    lot_number: str = Form(...),
    image: UploadFile = File(...),
) -> AnalysisResponse:
    get_lot_or_404(lot_number)
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Please upload a JPEG, PNG or WebP image.",
        )

    original_filename = Path(image.filename or "inspection-image").name
    extension = Path(original_filename).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
        extension = ALLOWED_IMAGE_TYPES[image.content_type]
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    contents = await image.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    (UPLOAD_DIR / stored_filename).write_bytes(contents)

    recommendation, confidence, defect = mock_result(original_filename)
    await asyncio.sleep(1)
    return AnalysisResponse(
        recommendation=recommendation,
        confidence_score=confidence,
        defect_category=defect,
        image_filename=original_filename,
        stored_image_filename=stored_filename,
        image_url=f"/uploads/{stored_filename}",
    )


@app.post(
    "/api/inspections",
    response_model=InspectionResponse,
    status_code=201,
)
def create_inspection(
    payload: InspectionCreate,
    db: Session = Depends(get_db),
) -> InspectionResponse:
    lot = get_lot_or_404(payload.lot_number)
    safe_stored_filename = Path(payload.stored_image_filename).name
    if safe_stored_filename != payload.stored_image_filename:
        raise HTTPException(status_code=400, detail="Invalid stored image filename.")
    if not (UPLOAD_DIR / safe_stored_filename).is_file():
        raise HTTPException(
            status_code=400,
            detail="The analysed image could not be found. Please analyse it again.",
        )

    record = Inspection(
        inspection_id=f"INS-{uuid.uuid4().hex[:8].upper()}",
        lot_number=lot["lot_number"],
        product_name=lot["product_name"],
        product_type=lot["product_type"],
        production_date=lot["production_date"],
        image_filename=Path(payload.image_filename).name,
        stored_image_filename=safe_stored_filename,
        ai_recommendation=payload.ai_recommendation,
        confidence_score=payload.confidence_score,
        ai_defect_category=payload.ai_defect_category,
        inspector_final_decision=payload.inspector_final_decision,
        inspector_note=(payload.inspector_note or "").strip() or None,
        override_reason=(payload.override_reason or "").strip() or None,
        inspection_timestamp=datetime.now(timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_inspection(record)


@app.get("/api/inspections", response_model=list[InspectionResponse])
def list_inspections(
    lot_number: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[InspectionResponse]:
    statement = select(Inspection)
    if lot_number and lot_number.strip():
        statement = statement.where(
            Inspection.lot_number.ilike(f"%{lot_number.strip()}%")
        )
    statement = statement.order_by(Inspection.inspection_timestamp.desc())
    records = db.scalars(statement).all()
    return [serialize_inspection(record) for record in records]


@app.get(
    "/api/inspections/{inspection_id}",
    response_model=InspectionResponse,
)
def read_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
) -> InspectionResponse:
    record = db.get(Inspection, inspection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found.")
    return serialize_inspection(record)


@app.delete(
    "/api/inspections/{inspection_id}",
    response_model=InspectionDeleteResponse,
)
def delete_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
) -> InspectionDeleteResponse:
    record = db.get(Inspection, inspection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found.")

    image_path = UPLOAD_DIR / Path(record.stored_image_filename).name
    db.delete(record)
    db.commit()

    try:
        image_path.unlink(missing_ok=True)
    except OSError:
        # The record is authoritative. A filesystem cleanup failure should not
        # make a completed database deletion appear unsuccessful.
        pass

    return InspectionDeleteResponse(inspection_id=inspection_id)
