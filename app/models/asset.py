"""Aset 3D untuk mode AR.

Kolom lisensi dan atribusi bukan pelengkap: proposal menetapkan kebersihan
lisensi sebagai syarat, dan aset datang dari sumber dengan aturan berbeda-beda
(CC0, CC BY, hasil generate TripoSR). Menyimpannya per aset membuat halaman
kredit bisa dibuat otomatis dan aset bermasalah bisa dilacak dalam satu query.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlmodel import Field, SQLModel

from app.models.base import created_at, enum_column, pk_bigint, updated_at
from app.models.enums import AssetFormat, LicenseCode


class Asset3D(SQLModel, table=True):
    __tablename__ = "asset_3d"
    __table_args__ = (
        # Satu produk boleh punya banyak aset: per ukuran dan per level detail.
        UniqueConstraint("product_id", "size_label", "lod", "format", name="uq_asset_variant"),
        Index("ix_asset_product_active", "product_id", "is_active"),
        Index("ix_asset_license", "license_code"),
        CheckConstraint("lod BETWEEN 0 AND 3", name="ck_asset_lod"),
        CheckConstraint(
            "file_size_bytes IS NULL OR file_size_bytes > 0", name="ck_asset_file_size"
        ),
    )

    id: int | None = pk_bigint()
    product_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("product.id", ondelete="CASCADE"), nullable=False
        )
    )
    # NULL = aset satu ukuran untuk semua (umumnya aksesoris seperti kacamata).
    size_label: str | None = Field(default=None, sa_column=Column(String(12), nullable=True))
    # 0 = paling detail. LOD lebih tinggi dikirim ke perangkat kelas bawah.
    lod: int = Field(sa_column=Column(SmallInteger, nullable=False, server_default="0"), default=0)
    format: AssetFormat = Field(
        default=AssetFormat.GLB,
        sa_column=enum_column(AssetFormat, nullable=False, server_default=AssetFormat.GLB.value),
    )
    url: str = Field(sa_column=Column(Text, nullable=False))
    file_size_bytes: int | None = Field(default=None, sa_column=Column(Integer, nullable=True))
    # Deteksi aset rusak atau tertukar saat pipeline generate dijalankan ulang.
    checksum_sha256: str | None = Field(default=None, sa_column=Column(String(64), nullable=True))

    license_code: LicenseCode = Field(sa_column=enum_column(LicenseCode, nullable=False))
    # Wajib diisi untuk CC BY dan turunannya; jadi sumber halaman kredit.
    attribution: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    source_url: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    # 'triposr' / 'trellis' bila aset digenerate sendiri dari foto katalog.
    generated_by: str | None = Field(default=None, sa_column=Column(String(48), nullable=True))

    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="true"), default=True
    )
    created_at: datetime | None = created_at()
    updated_at: datetime | None = updated_at()
