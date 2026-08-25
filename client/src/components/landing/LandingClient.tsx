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

      {/* ============ Floating Center Top: Karakter Bebas di Luar Card (Seperti Showcase 3D) ============ */}
      <div className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        {/* Karakter Area dengan Navigasi Panah Kiri & Kanan */}
        <div className="relative flex items-center justify-center gap-2.5 sm:gap-4 select-none">
          {/* Tombol Panah Kiri (Geser ke Pria) */}
          <button
            type="button"
            onClick={() => setGender('male')}
            aria-label="Pilih Karakter Pria"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 cursor-pointer ${
              !isFemale
                ? 'bg-blue-600 border-blue-400 opacity-100'
                : 'bg-black/60 border-white/20 hover:bg-black/80 opacity-75'
            }`}
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Maskot Karakter Berdiri Bebas di Luar Card (Besar & Jelas) */}
          <button
            type="button"
            onClick={() => setGender(isFemale ? 'male' : 'female')}
            className="group relative cursor-pointer flex flex-col items-center justify-center transition-transform hover:scale-105 active:scale-95"
            title="Klik untuk ganti karakter Pria / Wanita"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
              <img
                src={isFemale ? '/images/mascot-pink.png' : '/images/mascot.png'}
                alt={isFemale ? 'Maskot Wanita' : 'Maskot Pria'}
                className="w-full h-full object-contain filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)] transition-all duration-300"
              />
            </div>
            {/* Label Minimalis Pria / Wanita */}
            <div
              className={`mt-0.5 px-3.5 py-0.5 rounded-full border text-[11px] font-mono font-bold uppercase tracking-widest transition-all ${
                isFemale
                  ? 'bg-[#1c0b1a] border-pink-500/40 text-pink-300'
                  : 'bg-[#0B1528] border-blue-500/40 text-[#93C5FD]'
              }`}
            >
              {isFemale ? 'Wanita' : 'Pria'}
            </div>
          </button>

          {/* Tombol Panah Kanan (Geser ke Wanita) */}
          <button
            type="button"
            onClick={() => setGender('female')}
            aria-label="Pilih Karakter Wanita"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 cursor-pointer ${
              isFemale
                ? 'bg-pink-600 border-pink-400 opacity-100'
                : 'bg-black/60 border-white/20 hover:bg-black/80 opacity-75'
            }`}
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* 2 Dots Indicator (Pria / Wanita) */}
        <div className="flex items-center gap-1.5 mt-1">
          <button
            type="button"
            onClick={() => setGender('male')}
            aria-label="Mode Pria"
            className={`h-1 rounded-full transition-all cursor-pointer ${
              !isFemale ? 'w-4 bg-blue-500' : 'w-1 bg-white/30 hover:bg-white/60'
            }`}
          />
          <button
            type="button"
            onClick={() => setGender('female')}
            aria-label="Mode Wanita"
            className={`h-1 rounded-full transition-all cursor-pointer ${
              isFemale ? 'w-4 bg-pink-500' : 'w-1 bg-white/30 hover:bg-white/60'
            }`}
          />
        </div>
      </div>

      {/* ============ Tombol Floating Kanan Atas: BUKA STUDIO VIRTUAL ============ */}
      <div className="fixed top-4 sm:top-5 right-4 sm:right-8 z-50 flex items-center">
        <button
          type="button"
          onClick={() => onOpenStudio(undefined, gender)}
          className={`group inline-flex h-[46px] sm:h-[50px] items-center gap-2 rounded-full border backdrop-blur-2xl px-5 sm:px-6 text-xs sm:text-sm font-bold tracking-[0.08em] transition-all hover:scale-105 active:scale-95 cursor-pointer ${
            isFemale
              ? 'bg-[#1c0b1a] border-pink-500/40 text-pink-300 hover:bg-pink-600 hover:text-white'
              : 'bg-[#0B1528] border-blue-500/40 text-[#93C5FD] hover:bg-blue-600 hover:text-white'
          }`}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>BUKA STUDIO VIRTUAL</span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-[#FACC15]" />
        </button>
      </div>

      {/* ============ Main Hero Section (Expansive Full Layout) ============ */}
      <main className="relative z-10 mx-auto max-w-[1600px] w-full px-5 sm:px-8 lg:pl-10 lg:pr-12 pt-28 sm:pt-32 lg:pt-36 pb-10 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Kolom Kiri: Value Proposition & 1 CTA Utama */}
          <div className="lg:col-span-7 space-y-5 lg:space-y-6 relative">
            {/* Logo Brand COBA */}
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
                className={isFemale ? 'text-pink-400' : 'text-blue-400'}
              >
                Sesuai Tubuh Anda
              </span>
            </h1>

            <p className="text-base lg:text-lg leading-relaxed text-[#94A3B8] max-w-2xl">
              Hentikan tebak-tebakan gaya (style-fit mismatch). AI menganalisis bentuk wajah,
              rona kulit tropis Monk Scale, dan proporsi bahu Anda — lalu divalidasi visual
              secara langsung di tubuh Anda lewat 3D Virtual Try-On realtime.
            </p>

            {/* Tombol Utama Gabungan (Solid Color, No Gradient, No Glow) */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenStudio(undefined, gender)}
                className={`group inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full px-8 text-base font-bold tracking-wide text-white transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                  isFemale
                    ? 'bg-pink-600 hover:bg-pink-700'
                    : 'bg-blue-600 hover:bg-blue-700'
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
              {/* Product Info Badge (Floating Minimalist - Centered at the TOP of the 3D model) */}
              <div
                className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-full border px-6 py-2 backdrop-blur-xl transition-all text-center max-w-[90%] whitespace-nowrap ${
                  isFemale
                    ? 'border-pink-500/40 bg-[#1c0b1a]'
                    : 'border-blue-500/40 bg-[#0B1528]'
                }`}
              >
                <span
                  className={`text-[11px] sm:text-xs font-bold tracking-[0.14em] uppercase truncate block ${
                    isFemale ? 'text-pink-300' : 'text-[#93C5FD]'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {activeAsset.nama}
                </span>
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
                  gender={gender}
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
