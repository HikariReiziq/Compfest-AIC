"""Baseline rekomendasi berbasis aturan.

Ini bukan penambal sementara. Baseline yang jalan sejak hari pertama memberi
tiga hal: API bisa dites ujung ke ujung sebelum model apa pun siap, ada angka
pembanding untuk membuktikan model baru memang lebih baik, dan ada cadangan
saat layanan inferensi mati.

Nilai akhir adalah gabungan berbobot dari empat sinyal. Bobotnya dikumpulkan
sebagai konstanta di satu tempat supaya bisa disetel tanpa membongkar logika.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ItemSlot
from app.schemas.catalog import ProductRead
from app.schemas.session import PersonalProfile
from app.services import catalog as catalog_service
from app.services import style as style_service
from app.services.ai.base import RecommendationInput, RecommendationResult, ScoredProduct
from app.services.sizing import choose_size, load_size_chart, resolve_chart_id

W_POPULARITY = 0.25
W_COLOUR = 0.30
W_RULE = 0.30
W_OCCASION = 0.15

# Penyesuaian dari feedback dalam sesi berjalan.
FEEDBACK_COLOUR_BONUS = 0.15
FEEDBACK_COLOUR_PENALTY = 0.25
FEEDBACK_CATEGORY_BONUS = 0.10
FEEDBACK_CATEGORY_PENALTY = 0.20

CANDIDATE_POOL_PER_SLOT = 120


class HeuristicRecommender:
    name = "heuristic"
    version = "1.0.0"

    async def recommend(
        self, db: AsyncSession, payload: RecommendationInput
    ) -> RecommendationResult:
        profile = payload.profile
        slots = payload.slots or [ItemSlot.TOP]

        candidates = await catalog_service.fetch_candidates(
            db,
            gender=profile.gender,
            usage_context=profile.occasion,
            item_slots=slots,
            limit=CANDIDATE_POOL_PER_SLOT * max(1, len(slots)),
        )
        if not candidates:
            return RecommendationResult(items=[], engine=self.name, engine_version=self.version)

        palette = (
            await style_service.load_palette(db, profile.undertone) if profile.undertone else {}
        )

        rules: list[style_service.RuleHit] = []
        if profile.body_shape:
            rules += await style_service.load_rules(db, "body_shape", profile.body_shape)
        if profile.face_shape:
            rules += await style_service.load_rules(db, "face_shape", profile.face_shape)
        if profile.fit_preference:
            rules += await style_service.load_rules(db, "fit_preference", profile.fit_preference)

        rule_by_category = {r.target_category_id: r for r in rules if r.target_category_id}
        rule_by_colour = {r.target_colour_id: r for r in rules if r.target_colour_id}

        liked, disliked = await self._feedback_signals(payload, candidates)

        scored: list[ScoredProduct] = []
        for product in candidates:
            if product.id in payload.disliked_product_ids:
                continue
            score, reasons, caveats = self._score(
                product, profile, palette, rule_by_category, rule_by_colour, liked, disliked
            )
            scored.append(
                ScoredProduct(
                    product=product,
                    score=round(min(1.0, max(0.0, score)), 4),
                    reasons=reasons,
                    caveats=caveats,
                )
            )

        scored.sort(key=lambda s: s.score, reverse=True)
        selected = self._spread_across_slots(scored, slots, payload.limit)

        if payload.include_size and profile.measurements:
            await self._attach_sizes(db, selected, profile)

        return RecommendationResult(items=selected, engine=self.name, engine_version=self.version)

    # ------------------------------------------------------------------ #
    def _score(
        self,
        product: ProductRead,
        profile: PersonalProfile,
        palette: dict[int, tuple[float, str | None]],
        rule_by_category: dict[int, style_service.RuleHit],
        rule_by_colour: dict[int, style_service.RuleHit],
        liked: dict[str, set[int]],
        disliked: dict[str, set[int]],
    ) -> tuple[float, list[str], list[str]]:
        reasons: list[str] = []
        caveats: list[str] = []

        # popularity_score sudah dinormalisasi ke 0..1 saat impor katalog.
        score = W_POPULARITY * min(1.0, max(0.0, product.popularity_score))

        if product.colour and product.colour.id in palette:
            weight, rationale = palette[product.colour.id]
            # Bobot -1..1 dipetakan ke 0..1 agar sebanding dengan sinyal lain.
            score += W_COLOUR * ((weight + 1) / 2)
            if weight > 0.2:
                reasons.append(
                    rationale
                    or f"Warna {product.colour.name} cocok dengan undertone {profile.undertone}."
                )
            elif weight < -0.2:
                caveats.append(f"Warna {product.colour.name} kurang mendukung undertone Anda.")

        rule = rule_by_category.get(product.category.id) or rule_by_colour.get(
            product.colour.id if product.colour else -1
        )
        if rule:
            score += W_RULE * ((rule.weight + 1) / 2)
            if rule.rationale and rule.weight > 0:
                reasons.append(rule.rationale)

        if profile.occasion and product.usage_context == profile.occasion:
            score += W_OCCASION
            reasons.append(f"Sesuai untuk kesempatan {profile.occasion}.")

        if product.colour:
            if product.colour.id in liked["colours"]:
                score += FEEDBACK_COLOUR_BONUS
                reasons.append("Mirip dengan pilihan yang tadi Anda sukai.")
            if product.colour.id in disliked["colours"]:
                score -= FEEDBACK_COLOUR_PENALTY
        if product.category.id in liked["categories"]:
            score += FEEDBACK_CATEGORY_BONUS
        if product.category.id in disliked["categories"]:
            score -= FEEDBACK_CATEGORY_PENALTY

        return score, reasons[:3], caveats[:2]

    async def _feedback_signals(
        self, payload: RecommendationInput, candidates: list[ProductRead]
    ) -> tuple[dict[str, set[int]], dict[str, set[int]]]:
        """Terjemahkan suka/tidak suka per produk jadi preferensi warna dan kategori.

        Kandidat yang sudah ada di memori dipakai sebagai kamus, jadi tidak ada
        query tambahan hanya untuk mencari tahu warna produk yang di-feedback.
        """
        by_id = {p.id: p for p in candidates}
        liked: dict[str, set[int]] = {"colours": set(), "categories": set()}
        disliked: dict[str, set[int]] = {"colours": set(), "categories": set()}
        for product_id in payload.liked_product_ids:
            if (p := by_id.get(product_id)) is not None:
                if p.colour:
                    liked["colours"].add(p.colour.id)
                liked["categories"].add(p.category.id)
        for product_id in payload.disliked_product_ids:
            if (p := by_id.get(product_id)) is not None:
                if p.colour:
                    disliked["colours"].add(p.colour.id)
                disliked["categories"].add(p.category.id)
        return liked, disliked

    def _spread_across_slots(
        self, scored: list[ScoredProduct], slots: list[ItemSlot], limit: int
    ) -> list[ScoredProduct]:
        """Jaga agar hasil tidak dikuasai satu slot.

        Tanpa ini, delapan rekomendasi teratas bisa berisi delapan kaos dan
        pembeli tidak pernah melihat bawahan sama sekali.
        """
        if len(slots) <= 1:
            return scored[:limit]

        quota = max(1, limit // len(slots))
        picked: list[ScoredProduct] = []
        used_per_slot: dict[str, int] = {}
        for item in scored:
            slot = item.product.category.item_slot or "unknown"
            if used_per_slot.get(slot, 0) >= quota:
                continue
            picked.append(item)
            used_per_slot[slot] = used_per_slot.get(slot, 0) + 1
            if len(picked) >= limit:
                break
        # Sisa kuota diisi peringkat teratas berikutnya apa pun slotnya.
        if len(picked) < limit:
            chosen = {i.product.id for i in picked}
            picked += [i for i in scored if i.product.id not in chosen][: limit - len(picked)]
        return picked

    async def _attach_sizes(
        self, db: AsyncSession, items: list[ScoredProduct], profile: PersonalProfile
    ) -> None:
        """Lampirkan saran ukuran, dengan cache chart dibagi antar produk sekategori."""
        chart_cache: dict[int, object] = {}
        for item in items:
            category_id = item.product.category.id
            if category_id not in chart_cache:
                chart_id = await resolve_chart_id(
                    db, category_id=category_id, gender=profile.gender
                )
                chart_cache[category_id] = (
                    await load_size_chart(db, chart_id) if chart_id else None
                )
            chart = chart_cache[category_id]
            if chart is not None:
                item.size = choose_size(chart, profile.measurements)
