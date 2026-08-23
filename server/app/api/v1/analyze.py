"""API Endpoints for Skin Tone, Undertone, Face Shape, and Body Shape Analysis."""

import sys
import os
from typing import Optional
from fastapi import APIRouter, Header, HTTPException

# Ensure ai_engine is importable
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai_engine.models.skin_analyzer import SkinAnalyzer
from ai_engine.models.face_classifier import FaceShapeClassifier
from ai_engine.models.body_classifier import BodyShapeClassifier
from ai_engine.models.face_analyzer import FaceAnalyzer
from ai_engine.models.body_analyzer import analyze_body_landmarks_payload
from ai_engine.models.mock_generator import MockDataGenerator

from ...config import get_settings
from ...schemas import (
    SkinAnalyzeRequest,
    SkinAnalyzeResponse,
    RatioAnalyzeRequest,
    RatioAnalyzeResponse,
    FaceShapeResponse,
    BodyShapeResponse,
    MonkToneResponse,
    UndertoneResponse,
    ColorItem,
    LandmarkAnalysisRequest,
    LandmarkAnalysisResponse,
    LandmarkAnalysisMeta,
    FaceShapeMultiOut,
    ClassificationOut,
    MeasurementsIn,
    PillarOut,
    NarrativeOut,
    BodyLandmarkAnalysisRequest,
    BodyAnalysisResponse,
    BodyShapeClassificationOut,
    TorsoLegBalanceOut,
    BodyPillarOut,
    BodyMeasurementsIn,
)

router = APIRouter(prefix="/analyze", tags=["Personal Profiling Analysis"])

skin_analyzer = SkinAnalyzer()
face_classifier = FaceShapeClassifier()
body_classifier = BodyShapeClassifier()


@router.post("/skin", response_model=SkinAnalyzeResponse)
def analyze_skin_tone(
    request: SkinAnalyzeRequest,
    x_mock_data: Optional[str] = Header(None, alias="X-Mock-Data"),
):
    """Analyzes a face ROI crop to determine Monk Skin Tone scale and Undertone."""
    settings = get_settings()
    is_mock = bool(settings.MOCK_MODE or (x_mock_data and x_mock_data.lower() in ("true", "1")))

    if is_mock or not request.image_base64 or len(request.image_base64) < 100:
        preset = MockDataGenerator.get_preset("indonesian_warm_sawo_matang")
        mt = preset["monk_tone"]
        ut = preset["undertone"]
        return SkinAnalyzeResponse(
            monk_tone=MonkToneResponse(
                index=mt["index"],
                code=mt["code"],
                hex=mt["hex"],
                delta_e=mt["delta_e"],
                description=mt["description"],
            ),
            undertone=UndertoneResponse(
                undertone=ut["undertone"],
                confidence=ut["confidence"],
                season=ut["season"],
                explanation=ut["explanation"],
                best_colors=[ColorItem(**c) for c in ut["best_colors"]],
                clash_colors=[ColorItem(**c) for c in ut["clash_colors"]],
            ),
            is_mock=True,
        )

    try:
        monk_res, undertone_res = skin_analyzer.analyze_from_base64(request.image_base64)
        return SkinAnalyzeResponse(
            monk_tone=MonkToneResponse(
                index=monk_res.index,
                code=monk_res.code,
                hex=monk_res.hex_value,
                delta_e=monk_res.distance_delta_e,
                description=monk_res.description,
            ),
            undertone=UndertoneResponse(
                undertone=undertone_res.undertone,
                confidence=undertone_res.confidence,
                season=undertone_res.season,
                explanation=undertone_res.explanation,
                best_colors=[ColorItem(**c) for c in undertone_res.best_colors],
                clash_colors=[ColorItem(**c) for c in undertone_res.clash_colors],
            ),
            is_mock=False,
        )
    except Exception as e:
        # Graceful fallback to mock if image decoding fails
        preset = MockDataGenerator.get_preset("indonesian_warm_sawo_matang")
        mt = preset["monk_tone"]
        ut = preset["undertone"]
        return SkinAnalyzeResponse(
            monk_tone=MonkToneResponse(
                index=mt["index"],
                code=mt["code"],
                hex=mt["hex"],
                delta_e=mt["delta_e"],
                description=mt["description"],
            ),
            undertone=UndertoneResponse(
                undertone=ut["undertone"],
                confidence=ut["confidence"],
                season=ut["season"],
                explanation=ut["explanation"],
                best_colors=[ColorItem(**c) for c in ut["best_colors"]],
                clash_colors=[ColorItem(**c) for c in ut["clash_colors"]],
            ),
            is_mock=True,
        )


