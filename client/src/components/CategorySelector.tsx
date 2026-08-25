'use client';

import React from 'react';
import { Glasses, Crown, Shirt, ArrowRight } from 'lucide-react';

interface CategorySelectorProps {
  gender?: 'male' | 'female';
  onSelectCategory: (
    domain: 'accessories' | 'apparel',
    subcategory: 'glasses' | 'hats' | 'shirts'
  ) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  gender = 'male',
  onSelectCategory,
}) => {
  const isFemale = gender === 'female';

  return (
    <div className="w-full space-y-9 animate-fadeIn text-white">
      {/* Top Header */}
      <div className="text-center space-y-4">
        <div
          className={`inline-flex items-center gap-3 px-6 py-2.5 rounded-full border text-sm sm:text-base font-mono font-bold shadow-2xl tracking-wider ${
            isFemale
              ? 'bg-[#1c0b1a] border-pink-500/30 text-pink-300'
              : 'bg-[#0B1528] border-blue-500/30 text-[#93C5FD]'
          }`}
        >
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
          className={`rounded-3xl p-8 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden border transition-all duration-300 backdrop-blur-xl shadow-xl hover:scale-[1.01] ${
            isFemale
              ? 'bg-[#180918]/90 border-pink-500/20 hover:border-pink-500 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]'
              : 'bg-[#0B1528]/90 border-blue-500/20 hover:border-blue-500'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              {/* Clean Glowing Vector Icon */}
              <div
                className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 ${
                  isFemale
                    ? 'bg-[#140614] border-pink-500/30 group-hover:border-pink-400'
                    : 'bg-[#071120] border-blue-500/30 group-hover:border-blue-400'
                }`}
              >
                <Glasses className={`w-8 h-8 ${isFemale ? 'text-pink-400' : 'text-[#38BDF8]'}`} />
              </div>
              <span
                className={`text-xs font-mono px-3 py-1 rounded-full border font-bold flex items-center gap-1.5 ${
                  isFemale
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                    : 'bg-blue-500/20 text-[#93C5FD] border-blue-500/30'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isFemale ? 'bg-pink-400' : 'bg-sky-400'}`} />
                <span>7 Model 3D</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <span
                className={`text-xs font-mono uppercase tracking-widest font-semibold ${
                  isFemale ? 'text-pink-400' : 'text-[#38BDF8]'
                }`}
              >
                Aksesori Wajah • Eyewear
              </span>
              <h2
                className={`text-2xl sm:text-3xl font-bold text-white transition-colors ${
                  isFemale ? 'group-hover:text-pink-300' : 'group-hover:text-[#38BDF8]'
                }`}
              >
                Kacamata
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              Analisis kontur wajah (6 bentuk wajah, rona kulit Monk Scale) untuk kurasi bingkai (Wayfarer, Aviator, Geometric, Browline) dan lensa fotorealistik.
            </p>
          </div>

          <div
            className={`flex items-center justify-between text-sm font-bold pt-6 mt-6 border-t border-white/10 group-hover:text-white ${
              isFemale ? 'text-pink-400' : 'text-[#38BDF8]'
            }`}
          >
            <span>Pindai Wajah &amp; Coba 3D</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-[#FACC15]" />
          </div>
        </div>

        {/* 2. Topi (Hats) */}
        <div
          onClick={() => onSelectCategory('accessories', 'hats')}
          className={`rounded-3xl p-8 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden border transition-all duration-300 backdrop-blur-xl shadow-xl hover:scale-[1.01] ${
            isFemale
              ? 'bg-[#180918]/90 border-pink-500/20 hover:border-pink-500 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]'
              : 'bg-[#0B1528]/90 border-blue-500/20 hover:border-blue-500'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              {/* Clean Glowing Vector Icon */}
              <div
                className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 ${
                  isFemale
                    ? 'bg-[#140614] border-pink-500/30 group-hover:border-pink-400'
                    : 'bg-[#071120] border-blue-500/30 group-hover:border-blue-400'
                }`}
              >
                <Crown className={`w-8 h-8 ${isFemale ? 'text-pink-400' : 'text-[#60A5FA]'} fill-current`} />
              </div>
              <span
                className={`text-xs font-mono px-3 py-1 rounded-full border font-bold flex items-center gap-1.5 ${
                  isFemale
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                    : 'bg-blue-500/20 text-[#93C5FD] border-blue-500/30'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isFemale ? 'bg-pink-400' : 'bg-sky-400'}`} />
                <span>11 Model 3D</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <span
                className={`text-xs font-mono uppercase tracking-widest font-semibold ${
                  isFemale ? 'text-pink-400' : 'text-[#60A5FA]'
                }`}
              >
                Penutup Kepala • Headwear
              </span>
              <h2
                className={`text-2xl sm:text-3xl font-bold text-white transition-colors ${
                  isFemale ? 'group-hover:text-pink-300' : 'group-hover:text-[#60A5FA]'
                }`}
              >
                Topi
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              Kurasi siluet Fedora, Western Cowboy, Sun Beach Hat, Renaissance Bonnet, Bicorn, dan Pith Helmet yang pas di proporsi kepala.
            </p>
          </div>

          <div
            className={`flex items-center justify-between text-sm font-bold pt-6 mt-6 border-t border-white/10 group-hover:text-white ${
              isFemale ? 'text-pink-400' : 'text-[#60A5FA]'
            }`}
          >
            <span>Pindai Wajah &amp; Coba 3D</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-[#FACC15]" />
          </div>
        </div>

        {/* 3. Pakaian (Shirts) */}
        <div
          onClick={() => onSelectCategory('apparel', 'shirts')}
          className={`rounded-3xl p-8 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden border transition-all duration-300 backdrop-blur-xl shadow-xl hover:scale-[1.01] ${
            isFemale
              ? 'bg-[#180918]/90 border-pink-500/20 hover:border-pink-500 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]'
              : 'bg-[#0B1528]/90 border-blue-500/20 hover:border-blue-500'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              {/* Clean Glowing Vector Icon */}
              <div
                className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 ${
                  isFemale
                    ? 'bg-[#140614] border-pink-500/30 group-hover:border-pink-400'
                    : 'bg-[#071120] border-blue-500/30 group-hover:border-blue-400'
                }`}
              >
                <Shirt className={`w-8 h-8 ${isFemale ? 'text-pink-400' : 'text-[#38BDF8]'} fill-current`} />
              </div>
              <span
                className={`text-xs font-mono px-3 py-1 rounded-full border font-bold flex items-center gap-1.5 ${
                  isFemale
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                    : 'bg-blue-500/20 text-[#93C5FD] border-blue-500/30'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isFemale ? 'bg-pink-400' : 'bg-sky-400'}`} />
                <span>19 Model 3D</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <span
                className={`text-xs font-mono uppercase tracking-widest font-semibold ${
                  isFemale ? 'text-pink-400' : 'text-[#38BDF8]'
                }`}
              >
                Busana Tubuh • Apparel
              </span>
              <h2
                className={`text-2xl sm:text-3xl font-bold text-white transition-colors ${
                  isFemale ? 'group-hover:text-pink-300' : 'group-hover:text-[#38BDF8]'
                }`}
              >
                Pakaian &amp; Kemeja
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              Analisis lebar bahu, rasio V-shape, dan siluet torso dengan Invisible Depth Occluder anti-nembus untuk kemeja pria &amp; blus wanita.
            </p>
          </div>

          <div
            className={`flex items-center justify-between text-sm font-bold pt-6 mt-6 border-t border-white/10 group-hover:text-white ${
              isFemale ? 'text-pink-400' : 'text-[#38BDF8]'
            }`}
          >
            <span>Pindai Torso &amp; Coba 3D</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-[#FACC15]" />
          </div>
        </div>
      </div>
    </div>
  );
};
