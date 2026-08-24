'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Info, ShieldCheck, Tag } from 'lucide-react';
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
    { key: 'perfect_match', label: '#1 Best Match' },
    { key: 'safe_classic', label: '#2 Safe Classic' },
    { key: 'bold_statement', label: '#3 Bold Statement' },
    { key: 'modern_trendy', label: '#4 Modern Trendy' },
  ];

  return (
    <div className="w-full space-y-5 text-white">
      {/* Top 4 Archetypes Selector Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {items.map((item, idx) => {
          const isSelected = idx === currentIndex;
          return (
            <button
              key={item.id}
              onClick={() => onSelectIndex(idx)}
              className={`p-3 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between h-[72px] cursor-pointer shadow-md ${
                isSelected
                  ? 'bg-[#0B1528] border-blue-500 text-white'
                  : 'bg-[#08101E]/80 border-white/10 text-[#94A3B8] hover:border-blue-500/30'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-mono font-bold text-[#93C5FD]">
                  {archetypePills[idx]?.label || `#${idx + 1}`}
                </span>
                <span className="text-[11px] font-mono text-[#FACC15] font-bold">
                  {item.compatibility_score}%
                </span>
              </div>
              <p className="text-xs font-semibold text-white truncate w-full">
                {item.name}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Switcher Controls Box */}
      <div className="bg-[#0B1528]/90 rounded-3xl p-6 sm:p-7 space-y-5 border border-blue-500/20 backdrop-blur-xl shadow-xl">
        {/* Navigation & Title Bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onPrev}
            className="w-12 h-12 rounded-full bg-[#071120] hover:bg-blue-600 text-white border border-blue-500/30 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 shadow-lg"
            title="Model Rekomendasi Sebelumnya"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="text-center flex-1 space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#38BDF8] font-bold">
              <span>{currentItem.archetype_title}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {currentItem.name}
            </h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] font-mono">
              Warna: <strong className="text-white">{currentItem.base_colour}</strong> • Harga: <strong className="text-[#FACC15]">{currentItem.price_idr}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onNext}
            className="w-12 h-12 rounded-full bg-[#071120] hover:bg-blue-600 text-white border border-blue-500/30 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 shadow-lg"
            title="Model Rekomendasi Selanjutnya"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* AI Scientific Justification Box */}
        <div className="bg-black/60 rounded-2xl p-5 border border-blue-500/20 space-y-2.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[#93C5FD] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
              Justifikasi Biometrik AI
            </span>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-[#93C5FD] border border-blue-500/30 font-bold">
              {currentItem.compatibility_score}% Match
            </span>
          </div>
          <p className="text-[#94A3B8] leading-relaxed text-xs sm:text-sm">
            {currentItem.stylist_reason || (currentItem as any).why_recommended || 'Rekomendasi gaya yang diselaraskan dengan proporsi dan warna kulit Anda.'}
          </p>
        </div>

        {/* Action Button to Open Full Explanation Modal */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full py-3.5 rounded-full bg-[#071120] hover:bg-blue-600 text-[#93C5FD] hover:text-white border border-blue-500/30 text-xs sm:text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <Info className="w-4 h-4" />
          <span>Lihat Rincian Analisis Biometrik &amp; Spektrum Warna</span>
        </button>
      </div>
    </div>
  );
};
