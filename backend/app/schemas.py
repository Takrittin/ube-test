from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


FinalDecision = Literal["Pass", "Fail"]
AIRecommendation = Literal["Pass", "Fail", "Manual Review"]
HistoricalDecision = Literal["Pass", "Fail", "Manual Review"]
DefectCategory = Literal[
    "None",
    "Torn or Damaged Bag",
    "Printing Defect",
    "Stain or Contamination",
]


class LotResponse(BaseModel):
    lot_number: str
    product_name: str
    product_type: str
    production_date: str


class AnalysisResponse(BaseModel):
    recommendation: AIRecommendation
    confidence_score: float
    defect_category: DefectCategory
    image_filename: str
    stored_image_filename: str
    image_url: str


class InspectionCreate(BaseModel):
    lot_number: str
    image_filename: str
    stored_image_filename: str
    ai_recommendation: AIRecommendation
    confidence_score: float = Field(ge=0, le=100)
    ai_defect_category: DefectCategory
    inspector_final_decision: FinalDecision
    inspector_note: str | None = Field(default=None, max_length=1000)
    override_reason: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def require_override_reason(self):
        if (
            self.ai_recommendation != "Manual Review"
            and self.inspector_final_decision != self.ai_recommendation
            and not (self.override_reason or "").strip()
        ):
            raise ValueError(
                "Override reason is required when the final decision differs "
                "from the AI recommendation."
            )
        return self


class InspectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    inspection_id: str
    lot_number: str
    product_name: str
    product_type: str
    production_date: str
    image_filename: str
    image_url: str
    ai_recommendation: AIRecommendation
    confidence_score: float
    ai_defect_category: DefectCategory
    inspector_final_decision: HistoricalDecision
    inspector_note: str | None
    override_reason: str | None
    inspection_timestamp: str


class InspectionDeleteResponse(BaseModel):
    inspection_id: str
