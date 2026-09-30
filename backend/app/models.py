from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    inspection_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    lot_number: Mapped[str] = mapped_column(String(32), index=True)
    product_name: Mapped[str] = mapped_column(String(120))
    product_type: Mapped[str] = mapped_column(String(80))
    production_date: Mapped[str] = mapped_column(String(10))
    image_filename: Mapped[str] = mapped_column(String(255))
    stored_image_filename: Mapped[str] = mapped_column(String(255), unique=True)
    ai_recommendation: Mapped[str] = mapped_column(String(24))
    confidence_score: Mapped[float] = mapped_column(Float)
    ai_defect_category: Mapped[str] = mapped_column(String(80))
    inspector_final_decision: Mapped[str] = mapped_column(String(24))
    inspector_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    inspection_timestamp: Mapped[str] = mapped_column(String(32), index=True)

