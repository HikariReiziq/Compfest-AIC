"use client";

import React, { useState } from "react";
import { Glasses, HardHat, Shirt, Layers, ArrowRight, Sparkles, Lock, ChevronLeft } from "lucide-react";

interface CategorySelectorProps {
  onSelectCategory: (domain: "accessories" | "apparel", subcategory: "glasses" | "hats" | "shirts" | "jackets") => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  onSelectCategory,
}) => {
  // Sub-step: null = Main Domain Choice (Aksesoris vs Pakaian), "accessories" = Sub-choice (Kacamata vs Topi)
  const [activeDomain, setActiveDomain] = useState<"accessories" | null>(null);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* ============================================================ */}
      {/*  SCREEN 1: UTAMA — 2 PILIHAN (AKSESORIS vs PAKAIAN COMING SOON) */}
      {/* ============================================================ */}
      {!activeDomain ? (
        <>
          {/* Top Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>TAHAP 1: PILIH KATEGORI UTAMA</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Pilih Kategori Busana & Gaya
            </h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Pilih kategori yang ingin Anda eksplorasi. AI COBA akan menyesuaikan analisis biometrik dan rekomendasi gaya personal Anda.
            </p>
          </div>

          {/* 2 Main Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* 1. Aksesoris (Active) */}
            <div
              onClick={() => setActiveDomain("accessories")}
              className="glass-panel glass-card-hover rounded-3xl p-8 cursor-pointer group flex flex-col justify-between space-y-6 relative overflow-hidden border border-indigo-500/30 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/25 transition-all" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Glasses className="w-8 h-8 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    ✓ Siap Uji Coba AR
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">
                    Kategori Wajah & Kepala
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                    Aksesoris
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Eksplorasi model <strong>Kacamata (Glasses)</strong> dan <strong>Topi (Hats)</strong> yang presisi menyeimbangkan kontur wajah, garis rahang, dan rona kulit Anda.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-indigo-400 pt-4 border-t border-white/5 group-hover:text-indigo-300">
                <span>Pilih Aksesoris (Kacamata / Topi)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 2. Pakaian (Locked / Coming Soon) */}
            <div className="glass-panel rounded-3xl p-8 relative overflow-hidden border border-white/5 opacity-60 cursor-not-allowed select-none flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16 rounded-2xl bg-surface-50 border border-white/10 flex items-center justify-center text-slate-500">
                    <Shirt className="w-8 h-8" />
                  </div>
                  <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center space-x-1.5 font-bold">
                    <Lock className="w-3 h-3" />
                    <span>Coming Soon (Tahap 2)</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
                    Kategori Tubuh & Siluet
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-400">
                    Pakaian / Busana
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Rekomendasi <strong>Baju / Kaos</strong> dan <strong>Jaket Outerwear</strong>. Fitur ini memerlukan kalibrasi pose badan penuh (*full-body posture tracking*) dengan tangan diletakkan ke bawah.
                </p>
              </div>

              <div className="flex items-center text-xs font-mono text-slate-500 space-x-2 pt-4 border-t border-white/5">
                <Lock className="w-3.5 h-3.5" />
                <span>Tersedia pada pembaruan Tahap 2</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ============================================================ */
        /*  SCREEN 2: SUB-PILIHAN AKSESORIS (KACAMATA vs TOPI)          */
        /* ============================================================ */
        <div className="space-y-6 animate-fadeIn">
          {/* Back to Domain Header */}
          <div className="text-center space-y-2">
            <button
              onClick={() => setActiveDomain(null)}
              className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mb-1 font-mono"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Pilihan Kategori Utama</span>
            </button>

            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>TAHAP 1.1: PILIH JENIS AKSESORIS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Pilih Aksesoris yang Ingin Anda Coba
            </h1>

            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Tentukan jenis aksesoris yang ingin dipindai dan dicoba di 3D Augmented Reality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* 1. Kacamata */}
            <div
              onClick={() => onSelectCategory("accessories", "glasses")}
              className="glass-panel glass-card-hover rounded-3xl p-7 cursor-pointer group flex flex-col justify-between space-y-6 border border-indigo-500/20 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Glasses className="w-7 h-7 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                    Face Mesh 468 Landmark
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">
                    Eyewear Styling
                  </span>
                  <h3 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                    Kacamata (Glasses)
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Rekomendasi model bingkai (Wayfarer, Rectangular, Round, Aviator) yang menyeimbangkan sudut rahang, lebar pelipis, dan kontur wajah Anda.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-indigo-400 pt-4 border-t border-white/5 group-hover:text-indigo-300">
                <span>Pilih Kacamata & Mulai Pindai Wajah</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 2. Topi */}
            <div
              onClick={() => onSelectCategory("accessories", "hats")}
              className="glass-panel glass-card-hover rounded-3xl p-7 cursor-pointer group flex flex-col justify-between space-y-6 border border-indigo-500/20 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <HardHat className="w-7 h-7 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                    Head Contour Tracking
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">
                    Headwear Styling
                  </span>
                  <h3 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                    Topi (Hats / Headwear)
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Pilihan penutup kepala (Fedora, Bucket Hat, Beanie, Curved Cap) yang mempertegas simetri dahi dan proporsi kepala atas Anda.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-indigo-400 pt-4 border-t border-white/5 group-hover:text-indigo-300">
                <span>Pilih Topi & Mulai Pindai Wajah</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