@router.post("/ratios", response_model=RatioAnalyzeResponse)
def analyze_geometric_ratios(
    request: RatioAnalyzeRequest,
    x_mock_data: Optional[str] = Header(None, alias="X-Mock-Data"),
):
    """Analyzes geometric ratios extracted from MediaPipe Face Mesh & Pose."""
    settings = get_settings()
    is_mock = bool(settings.MOCK_MODE or (x_mock_data and x_mock_data.lower() in ("true", "1")))

    face_resp = None
    body_resp = None

    if is_mock or (not request.face_ratios and not request.body_ratios):
        preset = MockDataGenerator.get_preset("indonesian_warm_sawo_matang")
        f_data = preset["face_shape"]
        b_data = preset["body_shape"]
        return RatioAnalyzeResponse(
            face_shape=FaceShapeResponse(
                shape=f_data["shape"],
                confidence=f_data["confidence"],
                ratios=f_data["ratios"],
                glasses_recommendations=f_data["glasses_recommendations"],
                hat_recommendations=f_data["hat_recommendations"],
                styling_advice=f_data["styling_advice"],
            ),
            body_shape=BodyShapeResponse(
                shape=b_data["shape"],
                confidence=b_data["confidence"],
                ratios=b_data["ratios"],
                silhouette_recommendations=b_data["silhouette_recommendations"],
                jacket_recommendations=b_data["jacket_recommendations"],
                styling_advice=b_data["styling_advice"],
            ),
            is_mock=True,
        )

    if request.face_ratios:
        f_res = face_classifier.classify(request.face_ratios)
        face_resp = FaceShapeResponse(
            shape=f_res.shape,
            confidence=f_res.confidence,
            ratios=f_res.ratios,
            glasses_recommendations=f_res.glasses_recommendations,
            hat_recommendations=f_res.hat_recommendations,
            styling_advice=f_res.styling_advice,
        )
    else:
        preset = MockDataGenerator.get_preset("indonesian_warm_sawo_matang")
        f_data = preset["face_shape"]
        face_resp = FaceShapeResponse(
            shape=f_data["shape"],
            confidence=f_data["confidence"],
            ratios=f_data["ratios"],
            glasses_recommendations=f_data["glasses_recommendations"],
            hat_recommendations=f_data["hat_recommendations"],
            styling_advice=f_data["styling_advice"],
        )

    if request.body_ratios:
        b_res = body_classifier.classify(request.body_ratios)
        body_resp = BodyShapeResponse(
            shape=b_res.shape,
            confidence=b_res.confidence,
            ratios=b_res.ratios,
            silhouette_recommendations=b_res.silhouette_recommendations,
            jacket_recommendations=b_res.jacket_recommendations,
            styling_advice=b_res.styling_advice,
        )
    else:
        preset = MockDataGenerator.get_preset("indonesian_warm_sawo_matang")
        b_data = preset["body_shape"]
        body_resp = BodyShapeResponse(
            shape=b_data["shape"],
            confidence=b_data["confidence"],
            ratios=b_data["ratios"],
            silhouette_recommendations=b_data["silhouette_recommendations"],
            jacket_recommendations=b_data["jacket_recommendations"],
            styling_advice=b_data["styling_advice"],
        )

    return RatioAnalyzeResponse(
        face_shape=face_resp,
        body_shape=body_resp,
        is_mock=False,
    )


def _landmarks_mock_response() -> LandmarkAnalysisResponse:
    """Fallback deterministik dari preset multi-dimensi (zero-hardware / judge demo)."""
    preset = MockDataGenerator.get_preset("indonesian_multi_dim")
    return LandmarkAnalysisResponse(
        face_shape=FaceShapeMultiOut(**preset["face_shape"]),
        body_shape=BodyShapeResponse(**preset["body_shape"]),
        nose=ClassificationOut(**preset["nose"]),
        eye=ClassificationOut(**preset["eye"]),
        brow=ClassificationOut(**preset["brow"]),
        measurements=MeasurementsIn(**preset["measurements"]),
        pillars=[PillarOut(**p) for p in preset["pillars"]],
        narrative=NarrativeOut(**preset["narrative"]),
        meta=LandmarkAnalysisMeta(engine_version="2.0.0", source="mock"),
        is_mock=True,
    )


