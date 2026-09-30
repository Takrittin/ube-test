export type FinalDecision = "Pass" | "Fail";
export type AIRecommendation = FinalDecision | "Manual Review";

export type DefectCategory =
  | "None"
  | "Torn or Damaged Bag"
  | "Printing Defect"
  | "Stain or Contamination";

export interface Lot {
  lot_number: string;
  product_name: string;
  product_type: string;
  production_date: string;
}

export interface Analysis {
  recommendation: AIRecommendation;
  confidence_score: number;
  defect_category: DefectCategory;
  image_filename: string;
  stored_image_filename: string;
  image_url: string;
}

export interface PendingInspection {
  lot: Lot;
  analysis: Analysis;
  final_decision?: FinalDecision | null;
  inspector_note?: string;
  override_reason?: string;
  active_step?: 3 | 4;
}

export interface InspectionRecord {
  inspection_id: string;
  lot_number: string;
  product_name: string;
  product_type: string;
  production_date: string;
  image_filename: string;
  image_url: string;
  ai_recommendation: AIRecommendation;
  confidence_score: number;
  ai_defect_category: DefectCategory;
  inspector_final_decision: AIRecommendation;
  inspector_note: string | null;
  override_reason: string | null;
  inspection_timestamp: string;
}
