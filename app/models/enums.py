"""Kosakata terkontrol untuk seluruh domain.

Semua enum di sini disimpan ke Postgres sebagai VARCHAR + CHECK constraint
(bukan tipe ENUM native). Alasannya: menambah nilai baru cukup lewat migrasi
ALTER CHECK yang tidak mengunci tabel lama, sementara ENUM native butuh
ALTER TYPE yang lebih merepotkan saat katalog sudah berisi puluhan ribu baris.
"""

from __future__ import annotations

from enum import StrEnum


class Gender(StrEnum):
    """Mengikuti kolom `gender` pada Fashion Product Images."""

    MEN = "men"
    WOMEN = "women"
    BOYS = "boys"
    GIRLS = "girls"
    UNISEX = "unisex"


class UsageContext(StrEnum):
    """Kolom `usage` dataset, dipakai untuk mencocokkan occasion dari kuesioner."""

    CASUAL = "casual"
    FORMAL = "formal"
    SPORTS = "sports"
    ETHNIC = "ethnic"
    PARTY = "party"
    SMART_CASUAL = "smart_casual"
    TRAVEL = "travel"
    HOME = "home"


class Season(StrEnum):
    SUMMER = "summer"
    FALL = "fall"
    WINTER = "winter"
    SPRING = "spring"


class CategoryLevel(StrEnum):
    """Tiga tingkat hierarki dataset: masterCategory > subCategory > articleType."""

    MASTER = "master"
    SUB = "sub"
    ARTICLE = "article"


class ItemSlot(StrEnum):
    """Posisi item pada tubuh. Menentukan apakah sebuah outfit sudah lengkap."""

    TOP = "top"
    BOTTOM = "bottom"
    OUTERWEAR = "outerwear"
    FULL_BODY = "full_body"
    FOOTWEAR = "footwear"
    HEADWEAR = "headwear"
    EYEWEAR = "eyewear"
    ACCESSORY = "accessory"


class Undertone(StrEnum):
    """Hasil pemetaan Monk Skin Tone 10-point ke ruang LAB."""

    WARM = "warm"
    COOL = "cool"
    NEUTRAL = "neutral"
    OLIVE = "olive"


class BodyShape(StrEnum):
    """Label Body Measurements Dataset (CC0)."""

    HOURGLASS = "hourglass"
    PEAR = "pear"
    APPLE = "apple"
    RECTANGLE = "rectangle"
    INVERTED_TRIANGLE = "inverted_triangle"


class FaceShape(StrEnum):
    """Label Face Shape Dataset, dipakai untuk rekomendasi kacamata dan headwear."""

    HEART = "heart"
    OBLONG = "oblong"
    OVAL = "oval"
    ROUND = "round"
    SQUARE = "square"


class FitPreference(StrEnum):
    SLIM = "slim"
    REGULAR = "regular"
    OVERSIZE = "oversize"


class ColourAffinity(StrEnum):
    """Kecocokan sebuah warna terhadap satu undertone."""

    RECOMMENDED = "recommended"
    NEUTRAL = "neutral"
    AVOID = "avoid"


class RuleSubject(StrEnum):
    """Atribut personal apa yang jadi sumber sebuah aturan gaya."""

    BODY_SHAPE = "body_shape"
    FACE_SHAPE = "face_shape"
    UNDERTONE = "undertone"
    FIT_PREFERENCE = "fit_preference"
    OCCASION = "occasion"


class QuestionInputType(StrEnum):
    SINGLE_CHOICE = "single_choice"
    MULTI_CHOICE = "multi_choice"
    BOOLEAN = "boolean"
    SCALE = "scale"


class UserRole(StrEnum):
    ADMIN = "admin"
    MERCHANT = "merchant"


class AssetFormat(StrEnum):
    GLB = "glb"
    GLTF = "gltf"
    USDZ = "usdz"


class LicenseCode(StrEnum):
    """Wajib dicatat per aset: rulebook lomba menuntut jejak lisensi yang jelas."""

    CC0 = "cc0"
    CC_BY = "cc_by"
    CC_BY_SA = "cc_by_sa"
    CC_BY_NC = "cc_by_nc"
    MIT = "mit"
    APACHE_2_0 = "apache_2_0"
    PROPRIETARY = "proprietary"


class MeasurementUnit(StrEnum):
    CM = "cm"
    KG = "kg"
    RATIO = "ratio"
