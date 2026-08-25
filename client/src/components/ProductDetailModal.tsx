'use client';

import React from 'react';
import { X, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { RecommendationItem, UserPersonalProfile } from '../lib/mockData';

interface ProductDetailModalProps {
  item: RecommendationItem | null;
  userProfile: Partial<UserPersonalProfile> | null;
  gender?: 'male' | 'female';
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  userProfile,
  gender,
  onClose,
}) => {
  if (!item) return null;

  const isFemale = gender === 'female' || userProfile?.gender?.label_id === 'female';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn text-white">
      {/* Double-Bezel Luxury Outer Shell */}
      <div
        className={`relative w-full max-w-2xl p-1.5 sm:p-2 rounded-[2.25rem] border backdrop-blur-2xl transition-all duration-500 shadow-2xl ${
          isFemale
            ? 'bg-gradient-to-b from-pink-500/15 via-pink-500/[0.03] to-transparent border-pink-500/40 shadow-[0_16px_50px_rgba(244,114,182,0.25)]'
            : 'bg-gradient-to-b from-blue-500/15 via-blue-500/[0.03] to-transparent border-blue-500/40 shadow-[0_16px_50px_rgba(56,189,248,0.25)]'
        }`}
      >
        {/* Inner Core */}
        <div
          className={`p-6 sm:p-7 rounded-[calc(2.25rem-0.375rem)] space-y-5 max-h-[88vh] overflow-y-auto transition-all duration-500 ${
            isFemale
              ? 'bg-[#150714]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]'
              : 'bg-[#071120]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]'
          }`}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-6 right-6 w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-md ${
              isFemale
                ? 'bg-[#1e0a1c] text-pink-300 border-pink-500/30 hover:bg-pink-600 hover:text-white'
                : 'bg-[#0c182a] text-slate-300 border-white/10 hover:bg-blue-600 hover:text-white'
            }`}
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="space-y-1.5 pr-10">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${
                isFemale
                  ? 'bg-pink-500/20 border-pink-400/40 text-pink-300'
                  : 'bg-blue-500/20 border-blue-400/40 text-[#93C5FD]'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{item.archetype_title || 'Pilihan Rekomendasi AI'}</span>
            </div>
            <h2
              className="text-xl sm:text-2xl font-bold text-white tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {item.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono pt-0.5">
              <span>Kategori: <strong className="text-slate-300">{item.category}</strong></span>
              <span>•</span>
              <span>Sub: <strong className="text-slate-300 uppercase">{item.subcategory}</strong></span>
              <span>•</span>
              <span>Harga: <strong className="text-[#FACC15] font-bold">{item.price_idr}</strong></span>
            </div>
          </div>

          {/* 2D Preview and Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Bright Studio Photo Frame */}
            <div
              className={`sm:col-span-5 aspect-square rounded-2xl overflow-hidden border flex items-center justify-center p-4 shadow-inner relative group ${
                isFemale ? 'bg-[#180816] border-pink-500/30' : 'bg-[#0c182a] border-slate-700/50'
              }`}
            >
              {/* Soft Studio Radial Spotlight */}
              <div
                className={`absolute inset-0 pointer-events-none ${
                  isFemale
                    ? 'bg-[radial-gradient(circle_at_center,_rgba(244,114,182,0.18)_0%,_transparent_70%)]'
                    : 'bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.18)_0%,_transparent_70%)]'
                }`}
              />
              <img
                src={
                  item.preview_image_url && !item.preview_image_url.endsWith('.obj')
                    ? item.preview_image_url
                    : `/images/products/preview/${item.id}.png`
                }
                alt={item.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `/images/products/preview/${item.id}.png`;
                }}
                className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
              />
            </div>

            {/* Compatibility Breakdown Stats */}
            <div className="sm:col-span-7 space-y-2.5 text-xs">
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  isFemale ? 'bg-[#1f091d]/60 border-pink-500/20' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex justify-between items-center text-white">
                  <span className="font-bold text-slate-200">Skor Keserasian Total</span>
                  <span className="font-mono text-[#FACC15] text-sm font-black">{item.compatibility_score}%</span>
                </div>
                <div
                  className={`w-full h-1.5 rounded-full overflow-hidden border p-0.5 ${
                    isFemale ? 'bg-black/60 border-pink-500/30' : 'bg-black/60 border-blue-500/20'
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFemale
                        ? 'bg-gradient-to-r from-pink-600 via-rose-400 to-[#FACC15]'
                        : 'bg-gradient-to-r from-blue-600 via-sky-400 to-[#FACC15]'
                    }`}
                    style={{ width: `${item.compatibility_score}%` }}
                  />
                </div>

                <div className="space-y-1 pt-1 text-[11px] text-slate-300">
                  <div className="flex justify-between items-center">
                    <span>Kecocokan Rona Kulit</span>
                    <span className={`font-mono font-bold ${isFemale ? 'text-pink-300' : 'text-sky-300'}`}>
                      {item.color_match_score}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Kecocokan Siluet Geometris</span>
                    <span className={`font-mono font-bold ${isFemale ? 'text-rose-300' : 'text-[#60A5FA]'}`}>
                      {item.shape_match_score}%
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${
                  isFemale ? 'bg-[#1f091d]/60 border-pink-500/20' : 'bg-white/5 border-white/10'
                }`}
              >
                <span className="text-slate-400 text-xs">Warna Produk:</span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 shadow-sm"
                  style={{ backgroundColor: item.hex_colour }}
                />
                <span className="font-semibold text-white text-xs">{item.base_colour}</span>
              </div>
            </div>
          </div>

          {/* Detailed AI Stylist Analysis (Clean & Tidy 3-Point Layout) */}
          <div className="space-y-2.5 pt-1">
            <div
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                isFemale ? 'text-pink-300' : 'text-sky-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mengapa AI Merekomendasikan Item Ini?</span>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-slate-300">
              <div
                className={`p-3.5 rounded-2xl border space-y-1 ${
                  isFemale ? 'bg-[#1f091d]/60 border-pink-500/20' : 'bg-white/5 border-white/10'
                }`}
              >
                <span className={`font-bold block ${isFemale ? 'text-pink-300' : 'text-sky-300'}`}>
                  1. Analisis Spektrum Rona Kulit
                </span>
                <p className="text-slate-300 text-[11px] font-light">
                  Warna <strong className="text-white">{item.base_colour}</strong> melengkapi rona kulit tropis Monk Scale Anda, menghindari efek wash-out dan memancarkan kilau rona alami.
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl border space-y-1 ${
                  isFemale ? 'bg-[#1f091d]/60 border-pink-500/20' : 'bg-white/5 border-white/10'
                }`}
              >
                <span className={`font-bold block ${isFemale ? 'text-rose-300' : 'text-[#60A5FA]'}`}>
                  2. Proporsi Geometris 3D
                </span>
                <p className="text-slate-300 text-[11px] font-light">
                  Potongan siluet produk ini dirancang proporsional terhadap kontur wajah ({userProfile?.face_shape?.shape || 'Oval'}) dan postur torso Anda
                  {userProfile?.gender?.label_id === "female"
                    ? ", dengan aksen yang melengkapi gaya feminin Anda"
                    : userProfile?.gender?.label_id === "male"
                      ? ", dengan aksen yang melengkapi gaya maskulin Anda"
                      : ""} sehingga menciptakan keseimbangan visual yang flattering.
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl border space-y-1 ${
                  isFemale ? 'bg-[#1f091d]/60 border-pink-500/20' : 'bg-white/5 border-white/10'
                }`}
              >
                <span className={`font-bold block ${isFemale ? 'text-pink-300' : 'text-[#93C5FD]'}`}>
                  3. Konteks Acara &amp; Fit
                </span>
                <p className="text-slate-300 text-[11px] font-light">
                  Disesuaikan untuk skenario penggunaan <strong className="text-white">{item.usage}</strong> dengan siluet bahan yang jatuh rapi dan nyaman.
                </p>
              </div>
            </div>
          </div>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3.5 rounded-full font-bold text-xs sm:text-sm text-white transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] ${
              isFemale
                ? 'bg-pink-600 hover:bg-pink-700 border border-pink-400'
                : 'bg-blue-600 hover:bg-blue-700 border border-blue-400'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke 3D Try-On Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
};
