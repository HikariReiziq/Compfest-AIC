'use client';

import React from 'react';
import { Glasses, Crown, Shirt, ArrowRight, Sparkles } from 'lucide-react';

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

  const categories = [
    {
      domain: 'accessories' as const,
      subcat: 'glasses' as const,
      title: 'Kacamata',
      subtitle: 'Aksesori Wajah • Eyewear',
      count: '7 Model 3D',
      icon: Glasses,
      desc: 'Analisis kontur wajah (6 bentuk wajah, rona kulit Monk Scale) untuk kurasi bingkai Wayfarer, Aviator, Geometric, dan Browline fotorealistik.',
      actionText: 'Pindai Wajah & Coba 3D',
    },
    {
      domain: 'accessories' as const,
      subcat: 'hats' as const,
      title: 'Topi & Headwear',
      subtitle: 'Penutup Kepala • Headwear',
      count: '11 Model 3D',
      icon: Crown,
      desc: 'Kurasi siluet Fedora, Western Cowboy, Sun Beach Hat, Renaissance Bonnet, Bicorn, dan Pith Helmet yang presisi di proporsi kepala.',
      actionText: 'Pindai Wajah & Coba 3D',
    },
    {
      domain: 'apparel' as const,
      subcat: 'shirts' as const,
      title: 'Pakaian & Kemeja',
      subtitle: 'Busana Tubuh • Apparel',
      count: '19 Model 3D',
      icon: Shirt,
      desc: 'Analisis lebar bahu, rasio V-shape, dan siluet torso dengan Invisible Depth Occluder anti-nembus untuk kemeja pria & blus wanita.',
      actionText: 'Pindai Torso & Coba 3D',
    },
  ];

  return (
    <div className="w-full space-y-10 animate-fadeIn text-white max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="text-center space-y-4 relative">
        <div
          className={`inline-flex items-center gap-2.5 px-5 py-2 rounded-full border text-xs sm:text-sm font-mono font-bold tracking-[0.14em] uppercase backdrop-blur-xl transition-all ${
            isFemale
              ? 'bg-[#1c0b1a] border-pink-500/40 text-pink-300'
              : 'bg-[#0B1528] border-blue-500/40 text-[#93C5FD]'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isFemale ? 'text-pink-400' : 'text-[#38BDF8]'}`} />
          <span>TAHAP 1: PILIH KATEGORI GAYA &amp; FESYEN 3D</span>
        </div>

        <h1
          className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Pilih Kategori Busana &amp; Aksesori Anda
        </h1>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-light">
          Pilih item yang ingin Anda coba secara Virtual 3D. AI COBA akan menyesuaikan analisis biometrik wajah &amp; proporsi tubuh untuk kurasi gaya paling presisi.
        </p>
      </div>

      {/* 3 Luxury Double-Bezel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 pt-2 items-stretch">
        {categories.map((cat, idx) => {
          const IconComp = cat.icon;

          return (
            <div
              key={cat.subcat}
              onClick={() => onSelectCategory(cat.domain, cat.subcat)}
              className={`group relative p-2 rounded-[2.25rem] border backdrop-blur-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between hover:scale-[1.02] active:scale-[0.98] ${
                isFemale
                  ? 'bg-[#1c0b1a] border-pink-500/30 hover:border-pink-400'
                  : 'bg-[#0B1528] border-blue-500/30 hover:border-blue-400'
              }`}
            >
              {/* Inner Core */}
              <div
                className={`w-full h-full p-6 sm:p-7 rounded-[calc(2.25rem-0.5rem)] flex flex-col justify-between space-y-6 transition-all duration-300 ${
                  isFemale
                    ? 'bg-[#140613] group-hover:bg-[#1a0919]'
                    : 'bg-[#071120] group-hover:bg-[#0b172a]'
                }`}
              >
                <div className="space-y-5">
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                        isFemale
                          ? 'bg-[#220a20] border-pink-500/40 text-pink-300 group-hover:border-pink-300'
                          : 'bg-[#0a1832] border-blue-500/40 text-[#93C5FD] group-hover:border-blue-300'
                      }`}
                    >
                      <IconComp className="w-7 h-7" />
                    </div>

                    <span
                      className={`text-[11px] font-mono px-3 py-1 rounded-full border font-bold flex items-center gap-1.5 backdrop-blur-md ${
                        isFemale
                          ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                          : 'bg-blue-500/15 text-[#93C5FD] border-blue-500/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isFemale ? 'bg-pink-400' : 'bg-sky-400'}`} />
                      <span>{cat.count}</span>
                    </span>
                  </div>

                  {/* Title & Eyebrow */}
                  <div className="space-y-1.5">
                    <span
                      className={`text-[10px] sm:text-xs font-mono uppercase tracking-[0.18em] font-semibold block ${
                        isFemale ? 'text-pink-400' : 'text-[#38BDF8]'
                      }`}
                    >
                      {cat.subtitle}
                    </span>
                    <h2
                      className={`text-2xl sm:text-[1.65rem] font-bold text-white tracking-tight transition-colors duration-300 ${
                        isFemale ? 'group-hover:text-pink-200' : 'group-hover:text-sky-200'
                      }`}
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {cat.title}
                    </h2>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-[13px] text-slate-300/90 leading-relaxed font-light">
                    {cat.desc}
                  </p>
                </div>

                {/* Bottom Nested CTA Action Strip */}
                <div
                  className={`flex items-center justify-between pt-4 mt-2 border-t text-xs sm:text-sm font-bold font-mono transition-all duration-300 ${
                    isFemale
                      ? 'border-pink-500/15 text-pink-300 group-hover:text-white'
                      : 'border-blue-500/15 text-[#93C5FD] group-hover:text-white'
                  }`}
                >
                  <span>{cat.actionText}</span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 group-hover:scale-110 group-hover:translate-x-1 ${
                      isFemale
                        ? 'bg-pink-600/25 border-pink-500/40 text-pink-300 group-hover:bg-pink-600 group-hover:text-white'
                        : 'bg-blue-600/25 border-blue-500/40 text-sky-300 group-hover:bg-blue-600 group-hover:text-white'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
