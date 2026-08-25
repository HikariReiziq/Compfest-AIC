'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ShieldCheck,
  Shirt,
  Compass,
  ScanFace,
  Crown,
} from 'lucide-react';
import { FASHION_ASET } from './fashionAset';

// Dynamic import for the 3D WebGL Turntable
const FashionTurntable3D = dynamic(() => import('./FashionTurntable3D'), { ssr: false });

const COBA_BLUE = '#2563EB';
const COBA_SKY = '#38BDF8';
const COBA_GOLD = '#FACC15';

interface LandingClientProps {
  fontClass: string;
  initialGender?: 'male' | 'female';
  onOpenStudio: (category?: 'glasses' | 'hats' | 'shirts', gender?: 'male' | 'female') => void;
}

export default function LandingClient({ fontClass, initialGender = 'male', onOpenStudio }: LandingClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gender, setGender] = useState<'male' | 'female'>(initialGender);
  const isFemale = gender === 'female';
  const activeAsset = FASHION_ASET[currentIndex] || FASHION_ASET[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? FASHION_ASET.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === FASHION_ASET.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className={`${fontClass} relative min-h-screen bg-[#060B14] text-white antialiased ${
        isFemale ? 'selection:bg-pink-600' : 'selection:bg-blue-600'
      } selection:text-white flex flex-col justify-between overflow-x-hidden`}
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {/* ============ Latar Global Wallpaper Dahlia Flowers ============ */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-55"
          style={{
            backgroundImage: 'url(/images/dahlia-flowers.jpg)',
          }}
        />
        <div
          className={`absolute inset-0 ${
            isFemale
              ? 'bg-gradient-to-b from-[#180816]/75 via-[#180816]/65 to-[#180816]/85'
              : 'bg-gradient-to-b from-[#060B14]/65 via-[#060B14]/55 to-[#060B14]/75'
          }`}
        />
      </div>

      {/* ============ Tombol Floating Kanan Atas: Toggle Gender + BUKA STUDIO VIRTUAL ============ */}
      <div className="fixed top-5 right-4 sm:top-6 sm:right-8 z-50 flex items-center gap-2.5 sm:gap-3">
        {/* Toggle Mode Pria / Wanita (Tinggi Presisi Sama dengan Tombol Kanan) */}
        <div
          className={`inline-flex items-center h-[46px] sm:h-[48px] rounded-full p-1 border gap-1 backdrop-blur-2xl shadow-2xl transition-all ${
            isFemale
              ? 'bg-[#1c0b1a]/90 border-pink-500/30'
              : 'bg-[#0B1528]/90 border-blue-500/30'
          }`}
        >
          <button
            type="button"
            onClick={() => setGender('male')}
            className={`h-full px-3.5 sm:px-4 rounded-full text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !isFemale
                ? 'bg-blue-600 border border-blue-400 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {/* Simbol Mars (Pria ♂) */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 shrink-0"
            >
              <circle cx="10" cy="14" r="5" />
              <line x1="19" y1="5" x2="13.6" y2="10.4" />
              <polyline points="15 5 19 5 19 9" />
            </svg>
            <span>Pria</span>
          </button>
          <button
            type="button"
            onClick={() => setGender('female')}
            className={`h-full px-3.5 sm:px-4 rounded-full text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isFemale
                ? 'bg-gradient-to-r from-pink-600 to-rose-500 border border-pink-400 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {/* Simbol Venus (Wanita ♀) */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 shrink-0"
            >
              <circle cx="12" cy="9" r="5" />
              <line x1="12" y1="14" x2="12" y2="21" />
              <line x1="9" y1="18" x2="15" y2="18" />
            </svg>
            <span>Wanita</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenStudio(undefined, gender)}
          className={`group inline-flex h-[46px] sm:h-[48px] items-center gap-2 rounded-full border backdrop-blur-2xl px-5 sm:px-6 text-xs sm:text-sm font-bold tracking-[0.08em] transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xl ${
            isFemale
              ? 'bg-[#1c0b1a]/85 border-pink-400/30 text-pink-300 hover:border-pink-500 hover:bg-pink-600 hover:text-white shadow-pink-600/20'
              : 'bg-[#0B1528]/85 border-blue-400/30 text-[#93C5FD] hover:border-blue-500 hover:bg-blue-600 hover:text-white'
          }`}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>BUKA STUDIO VIRTUAL</span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-[#FACC15]" />
        </button>
      </div>

      {/* ============ Main Hero Section (Expansive Full Layout) ============ */}
      <main className="relative z-10 mx-auto max-w-[1600px] w-full px-5 sm:px-8 lg:pl-10 lg:pr-12 pt-16 sm:pt-20 lg:pt-24 pb-10 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Kolom Kiri: Value Proposition & 1 CTA Utama */}
          <div className="lg:col-span-7 space-y-5 lg:space-y-6 relative">
            {/* Logo Brand COBA (Vertikal Atas ke Bawah: Logo -> COBA -> Slogan Merek) */}
            <div className="flex flex-col items-start gap-2 pb-1">
              <img
                src={isFemale ? '/images/logo-pink.png' : '/images/logo.png'}
                alt="COBA Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain transition-transform duration-200 hover:scale-105"
              />
              <div className="space-y-0.5">
                <span
                  className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-white block leading-none"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  COBA
                </span>
                <span className={`text-[10px] sm:text-xs font-mono tracking-[0.2em] block uppercase font-bold ${
                  isFemale ? 'text-pink-300' : 'text-[#93C5FD]'
                }`}>
                  Cocokkan Outfit Sesuai Badan Anda
                </span>
              </div>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4.2rem] font-extrabold leading-[1.05] tracking-[-0.03em]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Presisi Gaya &amp; Fitting 3D
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: isFemale
                    ? 'linear-gradient(90deg, #F472B6, #FB7185 50%, #FACC15)'
                    : 'linear-gradient(90deg, #60A5FA, #38BDF8 50%, #FACC15)',
                }}
              >
                Sesuai Tubuh Anda
              </span>
            </h1>

            <p className="text-base lg:text-lg leading-relaxed text-[#94A3B8] max-w-2xl">
              Hentikan tebak-tebakan gaya (style-fit mismatch). AI menganalisis bentuk wajah,
              rona kulit tropis Monk Scale, dan proporsi bahu Anda — lalu divalidasi visual
              secara langsung di tubuh Anda lewat 3D Virtual Try-On realtime.
            </p>

            {/* Tombol Utama Gabungan */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenStudio(undefined, gender)}
                className={`group inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full px-8 text-base font-bold tracking-wide text-white transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-md ${
                  isFemale
                    ? 'bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 shadow-pink-600/30'
                    : 'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400'
                }`}
              >
                <span>Mulai Fitting Virtual (Coba Produk Ini di AR)</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Zero Persistent Biometrics Badge */}
            <div className="flex items-center gap-2 font-mono text-xs text-[#64748B]">
              <ShieldCheck className={`h-4 w-4 ${isFemale ? 'text-pink-400' : 'text-[#38BDF8]'}`} />
              <span>Zero Persistent Biometrics (UU PDP No. 27/2022)</span>
            </div>
          </div>

          {/* Kolom Kanan: 3D Turntable Showcase */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            {/* Interactive 3D Canvas Showcase Area (Expanded Size) */}
            <div className="relative w-full h-[440px] sm:h-[500px] lg:h-[540px] rounded-3xl overflow-hidden flex items-center justify-center">
              {/* Product Info Badge (Floating Minimalist - Centered at the bottom of the 3D model) */}
              <div
                className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-2xl border px-5 py-2.5 backdrop-blur-xl transition-all shadow-xl text-center max-w-[90%] ${
                  isFemale
                    ? 'border-pink-500/30 bg-[#1c0b1a]/90 shadow-pink-950/40'
                    : 'border-blue-500/30 bg-[#0B1528]/90 shadow-blue-950/40'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-ping shrink-0 ${isFemale ? 'bg-pink-400' : 'bg-sky-400'}`} />
                  <span
                    className={`text-[11px] sm:text-xs font-bold tracking-[0.14em] uppercase truncate ${
                      isFemale ? 'text-pink-300' : 'text-[#93C5FD]'
                    }`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {activeAsset.nama}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Kategori: {activeAsset.kategori.toUpperCase()} • 3D GLB Realtime
                </p>
              </div>

              {/* Navigation Arrows */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Produk sebelumnya"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border border-white/20 bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/90 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Produk selanjutnya"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border border-white/20 bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/90 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* 3D WebGL Model */}
              <div className="w-full h-full cursor-grab active:cursor-grabbing">
                <FashionTurntable3D
                  modelPath={activeAsset.glbPath}
                  category={activeAsset.subkategori}
                  accentColor={isFemale ? '#F472B6' : '#38BDF8'}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============ Modern Footer Minimalist ============ */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-[#060B14]/80 backdrop-blur-md py-6 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#64748B]">
        <div className="flex items-center gap-2">
          <img
            src={isFemale ? '/images/mascot-pink.png' : '/images/mascot.png'}
            alt="COBA Mascot"
            className="w-5 h-5 object-contain"
          />
          <span>COBA — Studio Fitting Virtual AI &amp; AR (Haute-Couture Edition)</span>
        </div>
        <div>
          <span>Kompetisi AIC 2026 • Zero Persistent Biometrics</span>
        </div>
      </footer>
    </div>
  );
}
