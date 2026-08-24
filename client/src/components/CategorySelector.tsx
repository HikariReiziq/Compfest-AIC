'use client';

import React from 'react';
import { Glasses, Crown, Shirt, ArrowRight, Check } from 'lucide-react';

interface CategorySelectorProps {
  onSelectCategory: (
    domain: 'accessories' | 'apparel',
    subcategory: 'glasses' | 'hats' | 'shirts'
  ) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  onSelectCategory,
}) => {
  return (
    <div className="w-full space-y-9 animate-fadeIn text-white">
      {/* Top Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-[#0B1528] border border-blue-500/30 text-[#93C5FD] text-sm sm:text-base font-mono font-bold shadow-2xl tracking-wider">
          <span>TAHAP 1: PILIH KATEGORI FESYEN &amp; GAYA 3D</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Pilih Kategori Busana &amp; Aksesori Anda
        </h1>
        <p className="text-[#94A3B8] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Pilih item yang ingin Anda coba secara Virtual 3D. AI COBA akan menyesuaikan analisis biometrik wajah &amp; proporsi tubuh untuk kurasi gaya paling sempurna.
        </p>
      </div>

      {/* 3 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7 pt-2 items-stretch">
        {/* 1. Kacamata (Glasses) */}
        <div
          onClick={() => onSelectCategory('accessories', 'glasses')}
          className="bg-[#0B1528]/90 rounded-3xl p-8 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden border border-blue-500/20 hover:border-blue-500 transition-all duration-300 backdrop-blur-xl shadow-xl hover:scale-[1.01]"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 rounded-2xl bg-[#071120] border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Glasses className="w-8 h-8 text-[#38BDF8]" />
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-blue-500/20 text-[#93C5FD] border border-blue-500/30 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>7 Model 3D</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase tracking-widest text-[#38BDF8] font-semibold">
                Aksesori Wajah • Eyewear
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white group-hover:text-[#38BDF8] transition-colors">
                Kacamata
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              Analisis kontur wajah (6 bentuk wajah, rona kulit Monk Scale) untuk kurasi bingkai (Wayfarer, Aviator, Geometric, Browline) dan lensa fotorealistik.
            </p>
          </div>

          <div className="flex items-center justify-between text-sm font-bold text-[#38BDF8] pt-6 mt-6 border-t border-white/10 group-hover:text-white">
            <span>Pindai Wajah &amp; Coba 3D</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-[#FACC15]" />
          </div>
        </div>

        {/* 2. Topi (Hats) */}
        <div
          onClick={() => onSelectCategory('accessories', 'hats')}
          className="bg-[#0B1528]/90 rounded-3xl p-8 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden border border-blue-500/20 hover:border-blue-500 transition-all duration-300 backdrop-blur-xl shadow-xl hover:scale-[1.01]"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 rounded-2xl bg-[#071120] border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Crown className="w-8 h-8 text-[#60A5FA] fill-current" />
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-blue-500/20 text-[#93C5FD] border border-blue-500/30 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>11 Model 3D</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase tracking-widest text-[#60A5FA] font-semibold">
                Penutup Kepala • Headwear
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white group-hover:text-[#60A5FA] transition-colors">
                Topi
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              Kurasi siluet Fedora, Western Cowboy, Sun Beach Hat, Renaissance Bonnet, Bicorn, dan Pith Helmet yang pas di proporsi kepala.
            </p>
          </div>

          <div className="flex items-center justify-between text-sm font-bold text-[#60A5FA] pt-6 mt-6 border-t border-white/10 group-hover:text-white">
            <span>Pindai Wajah &amp; Coba 3D</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-[#FACC15]" />
          </div>
        </div>

        {/* 3. Pakaian (Shirts) */}
        <div
          onClick={() => onSelectCategory('apparel', 'shirts')}
          className="bg-[#0B1528]/90 rounded-3xl p-8 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden border border-blue-500/20 hover:border-blue-500 transition-all duration-300 backdrop-blur-xl shadow-xl hover:scale-[1.01]"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 rounded-2xl bg-[#071120] border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Shirt className="w-8 h-8 text-[#38BDF8] fill-current" />
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-blue-500/20 text-[#93C5FD] border border-blue-500/30 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>19 Model 3D</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase tracking-widest text-[#38BDF8] font-semibold">
                Busana Tubuh • Apparel
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white group-hover:text-[#38BDF8] transition-colors">
                Pakaian &amp; Kemeja
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              Analisis lebar bahu, rasio V-shape, dan siluet torso dengan Invisible Depth Occluder anti-nembus untuk kemeja pria &amp; blus wanita.
            </p>
          </div>

          <div className="flex items-center justify-between text-sm font-bold text-[#38BDF8] pt-6 mt-6 border-t border-white/10 group-hover:text-white">
            <span>Pindai Torso &amp; Coba 3D</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-[#FACC15]" />
          </div>
        </div>
      </div>
    </div>
  );
};
