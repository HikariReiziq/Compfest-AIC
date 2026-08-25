'use client';

import React from 'react';
import { X, ArrowLeft, CheckCircle2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn text-white">
      <div
        className={`relative w-full max-w-2xl rounded-3xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl border ${
          isFemale
            ? 'bg-[#180918] border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.2)]'
            : 'bg-[#091526] border-white/15'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 pr-8">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold uppercase tracking-wider ${
              isFemale
                ? 'bg-pink-600/15 border-pink-500/30 text-pink-300'
                : 'bg-blue-600/15 border-blue-500/30 text-sky-300'
            }`}
          >
            <span>{item.archetype_title || 'Pilihan Rekomendasi AI'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {item.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono pt-0.5">
            <span>Kategori: <strong className="text-slate-300">{item.category}</strong></span>
            <span>•</span>
            <span>Sub: <strong className="text-slate-300 uppercase">{item.subcategory}</strong></span>
            <span>•</span>
            <span>Harga: <strong className="text-[#FACC15]">{item.price_idr}</strong></span>
          </div>
        </div>

        {/* 2D Preview (Bright Studio Lighting) and Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Bright Studio Photo Frame (Tidak Gelap) */}
          <div
            className={`sm:col-span-5 aspect-square rounded-2xl overflow-hidden border flex items-center justify-center p-4 shadow-inner relative group ${
              isFemale ? 'bg-[#120712] border-pink-500/30' : 'bg-slate-800 border-slate-600/40'
            }`}
          >
            {/* Soft Studio Radial Spotlight */}
            <div
              className={`absolute inset-0 pointer-events-none ${
                isFemale
                  ? 'bg-[radial-gradient(circle_at_center,_rgba(244,114,182,0.18)_0%,_transparent_70%)]'
                  : 'bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12)_0%,_transparent_70%)]'
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
              className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isFemale ? 'bg-[#140614]/80 border-pink-500/20' : 'bg-[#060e1a]/80 border-white/10'
              }`}
            >
              <div className="flex justify-between items-center text-white">
                <span className="font-semibold">Skor Keserasian Total</span>
                <span className="font-mono text-[#FACC15] text-sm font-bold">{item.compatibility_score}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full rounded-full ${isFemale ? 'bg-pink-500' : 'bg-blue-500'}`}
                  style={{ width: `${item.compatibility_score}%` }}
                />
              </div>

              <div className="space-y-1 pt-1 text-[11px] text-slate-300">
                <div className="flex justify-between items-center">
                  <span>Kecocokan Rona Kulit</span>
                  <span className={`font-mono font-bold ${isFemale ? 'text-pink-300' : 'text-sky-400'}`}>
                    {item.color_match_score}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Kecocokan Siluet Geometris</span>
                  <span className={`font-mono font-bold ${isFemale ? 'text-rose-300' : 'text-blue-400'}`}>
                    {item.shape_match_score}%
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${
                isFemale ? 'bg-[#140614]/80 border-pink-500/20' : 'bg-[#060e1a]/80 border-white/10'
              }`}
            >
              <span className="text-slate-400 text-xs">Warna Produk:</span>
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
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
            <CheckCircle2 className={`w-3.5 h-3.5 ${isFemale ? 'text-pink-400' : 'text-sky-400'}`} />
            <span>Mengapa AI Merekomendasikan Item Ini?</span>
          </div>

          <div className="space-y-2 text-xs leading-relaxed text-slate-300">
            <div
              className={`p-3 rounded-xl border space-y-1 ${
                isFemale ? 'bg-[#140614]/80 border-pink-500/20' : 'bg-[#060e1a]/80 border-white/10'
              }`}
            >
              <span className={`font-bold block ${isFemale ? 'text-pink-300' : 'text-sky-300'}`}>
                1. Analisis Spektrum Rona Kulit
              </span>
              <p className="text-slate-300 text-[11px]">
                Warna <strong className="text-white">{item.base_colour}</strong> melengkapi rona kulit tropis Monk Scale Anda, menghindari efek wash-out dan memancarkan kilau rona alami.
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border space-y-1 ${
                isFemale ? 'bg-[#140614]/80 border-pink-500/20' : 'bg-[#060e1a]/80 border-white/10'
              }`}
            >
              <span className={`font-bold block ${isFemale ? 'text-rose-300' : 'text-blue-300'}`}>
                2. Proporsi Geometris 3D
              </span>
              <p className="text-slate-300 text-[11px]">
                Potongan siluet produk ini dirancang proporsional terhadap kontur wajah ({userProfile?.face_shape?.shape || 'Oval'}) dan postur torso Anda
                {userProfile?.gender?.label_id === "female"
                  ? ", dengan aksen yang melengkapi gaya feminin Anda"
                  : userProfile?.gender?.label_id === "male"
                    ? ", dengan aksen yang melengkapi gaya maskulin Anda"
                    : ""} sehingga menciptakan keseimbangan visual yang flattering.
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border space-y-1 ${
                isFemale ? 'bg-[#140614]/80 border-pink-500/20' : 'bg-[#060e1a]/80 border-white/10'
              }`}
            >
              <span className={`font-bold block ${isFemale ? 'text-pink-300' : 'text-indigo-300'}`}>
                3. Konteks Acara &amp; Fit
              </span>
              <p className="text-slate-300 text-[11px]">
                Disesuaikan untuk skenario penggunaan <strong className="text-white">{item.usage}</strong> dengan siluet bahan yang jatuh rapi dan nyaman.
              </p>
            </div>
          </div>
        </div>

        {/* Close Modal Button */}
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
            isFemale
              ? 'bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 border border-pink-400/30 shadow-[0_4px_20px_rgba(236,72,153,0.3)]'
              : 'bg-blue-600 hover:bg-blue-500 border border-blue-400/30'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke 3D Try-On</span>
        </button>
      </div>
    </div>
  );
};
