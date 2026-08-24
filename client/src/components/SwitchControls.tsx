'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Box,
  Layers,
  ShieldCheck,
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
    'Best Match',
    'Safe Classic',
    'Bold Statement',
    'Modern Trend',
  ];

  const previewImg =
    currentItem.preview_image_url && !currentItem.preview_image_url.endsWith('.obj')
      ? currentItem.preview_image_url
      : `/images/products/preview/${currentItem.id}.png`;

  return (
    <div className="w-full space-y-3.5 text-white animate-fadeIn">
      {/* 1. Selector Tab Berbentuk Pill Selengkung Navbar (Tanpa Angka & Tombol Solid Non-Gradient) */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-[#0B1528] border border-blue-500/20 backdrop-blur-2xl shadow-xl">
        {items.map((item, idx) => {
          const isSelected = idx === currentIndex;
          const label = archetypeLabels[idx] || (item.archetype_title?.replace(/^[0-9]+\.\s*/, '') || 'Rekomendasi');

          return (
            <button
              key={item.id}
              onClick={() => onSelectIndex(idx)}
              type="button"
              className={`flex-1 px-3 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                isSelected
                  ? 'bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30 border border-blue-400/40'
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

      {/* 2. Single Unified Card: Seluruh Rincian & Gambar Katalog Terintegrasi Bersih */}
      <div className="bg-[#081322]/90 rounded-3xl p-5 sm:p-6 border border-white/10 backdrop-blur-xl shadow-2xl space-y-4">
        {/* Header Bar: Title, Meta, Navigation & Score */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                {currentItem.archetype_title || `Pilihan ${currentIndex + 1}`}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-[11px] font-mono text-slate-400 uppercase">
                {currentItem.subcategory || currentItem.category}
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
              {currentItem.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
              <span>
                Rona: <strong className="text-white font-medium">{currentItem.base_colour}</strong>
              </span>
              <span>•</span>
              <span>
                Harga: <strong className="text-[#FACC15] font-semibold">{currentItem.price_idr}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-xs font-mono font-bold text-emerald-300">
              {currentItem.compatibility_score}% Match
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrev}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Product Showcase Row: Gambar Katalog 2D + Justifikasi AI & Mini Scores */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
          {/* Gambar Katalog 2D Jernih & Terang */}
          <div className="sm:col-span-4 aspect-square rounded-2xl overflow-hidden border border-slate-700/60 bg-[#071120] flex items-center justify-center p-2.5 shadow-inner relative">
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

          {/* Justifikasi Biometrik AI & 3 Nilai Kecocokan */}
          <div className="sm:col-span-8 space-y-2.5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                Justifikasi Biometrik AI
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentItem.stylist_reason ||
                  (currentItem as any).why_recommended ||
                  'Rekomendasi gaya yang diselaraskan secara presisi dengan proporsi biometrik dan rona kulit Anda.'}
              </p>
            </div>

            {/* 3 Mini Metric Badges */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 font-mono text-[10px]">
              <div className="bg-[#071120] p-1.5 rounded-xl border border-white/5 text-center">
                <span className="text-slate-400 block text-[9px]">Undertone</span>
                <strong className="text-emerald-400">{currentItem.color_match_score || 96}%</strong>
              </div>
              <div className="bg-[#071120] p-1.5 rounded-xl border border-white/5 text-center">
                <span className="text-slate-400 block text-[9px]">Siluet 3D</span>
                <strong className="text-sky-400">{currentItem.shape_match_score || 94}%</strong>
              </div>
              <div className="bg-[#071120] p-1.5 rounded-xl border border-white/5 text-center">
                <span className="text-slate-400 block text-[9px]">Acara</span>
                <strong className="text-indigo-400">92%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Point Detailed AI Biometric Reasoning */}
        <div className="space-y-2 pt-1 border-t border-white/5">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-white tracking-wide">
              Mengapa AI Merekomendasikan Item Ini?
            </span>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-400/20 px-2 py-0.5 rounded-full">
              Analisis Biometrik 3D
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            {/* Poin 1: Spektrum Rona Kulit */}
            <div className="bg-[#060e1a]/90 p-3 rounded-2xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  1. Analisis Spektrum Rona Kulit
                </span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-400/20 px-1.5 py-0.2 rounded-full">
                  {currentItem.color_match_score || 96}% Match
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed pl-5">
                Warna <strong className="text-white">{currentItem.base_colour}</strong> melengkapi rona kulit tropis Monk Scale Anda ({userProfile?.monk_tone?.code || 'MST-06'}), menghindari efek wash-out dan memancarkan kilau rona alami.
              </p>
            </div>

            {/* Poin 2: Proporsi Geometris 3D */}
            <div className="bg-[#060e1a]/90 p-3 rounded-2xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  2. Proporsi Geometris 3D
                </span>
                <span className="text-[10px] font-mono text-sky-300 bg-sky-500/15 border border-sky-400/20 px-1.5 py-0.2 rounded-full">
                  {currentItem.shape_match_score || 94}% Match
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed pl-5">
                Potongan siluet produk ini dirancang proporsional terhadap kontur wajah ({userProfile?.face_shape?.shape || 'Oval'}) dan postur torso Anda
                {userProfile?.gender?.label_id === 'female'
                  ? ', dengan aksen yang melengkapi gaya feminin Anda'
                  : userProfile?.gender?.label_id === 'male'
                  ? ', dengan aksen yang melengkapi gaya maskulin Anda'
                  : ''} sehingga menciptakan keseimbangan visual yang flattering.
              </p>
            </div>

            {/* Poin 3: Konteks Acara & Fit */}
            <div className="bg-[#060e1a]/90 p-3 rounded-2xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  3. Konteks Acara &amp; Fit
                </span>
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/15 border border-indigo-400/20 px-1.5 py-0.2 rounded-full">
                  92% Match
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed pl-5">
                Disesuaikan untuk skenario penggunaan <strong className="text-white">{currentItem.usage || 'Casual & Sports'}</strong> dengan siluet bahan yang jatuh rapi dan nyaman.
              </p>
            </div>
          </div>
        </div>

        {/* Saran Padu-Padan AI Stylist & Compliance */}
        <div className="bg-[#060e1a]/80 rounded-2xl p-3.5 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400">
              Saran Padu-Padan AI Stylist
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Koleksi Pilihan
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Padukan dengan kemeja warna netral atau kaos polos berkerah untuk menonjolkan aksen {currentItem.base_colour}. Siluet ini dirancang untuk memaksimalkan kontur wajah dan postur natural Anda.
          </p>
          <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Zero Persistent Biometrics (UU PDP No. 27/2022)
            </span>
            <span className="text-slate-500">60 FPS Real-Time AR</span>
          </div>
        </div>
      </div>
    </div>
  );
};
