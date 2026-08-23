"use client";

import React from "react";
import { Glasses, HardHat, Shirt, ArrowRight, Sparkles } from "lucide-react";

interface CategorySelectorProps {
  onSelectCategory: (
    domain: "accessories" | "apparel",
    subcategory: "glasses" | "hats" | "shirts"
  ) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  onSelectCategory,
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>TAHAP 1: PILIH KATEGORI FESYEN & GAYA 3D</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Pilih Kategori Busana & Aksesoris Anda
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Pilih item yang ingin Anda coba secara Virtual 3D GLB. AI COBA akan menyesuaikan analisis biometrik wajah & proporsi tubuh untuk kurasi gaya paling sempurna.
        </p>
      </div>

      {/* 3 Cards Grid (3 col on Desktop, 1 col on Mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* 1. Kacamata (Glasses) */}
        <div
          onClick={() => onSelectCategory("accessories", "glasses")}
          className="glass-panel glass-card-hover rounded-3xl p-7 cursor-pointer group flex flex-col justify-between space-y-6 relative overflow-hidden border border-indigo-500/30 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition-all" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Glasses className="w-7 h-7 text-indigo-400" />
              </div>
              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                ✓ 20 Model 3D GLB
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">
                Aksesoris Wajah • Eyewear
              </span>
              <h2 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                Kacamata
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Analisis kontur wajah (6 bentuk wajah, tipe hidung, mata) dan rona kulit untuk kurasi bingkai (*frame*) dan lensa kaca transparan fotorealistik.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-indigo-400 pt-4 border-t border-white/5 group-hover:text-indigo-300">
            <span>Pindai Wajah & Coba 3D</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 2. Topi (Hats) */}
        <div
          onClick={() => onSelectCategory("accessories", "hats")}
          className="glass-panel glass-card-hover rounded-3xl p-7 cursor-pointer group flex flex-col justify-between space-y-6 relative overflow-hidden border border-rose-500/30 hover:border-rose-400 hover:shadow-2xl hover:shadow-rose-500/20 transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/20 transition-all" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <HardHat className="w-7 h-7 text-rose-400" />
              </div>
              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                ✓ 20 Model 3D GLB
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 font-semibold">
                Penutup Kepala • Headwear
              </span>
              <h2 className="text-2xl font-bold text-white group-hover:text-rose-300 transition-colors">
                Topi
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Kurasi 20 siluet *Cap, Beanie, Bucket Hat, Fedora,* dan *Panama* yang presisi membungkus kepala sesuai rasio dahi dan bentuk wajah.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-rose-400 pt-4 border-t border-white/5 group-hover:text-rose-300">
            <span>Pindai Kepala & Coba 3D</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 3. Baju (Shirts & Tops) */}
        <div
          onClick={() => onSelectCategory("apparel", "shirts")}
          className="glass-panel glass-card-hover rounded-3xl p-7 cursor-pointer group flex flex-col justify-between space-y-6 relative overflow-hidden border border-blue-500/30 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Shirt className="w-7 h-7 text-blue-400" />
              </div>
              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">
                ✓ 20 Model 3D GLB
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-blue-400 font-semibold">
                Pakaian Atasan • Tops & Shirts
              </span>
              <h2 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">
                Baju
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Fitting 3D presisi **Kemeja Oxford, Kaos Supima, Polo, Hoodie,** dan **Flannel** yang disesuaikan dengan rasio lebar bahu dan lingkar dada.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-blue-400 pt-4 border-t border-white/5 group-hover:text-blue-300">
            <span>Pindai Tubuh & Coba 3D</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySelector;
