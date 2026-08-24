'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
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

  return (
    <div className="w-full space-y-3.5 text-white animate-fadeIn">
      {/* 1. Selector Tab Berbentuk Pill Selengkung Navbar (Tanpa Angka 1/2/3/4) */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-[#0B1528]/90 border border-blue-500/20 backdrop-blur-2xl shadow-xl">
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
                  ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold shadow-md shadow-blue-600/30 border border-blue-400/40'
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

      {/* 2. Card Rekomendasi Utama (Bersih & Elegan) */}
      <div className="bg-[#081322]/90 rounded-3xl p-5 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
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

        {/* Justifikasi Biometrik AI Singkat */}
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
      </div>

      {/* 3. Rincian Lengkap: Mengapa AI Merekomendasikan Item Ini? (Ditaruh Langsung di Luar) */}
      <div className="bg-[#081322]/85 rounded-3xl p-5 border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
              Mengapa AI Merekomendasikan Item Ini?
            </h4>
          </div>
          <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-400/20 px-2 py-0.5 rounded-full">
            Analisis Biometrik 3D
          </span>
        </div>

        <div className="space-y-2.5 text-xs text-slate-300">
          {/* Poin 1: Analisis Spektrum Rona Kulit */}
          <div className="bg-[#060e1a]/90 p-3.5 rounded-2xl border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-300 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                1. Analisis Spektrum Rona Kulit
              </span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-400/20 px-1.5 py-0.2 rounded-full">
                {currentItem.color_match_score || 80}% Match
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed pl-5">
              Warna <strong className="text-white">{currentItem.base_colour}</strong> melengkapi rona kulit tropis Monk Scale Anda ({userProfile?.monk_tone?.code || 'MST-06'}), menghindari efek wash-out dan memancarkan kilau rona alami.
            </p>
          </div>

          {/* Poin 2: Proporsi Geometris 3D */}
          <div className="bg-[#060e1a]/90 p-3.5 rounded-2xl border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                2. Proporsi Geometris 3D
              </span>
              <span className="text-[10px] font-mono text-sky-300 bg-sky-500/15 border border-sky-400/20 px-1.5 py-0.2 rounded-full">
                {currentItem.shape_match_score || 100}% Match
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
          <div className="bg-[#060e1a]/90 p-3.5 rounded-2xl border border-white/10 space-y-1.5">
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
              Disesuaikan untuk skenario penggunaan <strong className="text-white">{currentItem.usage || 'Sports & Daily'}</strong> dengan siluet bahan yang jatuh rapi dan nyaman.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Panel 3 Kartu Metrik Biometrik */}
      <div className="grid grid-cols-3 gap-2 pt-0.5">
        {/* Metric 1: Undertone */}
        <div className="bg-[#081322]/85 rounded-2xl p-3 border border-white/10 backdrop-blur-md flex flex-col justify-between space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Undertone</span>
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-400/20 px-1 py-0.2 rounded-full">
              {currentItem.color_match_score || 96}%
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white truncate">
              {currentItem.base_colour || 'Harmonis'}
            </p>
            <p className="text-[9px] text-slate-400">Spektrum Selaras</p>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${currentItem.color_match_score || 96}%` }} />
          </div>
        </div>

        {/* Metric 2: Geometri Siluet */}
        <div className="bg-[#081322]/85 rounded-2xl p-3 border border-white/10 backdrop-blur-md flex flex-col justify-between space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Siluet 3D</span>
            <span className="text-[9px] font-mono font-bold text-sky-400 bg-sky-500/15 border border-sky-400/20 px-1 py-0.2 rounded-full">
              {currentItem.shape_match_score || 94}%
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white truncate">
              Proporsional
            </p>
            <p className="text-[9px] text-slate-400">Keseimbangan Rasio</p>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${currentItem.shape_match_score || 94}%` }} />
          </div>
        </div>

        {/* Metric 3: Presisi Acara */}
        <div className="bg-[#081322]/85 rounded-2xl p-3 border border-white/10 backdrop-blur-md flex flex-col justify-between space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Gaya Acara</span>
            <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-400/20 px-1 py-0.2 rounded-full">
              92%
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white truncate">
              Presisi Profil
            </p>
            <p className="text-[9px] text-slate-400">Sesuai Rekomendasi</p>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '92%' }} />
          </div>
        </div>
      </div>

      {/* 5. Saran Padu-Padan AI Stylist & Panduan Material */}
      <div className="bg-[#081322]/75 rounded-3xl p-4 border border-white/10 backdrop-blur-md space-y-2 shadow-lg">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
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
  );
};
