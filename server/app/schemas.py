"""Pydantic v2 Validation Schemas for COBA REST API."""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "COBA Fashion AI Backend"
    version: str = "1.0.0"
    mock_mode: bool = False


# --- Skin Tone & Undertone Schemas ---
class SkinAnalyzeRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded JPEG/PNG crop of face ROI")


class MonkToneResponse(BaseModel):
    index: int
    code: str
    hex: str
    delta_e: float
    description: str


class ColorItem(BaseModel):
    name: str
    hex: str
    category: Optional[str] = None
    reason: Optional[str] = None


class UndertoneResponse(BaseModel):
    undertone: str
    confidence: float
    season: str
    explanation: str
    best_colors: List[ColorItem]
    clash_colors: List[ColorItem]


class SkinAnalyzeResponse(BaseModel):
    monk_tone: MonkToneResponse
    undertone: UndertoneResponse
    is_mock: bool = False


# --- Ratio Analysis Schemas ---
class RatioAnalyzeRequest(BaseModel):
    face_ratios: Optional[Dict[str, float]] = Field(
        default=None,
        description="Geometric face ratios (face_width_to_height, jaw_to_forehead, cheekbone_to_jaw, chin_sharpness)"
    )
    body_ratios: Optional[Dict[str, float]] = Field(
        default=None,
        description="Geometric body ratios (shoulder_to_hip_ratio, waist_to_hip_ratio, waist_to_shoulder_ratio)"
    )


class FaceShapeResponse(BaseModel):
    shape: str
    confidence: float
    ratios: Dict[str, float]
    glasses_recommendations: List[str]
    hat_recommendations: List[str]
    styling_advice: str


class BodyShapeResponse(BaseModel):
    shape: str
    confidence: float
    ratios: Dict[str, float]
    silhouette_recommendations: List[str]
    jacket_recommendations: List[str]
    styling_advice: str


class RatioAnalyzeResponse(BaseModel):
    face_shape: Optional[FaceShapeResponse] = None
    body_shape: Optional[BodyShapeResponse] = None
    is_mock: bool = False


# --- Multi-Dimensional Landmark Analysis Schemas (ADR-014) ---
class FaceRatiosIn(BaseModel):
    face_width_to_height: float
    jaw_to_forehead: float
    cheekbone_to_jaw: float
    chin_sharpness: float
    chin_taper: Optional[float] = None


class MeasurementsIn(BaseModel):
    forehead_width_cm: Optional[float] = None
    cheekbone_width_cm: Optional[float] = None
    jaw_width_cm: Optional[float] = None
    face_height_cm: Optional[float] = None
    face_proportion: str = ""
    calibration: str = "ratio_only"  # "iris" | "ratio_only"


class NoseFeaturesIn(BaseModel):
    width_to_face: float
    length_to_height: float
    bridge_curvature: float
    bridge_linearity: Optional[float] = None
    tip_upturn: float
    alar_to_tip_ratio: float


class EyeFeaturesIn(BaseModel):
    ear_right: float
    ear_left: float
    canthal_tilt_right: float
    canthal_tilt_left: float
    eye_spacing_ratio: Optional[float] = None


class BrowFeaturesIn(BaseModel):
    arch_ratio_right: float
    arch_ratio_left: float


class QualityIn(BaseModel):
    roll_deg: float
    yaw_deg: float
    pitch_deg: float
    luminance: float
    face_width_ratio: float


class LandmarkAnalysisRequest(BaseModel):
    """Payload fitur turunan dari 478 landmark — angka saja, tanpa gambar (UU PDP)."""

    face_ratios: FaceRatiosIn
    measurements_cm: MeasurementsIn
    nose_features: NoseFeaturesIn
    eye_features: EyeFeaturesIn
    brow_features: BrowFeaturesIn
    quality: QualityIn


class ClassificationOut(BaseModel):
    label: str
    label_id: str
    confidence: float
    rule: Optional[str] = None


class FaceShapeMultiOut(BaseModel):
    shape: str
    label_indonesian: str
    confidence: float
    method: str  # "random_forest" | "rule_based" | "rule_override"
    ratios: Dict[str, float]
    glasses_recommendations: List[str]
    hat_recommendations: List[str]
    styling_advice: str


class PillarOut(BaseModel):
    pillar: int
    title: str
    principle: str
    scientific_basis: str
    application: str


class NarrativeOut(BaseModel):
    summary: str
    tips: List[str] = []


class LandmarkAnalysisMeta(BaseModel):
    engine_version: str = "2.0.0"
    source: str = "engine"  # "engine" | "mock"


class LandmarkAnalysisResponse(BaseModel):
    face_shape: FaceShapeMultiOut
    body_shape: Optional[BodyShapeResponse] = None
    nose: ClassificationOut
    eye: ClassificationOut
    brow: ClassificationOut
    measurements: MeasurementsIn
    pillars: List[PillarOut]
    narrative: NarrativeOut
    meta: LandmarkAnalysisMeta
    is_mock: bool = False


