"""Registry model.

Alembic autogenerate hanya melihat tabel yang kelasnya sudah pernah diimpor,
jadi setiap model baru wajib diekspor dari sini.
"""

from app.models.account import AppUser, RefreshToken
from app.models.asset import Asset3D
from app.models.catalog import Attribute, Category, Colour, Product, ProductAttribute
from app.models.feedback import RecommendationFeedbackDaily
from app.models.personal import StyleRule, UndertonePalette
from app.models.questionnaire import Question, QuestionBatch
from app.models.sizing import (
    AnthropometryReference,
    MeasurementKey,
    SizeChart,
    SizeChartEntry,
)

__all__ = [
    "AnthropometryReference",
    "AppUser",
    "Asset3D",
    "Attribute",
    "Category",
    "Colour",
    "MeasurementKey",
    "Product",
    "ProductAttribute",
    "Question",
    "QuestionBatch",
    "RecommendationFeedbackDaily",
    "RefreshToken",
    "SizeChart",
    "SizeChartEntry",
    "StyleRule",
    "UndertonePalette",
]
