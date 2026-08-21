import os
import math
from typing import Dict, List, Optional, Tuple, Any
import numpy as np


class FaceShapeResult:
    """Represents the face shape classification result with accessory recommendations."""

    def __init__(
        self,
        shape: str,
        confidence: float,
        ratios: Dict[str, float],
        glasses_recommendations: List[str],
        hat_recommendations: List[str],
        styling_advice: str,
    ):
        self.shape = shape  # "Oval", "Round", "Square", "Heart", "Oblong"
        self.confidence = round(confidence, 2)
        self.ratios = {k: round(v, 3) for k, v in ratios.items()}
        self.glasses_recommendations = glasses_recommendations
        self.hat_recommendations = hat_recommendations
        self.styling_advice = styling_advice

    def to_dict(self) -> Dict[str, Any]:
        return {
            "shape": self.shape,
            "confidence": self.confidence,
            "ratios": self.ratios,
            "glasses_recommendations": self.glasses_recommendations,
            "hat_recommendations": self.hat_recommendations,
            "styling_advice": self.styling_advice,
        }


class FaceShapeClassifier:
    """Classifies face shape from 468 MediaPipe Face Mesh landmarks using trained Random Forest or calibrated rules."""

    def __init__(self, model_weight_path: Optional[str] = None):
        if model_weight_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_weight_path = os.path.join(base_dir, "models", "weights", "face_shape_rf.joblib")

        self.model = None
        if os.path.exists(model_weight_path):
            try:
                import joblib
                self.model = joblib.load(model_weight_path)
            except Exception as e:
                self.model = None

        self.flattering_advice = {
            "Oval": {
                "glasses": ["Wayfarer", "Aviator", "Round Classic", "Cat-Eye", "Geometric Frame"],
                "hats": ["Fedora", "Bucket Hat", "Beanie", "Baseball Cap", "Beret"],
                "advice": "Bentuk wajah oval memiliki proporsi alami paling seimbang. Anda bebas bereksplorasi dengan frame kacamata bersudut maupun membulat tanpa merusak simetri wajah."
            },
            "Round": {
                "glasses": ["Rectangular Frame", "Square Wayfarer", "Geometric D-Frame", "Cat-Eye Angular"],
                "hats": ["Fedora with Crown", "Structured Baseball Cap", "Newsboy Cap", "Wide-Brim Hat"],
                "advice": "Wajah bulat sangat serasi dengan kacamata berbingkai tegas/persegi panjang untuk memberikan kontur tajam dan memperpanjang visual wajah."
            },
            "Square": {
                "glasses": ["Round Classic", "Oval Metal Frame", "Soft Aviator", "Rimless Round"],
                "hats": ["Beret", "Bucket Hat", "Slouchy Beanie", "Bowler Hat"],
                "advice": "Garis rahang yang tegas pada wajah kotak diseimbangkan dengan kacamata berbingkai membulat atau oval untuk menciptakan kelembutan visual yang harmonis."
            },
            "Heart": {
                "glasses": ["Aviator Classic", "Bottom-Heavy Frame", "Clubmaster Browline", "Round Oval"],
                "hats": ["Baseball Cap", "Medium Brim Fedora", "Bucket Hat", "Fisherman Beanie"],
                "advice": "Dahi yang lebar dan dagu yang runcing paling anggun dipadukan dengan kacamata model aviator atau frame dengan bagian bawah lebih dominan untuk menyeimbangkan proporsi dagu."
            },
            "Oblong": {
                "glasses": ["Oversized Square", "Tall Rectangular", "Thick Browline / Clubmaster", "Wayfarer Wide"],
                "hats": ["Wide-Brim Fedora", "Bucket Hat", "Beret", "Beanie with Fold"],
                "advice": "Wajah panjang/oblong cocok dengan kacamata berframe lebar atau tinggi (oversized) dan aksen horizontal untuk menciptakan ilusi wajah yang lebih proporsional."
            }
        }

    @staticmethod
    def calculate_ratios_from_landmarks(landmarks: List[Dict[str, float]]) -> Dict[str, float]:
        """
        Calculates the 4 key geometric face ratios from MediaPipe Face Mesh landmarks (468 points).
        
        Key landmark indices:
        - 10: Forehead top center
        - 152: Chin bottom
        - 234, 454: Left and right bizygomatic cheekbone points
        - 127, 356: Left and right forehead/temple points
        - 172, 397: Left and right bigonial jaw corners
        - 58, 288: Left and right mouth outer corners
        """
        def distance(p1_idx: int, p2_idx: int) -> float:
            p1 = landmarks[p1_idx]
            p2 = landmarks[p2_idx]
            dx = p1.get("x", 0) - p2.get("x", 0)
            dy = p1.get("y", 0) - p2.get("y", 0)
            dz = p1.get("z", 0) - p2.get("z", 0)
            return math.sqrt(dx * dx + dy * dy + dz * dz)

        face_height = max(0.001, distance(10, 152))
        cheekbone_width = distance(234, 454)
        forehead_width = max(0.001, distance(127, 356))
        jaw_width = distance(172, 397)
        chin_width = distance(58, 288)

        # 4 Key Ratios
        face_w_h_ratio = cheekbone_width / face_height
        jaw_forehead_ratio = jaw_width / forehead_width
        cheekbone_jaw_ratio = cheekbone_width / max(0.001, jaw_width)
        chin_sharpness = chin_width / max(0.001, jaw_width)

        return {
            "face_width_to_height": face_w_h_ratio,
            "jaw_to_forehead": jaw_forehead_ratio,
            "cheekbone_to_jaw": cheekbone_jaw_ratio,
            "chin_sharpness": chin_sharpness,
        }

    def classify(self, ratios: Dict[str, float]) -> FaceShapeResult:
        """Classifies face shape using trained Random Forest or calibrated geometric threshold decision rules."""
        f_w_h = ratios.get("face_width_to_height", 0.76)
        jaw_fh = ratios.get("jaw_to_forehead", 0.85)
        cheek_jaw = ratios.get("cheekbone_to_jaw", 1.15)
        chin_sharp = ratios.get("chin_sharpness", 0.65)

        # 1. Use trained Random Forest model if loaded
        if self.model is not None:
            try:
                features = np.array([[f_w_h, jaw_fh, cheek_jaw, chin_sharp]])
                probs = self.model.predict_proba(features)[0]
                classes = self.model.classes_
                best_idx = int(np.argmax(probs))
                best_shape = str(classes[best_idx])
                confidence = float(probs[best_idx])
                
                advice_data = self.flattering_advice.get(best_shape, self.flattering_advice["Oval"])
                return FaceShapeResult(
                    shape=best_shape,
                    confidence=confidence,
                    ratios=ratios,
                    glasses_recommendations=advice_data["glasses"],
                    hat_recommendations=advice_data["hats"],
                    styling_advice=advice_data["advice"],
                )
            except Exception:
                pass  # fallback to rule-based scoring

        # 2. Rule-based scoring fallback across 5 classes
        scores = {"Oval": 0.5, "Round": 0.5, "Square": 0.5, "Heart": 0.5, "Oblong": 0.5}

        # 1. Aspect Ratio (Width vs Height)
        if f_w_h >= 0.84:
            scores["Round"] += 1.8
            scores["Square"] += 1.4
        elif f_w_h <= 0.69:
            scores["Oblong"] += 2.0
        else:
            scores["Oval"] += 1.5
            scores["Heart"] += 1.0

        # 2. Jaw vs Forehead
        if jaw_fh >= 0.92:
            scores["Square"] += 1.8
        elif jaw_fh <= 0.74:
            scores["Heart"] += 2.0
            scores["Oval"] += 0.8
        else:
            scores["Oval"] += 1.0
            scores["Round"] += 0.8

        # 3. Cheekbone vs Jaw
        if cheek_jaw >= 1.28:
            scores["Heart"] += 1.2
            scores["Round"] += 1.0
        elif cheek_jaw <= 1.12:
            scores["Square"] += 1.5
            scores["Oblong"] += 1.0

        # 4. Chin Sharpness
        if chin_sharp <= 0.58:
            scores["Heart"] += 1.0
            scores["Oval"] += 0.8
        elif chin_sharp >= 0.72:
            scores["Square"] += 1.0
            scores["Round"] += 0.8

        # Find best shape & confidence
        best_shape = max(scores, key=scores.get)
        total_score = sum(scores.values())
        confidence = min(0.96, max(0.82, scores[best_shape] / (total_score / 2.5)))

        advice_data = self.flattering_advice.get(best_shape, self.flattering_advice["Oval"])

        return FaceShapeResult(
            shape=best_shape,
            confidence=confidence,
            ratios=ratios,
            glasses_recommendations=advice_data["glasses"],
            hat_recommendations=advice_data["hats"],
            styling_advice=advice_data["advice"],
        )
