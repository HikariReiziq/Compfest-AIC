'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { RecommendationItem } from '../lib/mockData';

interface SwitchControlsProps {
  items: RecommendationItem[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenDetails: () => void;
}

export const SwitchControls: React.FC<SwitchControlsProps> = ({
  items,
  currentIndex,
  onSelectIndex,
  onPrev,
  onNext,
  onOpenDetails,
}) => {
  if (!items || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];

  const archetypeLabels = [
    '1. Best Match',
    '2. Safe Classic',
    '3. Bold Statement',
    '4. Modern Trendy',
  ];

  return (
    <div className="w-full space-y-3.5 text-white animate-fadeIn">
      {/* 1. Selector Tab Simpel & Minimalis (Sesuai Gaya Navbar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#071120] border border-blue-500/20 shadow-inner">
        {items.map((item, idx) => {
          const isSelected = idx === currentIndex;
          const label = archetypeLabels[idx] || `${idx + 1}. Rekomendasi`;

          return (
            <button
              key={item.id}
              onClick={() => onSelectIndex(idx)}
              type="button"
              className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-between gap-1.5 cursor-pointer select-none ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30 border border-blue-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="truncate">{label}</span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                {item.compatibility_score}%
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Card Rekomendasi Minimalis & Bersih (Enak Dilihat) */}
      <div className="bg-[#081322]/90 rounded-2xl p-5 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
        {/* Header: Title, Category/Price, Navigation & Score */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
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
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
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
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-xs font-mono font-bold text-emerald-300">
              {currentItem.compatibility_score}% Match
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrev}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Justifikasi Biometrik AI (Paragraf Minimalis & Bersih) */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
            Justifikasi Biometrik AI
          </span>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {currentItem.stylist_reason ||
              (currentItem as any).why_recommended ||
              'Rekomendasi gaya yang diselaraskan secara presisi dengan proporsi biometrik dan rona kulit Anda.'}
          </p>
        </div>

        {/* Action Button: Rincian Lengkap */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-sky-300 hover:text-white border border-blue-500/25 hover:border-blue-500 text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer group"
        >
          <span>Lihat Rincian Analisis Biometrik &amp; Spektrum Warna</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
