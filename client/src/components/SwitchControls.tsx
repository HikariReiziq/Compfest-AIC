'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Palette,
  Sparkles,
  Shirt,
  Calendar,
  Compass,
} from 'lucide-react';
import { RecommendationItem, UserPersonalProfile } from '../lib/mockData';

interface SwitchControlsProps {
  items: RecommendationItem[];
  currentIndex: number;
  userProfile?: Partial<UserPersonalProfile> | null;
  onSelectIndex: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenDetails?: () => void;
}

export const SwitchControls: React.FC<SwitchControlsProps> = ({
  items,
  currentIndex,
  userProfile,
  onSelectIndex,
  onPrev,
  onNext,
}) => {
  if (!items || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];

  const archetypeLabels = [
    'The Best Fit',
    'Safe Classic',
    'Bold Statement',
    'Modern Trend',
  ];

  const previewImg =
    currentItem.preview_image_url && !currentItem.preview_image_url.endsWith('.obj')
      ? currentItem.preview_image_url
      : `/images/products/preview/${currentItem.id}.png`;

  const isFemale = userProfile?.gender?.label_id === 'female';

  // Natural stylist summary
  const stylistSummary =
    currentItem.stylist_reason ||
    (currentItem as any).why_recommended ||
    `Pilihan warna ${currentItem.base_colour} memberikan harmoni alami pada rona kulit Anda, sementara siluetnya dirancang menyeimbangkan proporsi wajah secara proporsional.`;

  return (
    <div className="w-full space-y-3.5 text-white animate-fadeIn">
      {/* 1. Selector Tab Berbentuk Pill Selengkung Navbar */}
      <div
        className={`flex items-center gap-1.5 p-1.5 rounded-full backdrop-blur-2xl shadow-xl border ${
          isFemale ? 'bg-[#1c0b1a] border-pink-500/30' : 'bg-[#0B1528] border-blue-500/30'
        }`}
      >
        {items.map((item, idx) => {
          const isSelected = idx === currentIndex;
          const label = archetypeLabels[idx] || `Pilihan ${idx + 1}`;

          return (
            <button
              key={item.id}
              onClick={() => onSelectIndex(idx)}
              type="button"
              className={`flex-1 px-3 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                isSelected
                  ? isFemale
                    ? 'bg-pink-600 text-white font-bold border border-pink-400'
                    : 'bg-blue-600 text-white font-bold border border-blue-400'
                  : isFemale
                  ? 'text-pink-300/70 hover:text-white hover:bg-pink-500/10 border border-transparent'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="truncate">{label}</span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                {item.compatibility_score}%
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Double-Bezel Editorial Fashion Showcase Card */}
      <div
        className={`p-1.5 sm:p-2 rounded-[2.25rem] border backdrop-blur-2xl transition-all duration-500 shadow-2xl ${
          isFemale
            ? 'bg-gradient-to-b from-pink-500/15 via-pink-500/[0.03] to-transparent border-pink-500/30 shadow-pink-950/30'
            : 'bg-gradient-to-b from-blue-500/15 via-blue-500/[0.03] to-transparent border-blue-500/30 shadow-blue-950/30'
        }`}
      >
        {/* Inner Core */}
        <div
          className={`p-6 sm:p-7 rounded-[calc(2.25rem-0.375rem)] space-y-5 transition-all duration-500 ${
            isFemale
              ? 'bg-[#150714]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]'
              : 'bg-[#071120]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]'
          }`}
        >
          {/* Top Header: Title, Category, Price & Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
                    isFemale ? 'text-pink-300' : 'text-[#38BDF8]'
                  }`}
                >
                  {archetypeLabels[currentIndex] || `Pilihan ${currentIndex + 1}`}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  {currentItem.subcategory || currentItem.category}
                </span>
              </div>
              <h3
                className="text-lg sm:text-2xl font-bold text-white tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {currentItem.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-300 pt-0.5 font-mono">
                <span>
                  Warna: <strong className="text-white font-semibold">{currentItem.base_colour}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  Harga: <strong className="text-[#FACC15] font-bold">{currentItem.price_idr}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
              <div
                className={`px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold ${
                  isFemale
                    ? 'bg-pink-500/20 border-pink-400/40 text-pink-300'
                    : 'bg-blue-500/20 border-blue-400/40 text-[#93C5FD]'
                }`}
              >
                {currentItem.compatibility_score}% Keserasian
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onPrev}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                    isFemale
                      ? 'bg-[#180816] text-pink-300 border-pink-500/30 hover:bg-pink-600 hover:text-white'
                      : 'bg-[#071120] text-slate-300 border-white/10 hover:bg-blue-600 hover:text-white'
                  }`}
                  title="Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                    isFemale
                      ? 'bg-[#180816] text-pink-300 border-pink-500/30 hover:bg-pink-600 hover:text-white'
                      : 'bg-[#071120] text-slate-300 border-white/10 hover:bg-blue-600 hover:text-white'
                  }`}
                  title="Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content Body: Gambar Katalog + Analisis Keserasian Gaya */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            {/* Gambar Katalog 2D */}
            <div
              className={`sm:col-span-4 aspect-square rounded-2xl overflow-hidden border flex items-center justify-center p-3 shadow-inner relative ${
                isFemale ? 'bg-[#180816] border-pink-500/25' : 'bg-[#071120] border-slate-700/50'
              }`}
            >
              <img
                src={previewImg}
                alt={currentItem.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `/images/products/preview/${currentItem.id}.png`;
                }}
                className="w-full h-full object-contain relative z-10 drop-shadow-md"
              />
            </div>

            {/* Ulasan Stylist & 4 Poin Keserasian Vertikal */}
            <div className="sm:col-span-8 space-y-3.5">
              <div>
                <span
                  className={`text-[10px] font-mono uppercase tracking-widest font-bold block mb-1 ${
                    isFemale ? 'text-pink-300' : 'text-slate-400'
                  }`}
                >
                  Catatan Kurasi Stylist
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-light">
                  {stylistSummary}
                </p>
              </div>

              {/* 4 Poin Keserasian */}
              <div className="space-y-2 pt-1 font-mono text-[11px]">
                {/* 1. Rona Kulit */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    isFemale ? 'bg-[#1f091d]/60 border-pink-500/20' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                      isFemale
                        ? 'bg-pink-500/20 border-pink-400/30 text-pink-300'
                        : 'bg-sky-500/10 border-sky-400/20 text-[#38BDF8]'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span
                      className={`font-semibold text-[10px] uppercase tracking-wider block ${
                        isFemale ? 'text-pink-300' : 'text-[#38BDF8]'
                      }`}
                    >
                      Rona Kulit
                    </span>
                    <p className="text-slate-300 text-xs leading-relaxed font-sans font-light">
                      Warna {currentItem.base_colour} selaras dengan rona alami Anda.
                    </p>
                  </div>
                </div>

                {/* 2. Proporsi Siluet */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    isFemale ? 'bg-[#1f091d]/60 border-pink-500/20' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                      isFemale
                        ? 'bg-rose-500/20 border-rose-400/30 text-rose-300'
                        : 'bg-blue-500/10 border-blue-400/20 text-[#60A5FA]'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span
                      className={`font-semibold text-[10px] uppercase tracking-wider block ${
                        isFemale ? 'text-rose-300' : 'text-[#60A5FA]'
                      }`}
                    >
                      Proporsi Siluet
                    </span>
                    <p className="text-slate-300 text-xs leading-relaxed font-sans font-light">
                      Potongan menyeimbangkan kontur wajah &amp; postur tubuh.
                    </p>
                  </div>
                </div>

                {/* 3. Penggunaan */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    isFemale ? 'bg-[#1f091d]/60 border-pink-500/20' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                      isFemale
                        ? 'bg-pink-500/20 border-pink-400/30 text-pink-300'
                        : 'bg-blue-500/10 border-blue-400/20 text-[#93C5FD]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span
                      className={`font-semibold text-[10px] uppercase tracking-wider block ${
                        isFemale ? 'text-pink-300' : 'text-[#93C5FD]'
                      }`}
                    >
                      Penggunaan
                    </span>
                    <p className="text-slate-300 text-xs leading-relaxed font-sans font-light">
                      Ideal untuk kebutuhan {currentItem.usage || 'Formal & Kasual'}.
                    </p>
                  </div>
                </div>

                {/* 4. Saran Padu-Padan */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    isFemale ? 'bg-[#1f091d]/60 border-pink-500/20' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 shrink-0 mt-0.5">
                    <Shirt className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-emerald-400 font-semibold text-[10px] uppercase tracking-wider block">
                      Saran Padu-Padan
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans font-light">
                      Padukan item ini dengan busana warna netral untuk menonjolkan aksen {currentItem.base_colour} dan menciptakan kesan penampilan yang rapi serta elegan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