# --- Recommendation Schemas ---
class RecommendationRequest(BaseModel):
    subcategory: str = Field(..., description="Target subcategory: glasses, hats, shirts, jackets")
    user_profile: Dict[str, Any] = Field(
        default_factory=dict,
        description="Profile containing monk_tone, undertone, face_shape, body_shape"
    )
    quiz_answers: Dict[str, Any] = Field(
        default_factory=dict,
        description="Answers containing occasion, fit_preference, color_mood"
    )


class RecommendationItemSchema(BaseModel):
    rank: int
    archetype: str
    archetype_title: str
    id: str
    name: str
    category: str
    subcategory: str
    base_colour: str
    hex_colour: str
    usage: str
    model_3d_path: str
    preview_image_url: str
    price_idr: str
    compatibility_score: float
    color_match_score: float
    shape_match_score: float
    stylist_reason: str
    model_type: Optional[str] = None


class RecommendationResponse(BaseModel):
    subcategory: str
    primary_item_id: str
    items: List[RecommendationItemSchema]
    personal_summary: Dict[str, Any]
    is_mock: bool = False


# --- Catalog Schemas ---
class CatalogItemSchema(BaseModel):
    id: str
    name: str
    category: str
    subcategory: str
    gender: str
    baseColour: str
    hex_colour: str
    usage: str
    styleTags: List[str]
    flatteringFaceShapes: Optional[List[str]] = None
    flatteringBodyShapes: Optional[List[str]] = None
    model_3d_path: str
    preview_image_url: str
    description: str
    priceIdr: str


class CatalogResponse(BaseModel):
    total: int
    items: List[CatalogItemSchema]


class PresetItem(BaseModel):
    key: str
    name: str


class PresetsListResponse(BaseModel):
    presets: List[PresetItem]


# --- Dynamic Questionnaire Schemas ---
class QuestionOption(BaseModel):
    id: str
    label: str
    desc: str


class DynamicQuestion(BaseModel):
    id: str
    question: str
    reason: str
    options: List[QuestionOption]


class DynamicQuestionRequest(BaseModel):
    category: str = Field(..., description="Domain: accessories or apparel")
    subcategory: str = Field(..., description="Subcategory: glasses, hats, shirts, jackets")
    user_profile: Dict[str, Any] = Field(
        default_factory=dict,
        description="Profile dict with monk_tone, undertone, face_shape, body_shape"
    )
    previous_answers: Optional[Dict[str, str]] = Field(
        default=None,
        description="Previously answered question IDs and selected option IDs"
    )
    batch: int = Field(default=1, description="Question batch number (1=initial, 2=deep personalization)")


class DynamicQuestionsResponse(BaseModel):
    questions: List[Any]
    source: str = "local_bank"
    batch: int = 1
    is_mock: bool = False


# --- Full-Body Biometrics & Multi-Dimensional Schemas ---

class BodyRatiosIn(BaseModel):
    shoulder_to_hip_ratio: float
    waist_to_hip_ratio: float
    waist_to_shoulder_ratio: float
    torso_to_leg_ratio: float
    posture_symmetry: Optional[float] = 0.95


class BodyMeasurementsIn(BaseModel):
    shoulder_width_cm: Optional[float] = None
    waist_width_cm: Optional[float] = None
    hip_width_cm: Optional[float] = None
    torso_length_cm: Optional[float] = None
    leg_length_cm: Optional[float] = None
    total_height_cm: Optional[float] = None
    body_proportion: Optional[str] = "1.0 : 0.8 : 1.0"
    calibration: str = "height_input"  # "height_input" | "ratio_only"


class BodyQualityIn(BaseModel):
    is_frontal: bool = True
    yaw_deg: float = 0.0
    pitch_deg: float = 0.0
    roll_deg: float = 0.0
    full_body_visible: bool = True
    visibility_score: float = 1.0
    luminance: float = 128.0


class BodyLandmarkAnalysisRequest(BaseModel):
    """Payload fitur turunan dari 33 landmark pose tubuh — angka saja (UU PDP)."""
    body_ratios: BodyRatiosIn
    measurements_cm: BodyMeasurementsIn
    quality: Optional[BodyQualityIn] = Field(default_factory=BodyQualityIn)
    user_height_input_cm: Optional[float] = 165.0



class BodyPillarOut(BaseModel):
    pillar: str  # "upper_silhouette" | "lower_inseam" | "footwear_balance"
    title: str
    title_id: str
    recommendation: str
    reason: str
    scientific_basis: str


class BodyShapeClassificationOut(BaseModel):
    shape: str
    label_indonesian: str
    confidence: float
    method: str  # "ansur_ii_rule_engine" | "random_forest"
    ratios: Dict[str, float]
    topwear_recommendations: List[str]
    bottomwear_recommendations: List[str]
    footwear_recommendations: List[str]
    styling_advice: str


class TorsoLegBalanceOut(BaseModel):
    balance_type: str  # "Long Torso" | "Balanced" | "Long Legs"
    label_indonesian: str
    torso_to_leg_ratio: float
    advice: str


class BodyAnalysisResponse(BaseModel):
    body_shape: BodyShapeClassificationOut
    torso_leg_balance: TorsoLegBalanceOut
    measurements_cm: BodyMeasurementsIn
    pillars: List[BodyPillarOut]
    narrative: NarrativeOut
    timestamp: str


