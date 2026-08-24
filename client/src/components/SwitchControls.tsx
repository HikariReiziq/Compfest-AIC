'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Crown,
  Shield,
  Zap,
  Flame,
  Palette,
  Tag,
  Layers,
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

  const archetypePills = [
    { key: 'perfect_match', label: '#1 Best Match', icon: Crown, color: 'text-amber-300', border: 'border-amber-400/40' },
    { key: 'safe_classic', label: '#2 Safe Classic', icon: Shield, color: 'text-sky-300', border: 'border-sky-400/40' },
    { key: 'bold_statement', label: '#3 Bold Statement', icon: Flame, color: 'text-rose-300', border: 'border-rose-400/40' },
    { key: 'modern_trendy', label: '#4 Modern Trendy', icon: Zap, color: 'text-purple-300', border: 'border-purple-400/40' },
  ];

  return (
    <div className="w-full space-y-4 text-white">
      {/* 4 Archetypes Selector Cards (Redesigned 10/10) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {items.map((item, idx) => {
          const isSelected = idx === currentIndex;
          const arch = archetypePills[idx] || {
            label: `#${idx + 1} Match`,
            icon: Sparkles,
            color: 'text-blue-300',
            border: 'border-blue-400/40',
          };
          const ArchIcon = arch.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectIndex(idx)}
              type="button"
              className={`relative p-3 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between min-h-[82px] cursor-pointer group select-none ${
                isSelected
                  ? 'bg-gradient-to-br from-[#0e223d] via-[#09172a] to-[#050e1b] border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.3)] scale-[1.02] z-10'
                  : 'bg-[#071120]/80 border-white/10 text-[#94A3B8] hover:border-sky-400/40 hover:bg-[#0c1c33]/90 hover:scale-[1.01]'
              }`}
            >
              {/* Top glow accent on active */}
              {isSelected && (
                <div className="absolute top-0 left-3 right-3 h-[2px] bg-gradient-to-r from-blue-500 via-sky-400 to-[#FACC15] rounded-full" />
              )}

              {/* Top Row: Archetype Pill & Match Score */}
              <div className="flex items-center justify-between w-full mb-1">
                <span className={`text-[10px] sm:text-[11px] font-mono font-bold flex items-center gap-1 ${arch.color}`}>
                  <ArchIcon className="w-3 h-3 shrink-0" />
                  <span>{arch.label}</span>
                </span>
                <span
                  className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md border ${
                    isSelected
                      ? 'bg-amber-400/20 text-[#FACC15] border-amber-400/40 shadow-sm'
                      : 'bg-white/5 text-slate-300 border-white/10'
                  }`}
                >
                  {item.compatibility_score}%
                </span>
              </div>

              {/* Product Name (Clean 2-line display) */}
              <p
                className={`text-xs font-bold leading-tight line-clamp-2 transition-colors ${
                  isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                }`}
                title={item.name}
              >
                {item.name}
              </p>

              {/* Active Indicator Bar */}
              {isSelected && (
                <div className="mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                  <span className="text-[9px] font-mono font-bold text-sky-300 uppercase tracking-wider">
                    Terpasang di 3D AR
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Hero AI Styling Verdict Card (Redesigned Bento Box 10/10) */}
      <div className="bg-gradient-to-b from-[#0b172a]/95 via-[#081120]/95 to-[#040810]/95 rounded-3xl p-5 sm:p-6 space-y-4 border border-sky-500/30 backdrop-blur-2xl shadow-2xl">
        {/* Header Ribbon: Archetype Title & Score Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-xs font-mono font-bold text-sky-300 shadow-inner">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentItem.archetype_title || 'Pilihan Rekomendasi AI'}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-xs font-mono font-bold text-emerald-300 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentItem.compatibility_score}% AI COMPATIBILITY</span>
          </div>
        </div>

        {/* Product Navigation & Title Hero */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onPrev}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#071120] hover:bg-sky-600 text-slate-300 hover:text-white border border-white/15 hover:border-sky-400/50 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 shadow-lg"
            title="Model Rekomendasi Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center flex-1 space-y-1.5 px-1">
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
              {currentItem.name}
            </h3>

            {/* Bento Metadata Capsules */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900/80 border border-white/10 text-[11px] font-mono text-slate-300">
                <Palette className="w-3 h-3 text-sky-400" />
                <span>Rona:</span>
                <strong className="text-white font-semibold">{currentItem.base_colour}</strong>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900/80 border border-white/10 text-[11px] font-mono text-slate-300">
                <Tag className="w-3 h-3 text-amber-400" />
                <span>Harga:</span>
                <strong className="text-[#FACC15] font-bold">{currentItem.price_idr}</strong>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900/80 border border-white/10 text-[11px] font-mono text-slate-300">
                <Layers className="w-3 h-3 text-purple-400" />
                <strong className="text-purple-300 uppercase font-semibold">
                  {currentItem.subcategory || currentItem.category}
                </strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onNext}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#071120] hover:bg-sky-600 text-slate-300 hover:text-white border border-white/15 hover:border-sky-400/50 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 shadow-lg"
            title="Model Rekomendasi Selanjutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* AI Biometric Justification Box (Bento Card) */}
        <div className="bg-[#050d18]/90 rounded-2xl p-4 border border-sky-500/20 space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-sky-300 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Justifikasi Biometrik AI</span>
            </span>
            <span className="text-[10px] font-mono text-[#94A3B8]">
              Harmonisasi Spektrum
            </span>
          </div>

          <p className="text-slate-300 leading-relaxed text-xs sm:text-sm font-normal">
            {currentItem.stylist_reason ||
              (currentItem as any).why_recommended ||
              'Rekomendasi gaya yang diselaraskan secara presisi dengan proporsi biometrik dan rona kulit Anda.'}
          </p>

          {/* 3 Biometric Feature Highlights */}
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] font-mono text-slate-400">
            <div className="bg-slate-900/80 p-1.5 rounded-lg border border-white/5 text-center">
              <span className="text-sky-300 font-bold block">Undertone</span>
              <span>Harmonis</span>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded-lg border border-white/5 text-center">
              <span className="text-amber-300 font-bold block">Siluet Wajah</span>
              <span>Proporsional</span>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded-lg border border-white/5 text-center">
              <span className="text-emerald-300 font-bold block">Gaya</span>
              <span>Presisi</span>
            </div>
          </div>
        </div>

        {/* Action Button: Open Full Biometric Breakdown */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600/20 via-sky-500/20 to-indigo-600/20 hover:from-blue-600 hover:to-sky-500 text-sky-200 hover:text-white border border-sky-400/40 hover:border-sky-400 text-xs sm:text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg group active:scale-[0.99]"
        >
          <Sparkles className="w-4 h-4 text-sky-300 group-hover:rotate-12 transition-transform" />
          <span>Lihat Rincian Analisis Biometrik &amp; Spektrum Warna</span>
          <ArrowRight className="w-4 h-4 ml-1 text-sky-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
