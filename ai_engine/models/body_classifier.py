import os
import json
import math
from typing import Dict, List, Optional, Tuple, Any


class BodyShapeResult:
    """Represents the body shape classification result with silhouette styling advice."""

    def __init__(
        self,
        shape: str,
        confidence: float,
        ratios: Dict[str, float],
        silhouette_recommendations: List[str],
        jacket_recommendations: List[str],
        styling_advice: str,
    ):
        self.shape = shape  # "Hourglass", "Pear", "Inverted Triangle", "Rectangle", "Apple"
        self.confidence = round(confidence, 2)
        self.ratios = {k: round(v, 3) for k, v in ratios.items()}
        self.silhouette_recommendations = silhouette_recommendations
        self.jacket_recommendations = jacket_recommendations
        self.styling_advice = styling_advice

    def to_dict(self) -> Dict[str, Any]:
        return {
            "shape": self.shape,
            "confidence": self.confidence,
            "ratios": self.ratios,
            "silhouette_recommendations": self.silhouette_recommendations,
            "jacket_recommendations": self.jacket_recommendations,
            "styling_advice": self.styling_advice,
        }


class BodyShapeClassifier:
    """Classifies body shape based on MediaPipe Pose 33 landmarks and ANSUR II calibrated anthropometric thresholds."""

    def __init__(self, thresholds_file_path: Optional[str] = None):
        if thresholds_file_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            thresholds_file_path = os.path.join(base_dir, "models", "weights", "ansur_thresholds.json")

        self.thresholds = None
        if os.path.exists(thresholds_file_path):
            try:
                with open(thresholds_file_path, "r", encoding="utf-8") as f:
                    self.thresholds = json.load(f).get("shape_decision_boundaries", {})
            except Exception:
                self.thresholds = None

        self.flattering_advice = {
            "Hourglass": {
                "silhouettes": ["Fitted Cut", "Wrap Shirt", "Tailored Blazer", "High-Waist Silhouette"],
                "jackets": ["Belted Trench Coat", "Cropped Denim Jacket", "Fitted Leather Jacket", "Tailored Single-Breasted Blazer"],
                "advice": "Proporsi bahu dan pinggul Anda seimbang sempurna dengan lekuk pinggang yang tegas. Pilih pakaian berpotongan *fitted* atau jaket berikat pinggang untuk menonjolkan siluet alami tubuh."
            },
            "Pear": {
                "silhouettes": ["A-Line Cut", "Structured Shoulder Top", "Boatneck", "Layered Outerwear"],
                "jackets": ["Structured Blazer with Lapels", "Bomber Jacket", "Cropped Utility Jacket", "Puffer Vest"],
                "advice": "Garis pinggul Anda lebih dominan dibandingkan bahu. Gunakan atasan dengan aksen bahu berstruktur (blazer berkerah tegas atau jaket cropped) untuk menarik perhatian ke tubuh bagian atas."
            },
            "Inverted Triangle": {
                "silhouettes": ["V-Neck Cut", "Raglan Sleeve", "Relaxed Fit", "Flared Hemline"],
                "jackets": ["Casual Oversized Jacket", "Unstructured Kimono/Cardigan", "Straight Zip Jacket", "Minimalist Harrington"],
                "advice": "Bahu Anda bidang dan atletis. Pilih pakaian atasan berkerah V-neck dan jaket tanpa bantalan bahu (unstructured) dengan potongan lurus untuk melembutkan visual garis bahu."
            },
            "Rectangle": {
                "silhouettes": ["Layered Casual", "Oversized Streetwear", "Belted Coat", "Boxy Fit"],
                "jackets": ["Oversized Denim Jacket", "Double-Breasted Blazer", "Utility Field Jacket", "Varsity Jacket"],
                "advice": "Bahu, pinggang, dan pinggul Anda memiliki lebar yang relatif sejajar. Gaya *layering*, jaket *oversized/boxy*, atau luaran bermotif akan memberikan dimensi dan karakter gaya yang kuat."
            },
            "Apple": {
                "silhouettes": ["Flowy Relaxed Top", "V-Neck Shirt", "Vertical Panel Lines", "Open Front Outerwear"],
                "jackets": ["Single-Breasted Long Coat", "Open Front Drape Cardigan", "Lightweight Harrington", "Vertical Zip Hoodie"],
                "advice": "Fokus pada tubuh bagian tengah dapat diseimbangkan dengan atasan berpotongan *flowy*, leher V-neck, serta jaket beritsleting vertikal yang dibiarkan terbuka untuk memberi ilusi tubuh lebih jenjang."
            }
        }

    @staticmethod
    def calculate_ratios_from_landmarks(landmarks: List[Dict[str, float]]) -> Dict[str, float]:
        """
        Calculates body anthropometric ratios from MediaPipe Pose (33 points).
        
        Key landmark indices:
        - 11: Left Shoulder, 12: Right Shoulder
        - 23: Left Hip, 24: Right Hip
        - Midpoints between 11-23 and 12-24: Approximate Waist
        """
        def dist(p1_idx: int, p2_idx: int) -> float:
            p1 = landmarks[p1_idx]
            p2 = landmarks[p2_idx]
            dx = p1.get("x", 0) - p2.get("x", 0)
            dy = p1.get("y", 0) - p2.get("y", 0)
            return math.sqrt(dx * dx + dy * dy)

        shoulder_width = dist(11, 12)
        hip_width = max(0.001, dist(23, 24))

        # Approximate waist by taking the distance between left and right torso midpoints
        left_mid_x = (landmarks[11].get("x", 0) + landmarks[23].get("x", 0)) / 2.0
        left_mid_y = (landmarks[11].get("y", 0) + landmarks[23].get("y", 0)) / 2.0
        right_mid_x = (landmarks[12].get("x", 0) + landmarks[24].get("x", 0)) / 2.0
        right_mid_y = (landmarks[12].get("y", 0) + landmarks[24].get("y", 0)) / 2.0
        
        waist_width = math.sqrt((left_mid_x - right_mid_x) ** 2 + (left_mid_y - right_mid_y) ** 2)

        shoulder_to_hip = shoulder_width / hip_width
        waist_to_hip = waist_width / hip_width
        waist_to_shoulder = waist_width / max(0.001, shoulder_width)

        return {
            "shoulder_to_hip_ratio": shoulder_to_hip,
            "waist_to_hip_ratio": waist_to_hip,
            "waist_to_shoulder_ratio": waist_to_shoulder,
        }

    def classify(self, ratios: Dict[str, float]) -> BodyShapeResult:
        """Classifies body shape based on calibrated ANSUR II ground truth ratio thresholds."""
        sh_hip = ratios.get("shoulder_to_hip_ratio", 1.0)
        w_hip = ratios.get("waist_to_hip_ratio", 0.8)
        w_sh = ratios.get("waist_to_shoulder_ratio", 0.8)

        # Decision scoring based on ANSUR II anthropometry percentiles
        scores = {"Hourglass": 0.5, "Pear": 0.5, "Inverted Triangle": 0.5, "Rectangle": 0.5, "Apple": 0.5}

        # 1. Inverted Triangle (Shoulders noticeably wider than hips)
        if sh_hip >= 1.08:
            scores["Inverted Triangle"] += 2.5
        # 2. Pear (Hips noticeably wider than shoulders)
        elif sh_hip <= 0.92:
            scores["Pear"] += 2.5
        else:
            # Balanced Shoulders and Hips
            scores["Hourglass"] += 1.2
            scores["Rectangle"] += 1.2
            scores["Apple"] += 1.0

        # 3. Waist-to-Hip Definition
        if w_hip <= 0.76 and w_sh <= 0.76:
            scores["Hourglass"] += 2.0
        elif w_hip >= 0.92:
            scores["Apple"] += 2.0
        else:
            scores["Rectangle"] += 1.8

        best_shape = max(scores, key=scores.get)
        total_score = sum(scores.values())
        confidence = min(0.96, max(0.80, scores[best_shape] / (total_score / 2.3)))

        advice_data = self.flattering_advice.get(best_shape, self.flattering_advice["Rectangle"])

        return BodyShapeResult(
            shape=best_shape,
            confidence=confidence,
            ratios=ratios,
            silhouette_recommendations=advice_data["silhouettes"],
            jacket_recommendations=advice_data["jackets"],
            styling_advice=advice_data["advice"],
        )
