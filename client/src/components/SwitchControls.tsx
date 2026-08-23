"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Sparkles, Info, ShieldCheck, Tag } from "lucide-react";
import { RecommendationItem } from "../lib/mockData";

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
    { key: "perfect_match", label: "#1 Best Match", color: "from-indigo-600 to-rose-600" },
    { key: "safe_classic", label: "#2 Safe Classic", color: "from-slate-700 to-slate-600" },
    { key: "bold_statement", label: "#3 Bold Statement", color: "from-rose-600 to-amber-600" },
    { key: "modern_trendy", label: "#4 Modern Trendy", color: "from-emerald-600 to-teal-600" },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Top 4 Archetypes Selector Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map((item, idx) => {
          const isSelected = idx === currentIndex;
          return (
            <button
              key={item.id}
              onClick={() => onSelectIndex(idx)}
              className={`p-2.5 rounded-2xl text-left border transition-all duration-300 flex flex-col justify-between space-y-1 ${
                isSelected
                  ? "bg-surface-50 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400"
                  : "bg-surface-100/60 border-white/5 hover:border-white/20 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-mono font-bold text-indigo-400">
                  {archetypePills[idx]?.label || `#${idx + 1}`}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
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
      <div className="glass-panel-glow rounded-3xl p-5 space-y-4">
        {/* Navigation & Title Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onPrev}
            className="w-12 h-12 rounded-2xl bg-surface-50 hover:bg-indigo-600 text-white border border-white/10 hover:border-indigo-400 flex items-center justify-center transition-all duration-200 shadow-md hover:scale-105 shrink-0"
            title="Model Rekomendasi Sebelumnya"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="text-center flex-1 space-y-0.5">
            <div className="inline-flex items-center space-x-1.5 text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>{currentItem.archetype_title}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {currentItem.name}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Warna: <strong className="text-white">{currentItem.base_colour}</strong> • Harga: <strong className="text-emerald-400">{currentItem.price_idr}</strong>
            </p>
          </div>

          <button
            onClick={onNext}
            className="w-12 h-12 rounded-2xl bg-surface-50 hover:bg-indigo-600 text-white border border-white/10 hover:border-indigo-400 flex items-center justify-center transition-all duration-200 shadow-md hover:scale-105 shrink-0"
            title="Model Rekomendasi Selanjutnya"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Centered Preview Thumbnail */}
        <div className="w-full h-36 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-center p-2 overflow-hidden shadow-inner">
          <img
            src={currentItem.preview_image_url || `/images/products/preview/${currentItem.id}.png`}
            alt={currentItem.name}
            className="w-full h-full object-contain filter drop-shadow-md"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        </div>

        {/* Compatibility Breakdown Bars */}
        <div className="bg-surface-50/70 rounded-2xl p-4 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Skor Keserasian Keseluruhan:</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">
              {currentItem.compatibility_score}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Kesesuaian Warna Kulit</span>
                <span className="font-mono text-indigo-300">{currentItem.color_match_score}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${currentItem.color_match_score}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Kesesuaian Bentuk / Siluet</span>
                <span className="font-mono text-rose-300">{currentItem.shape_match_score}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${currentItem.shape_match_score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stylist Reason Preview */}
          <p className="text-xs text-slate-300 pt-2 border-t border-white/5 leading-relaxed italic">
            "{currentItem.stylist_reason}"
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onOpenDetails}
          className="w-full py-3 rounded-xl text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all flex items-center justify-center space-x-1.5"
        >
          <Info className="w-4 h-4" />
          <span>Lihat Detail Analisis AI & Spesifikasi Produk</span>
        </button>
      </div>
    </div>
  );
};