@router.post("/landmarks", response_model=LandmarkAnalysisResponse)
def analyze_landmarks(
    request: LandmarkAnalysisRequest,
    x_mock_data: Optional[str] = Header(None, alias="X-Mock-Data"),
):
    """Multi-dimensional landmark analysis (ADR-014).

    Payload hanya berisi fitur turunan (angka) dari 478 landmark MediaPipe —
    tidak pernah gambar wajah (kepatuhan UU PDP No. 27/2022 by design).
    """
    settings = get_settings()
    is_mock = bool(settings.MOCK_MODE or (x_mock_data and x_mock_data.lower() in ("true", "1")))

    if is_mock:
        return _landmarks_mock_response()

    try:
        out = FaceAnalyzer.analyze(request)
        return LandmarkAnalysisResponse(
            face_shape=FaceShapeMultiOut(**out["face_shape"]),
            nose=ClassificationOut(**out["nose"]),
            eye=ClassificationOut(**out["eye"]),
            brow=ClassificationOut(**out["brow"]),
            measurements=out["measurements"],
            pillars=[PillarOut(**p) for p in out["pillars"]],
            narrative=NarrativeOut(**out["narrative"]),
            meta=LandmarkAnalysisMeta(**out["meta"]),
            is_mock=False,
        )
    except Exception:
        # Graceful degradation: engine gagal → preset deterministik, demo tetap jalan
        return _landmarks_mock_response()


@router.post("/body-landmarks", response_model=BodyAnalysisResponse)
def analyze_body_landmarks(
    request: BodyLandmarkAnalysisRequest,
    x_mock_data: Optional[str] = Header(None, alias="X-Mock-Data"),
):
    """Multi-dimensional full-body landmark analysis.

    Payload hanya berisi fitur turunan antropometri (angka) dari 33 landmark pose —
    tidak pernah foto tubuh (kepatuhan UU PDP No. 27/2022).
    """
    settings = get_settings()
    is_mock = bool(settings.MOCK_MODE or (x_mock_data and x_mock_data.lower() in ("true", "1")))

    try:
        raw_payload = request.model_dump()
        out = analyze_body_landmarks_payload(raw_payload)

        return BodyAnalysisResponse(
            body_shape=BodyShapeClassificationOut(**out["body_shape"]),
            torso_leg_balance=TorsoLegBalanceOut(**out["torso_leg_balance"]),
            measurements_cm=BodyMeasurementsIn(**out["measurements_cm"]),
            pillars=[BodyPillarOut(**p) for p in out["pillars"]],
            narrative=NarrativeOut(**out["narrative"]),
            timestamp=out["timestamp"],
        )
    except Exception as e:
        # Graceful fallback: return deterministic Hourglass/Rectangle preset
        from ai_engine.models.body_analyzer import BodyAnalyzer
        fallback_analyzer = BodyAnalyzer()
        out = fallback_analyzer.analyze(
            body_ratios={"shoulder_to_hip_ratio": 1.0, "waist_to_hip_ratio": 0.78, "waist_to_shoulder_ratio": 0.78, "torso_to_leg_ratio": 0.85},
            measurements_cm={"shoulder_width_cm": 42.0, "waist_width_cm": 32.8, "hip_width_cm": 38.0, "torso_length_cm": 48.0, "leg_length_cm": 82.0, "total_height_cm": 165.0, "body_proportion": "1.1 : 0.9 : 1.0", "calibration": "height_input"},
            user_height_cm=165.0,
        )
        return BodyAnalysisResponse(
            body_shape=BodyShapeClassificationOut(**out["body_shape"]),
            torso_leg_balance=TorsoLegBalanceOut(**out["torso_leg_balance"]),
            measurements_cm=BodyMeasurementsIn(**out["measurements_cm"]),
            pillars=[BodyPillarOut(**p) for p in out["pillars"]],
            narrative=NarrativeOut(**out["narrative"]),
            timestamp=out["timestamp"],
        )


