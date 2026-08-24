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
  onOpenStudio: (category?: 'glasses' | 'hats' | 'shirts') => void;
}

export default function LandingClient({ fontClass, onOpenStudio }: LandingClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0); // Default to hat-09
  const activeAsset = FASHION_ASET[currentIndex] || FASHION_ASET[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? FASHION_ASET.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === FASHION_ASET.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className={`${fontClass} relative min-h-screen bg-[#060B14] text-white antialiased selection:bg-blue-600 selection:text-white flex flex-col justify-between overflow-x-hidden`}
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
        <div className="absolute inset-0 bg-gradient-to-b from-[#060B14]/65 via-[#060B14]/55 to-[#060B14]/75" />
      </div>

      {/* ============ Tombol Floating Kanan Atas: BUKA STUDIO VIRTUAL ============ */}
      <div className="fixed top-5 right-5 sm:top-6 sm:right-8 z-50">
        <button
          type="button"
          onClick={() => onOpenStudio()}
          className="group inline-flex min-h-[44px] items-center gap-2.5 rounded-full border border-blue-400/30 bg-[#0B1528]/85 backdrop-blur-2xl px-6 sm:px-7 text-[13px] sm:text-[14px] font-bold tracking-[0.08em] text-[#93C5FD] transition-all hover:border-blue-500 hover:bg-blue-600 hover:text-white hover:scale-105 active:scale-95 cursor-pointer shadow-2xl"
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
                src="/images/logo.png"
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
                <span className="text-[10px] sm:text-xs font-mono tracking-[0.2em] text-[#93C5FD] block uppercase font-bold">
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
                style={{ backgroundImage: 'linear-gradient(90deg, #60A5FA, #38BDF8 50%, #FACC15)' }}
              >
                Sesuai Tubuh Anda
              </span>
            </h1>

            <p className="text-base lg:text-lg leading-relaxed text-[#94A3B8] max-w-2xl">
              Hentikan tebak-tebakan gaya (style-fit mismatch). AI menganalisis bentuk wajah,
              rona kulit tropis Monk Scale, dan proporsi bahu Anda — lalu divalidasi visual
              secara langsung di tubuh Anda lewat 3D Virtual Try-On realtime.
            </p>

            {/* Tombol Utama Gabungan (Clean Solid - Tanpa Efek Glow) */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenStudio()}
                className="group inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full px-8 text-base font-bold tracking-wide text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.98] cursor-pointer shadow-md"
              >
                <span>Mulai Fitting Virtual (Coba Produk Ini di AR)</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Zero Persistent Biometrics Badge */}
            <div className="flex items-center gap-2 font-mono text-xs text-[#64748B]">
              <ShieldCheck className="h-4 w-4 text-[#38BDF8]" />
              <span>Zero Persistent Biometrics (UU PDP No. 27/2022)</span>
            </div>
          </div>

          {/* Kolom Kanan: 3D Turntable Showcase */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            {/* Interactive 3D Canvas Showcase Area (Expanded Size) */}
            <div className="relative w-full h-[440px] sm:h-[500px] lg:h-[540px] rounded-3xl overflow-hidden flex items-center justify-center">
              {/* Product Info Pill (Clean Matte Pill) */}
              <div
                key={currentIndex}
                className="absolute top-5 sm:top-6 lg:top-7 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-[#0B1528] px-5 py-2 backdrop-blur-xl shadow-lg animate-slide-up-fade pointer-events-none"
              >
                <p className="font-bold text-white tracking-wide text-xs sm:text-sm whitespace-nowrap">
                  {activeAsset.nama}
                </p>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-[#93C5FD] border border-blue-400/20 uppercase tracking-wider">
                  {activeAsset.subkategori === 'hats' ? 'TOPI' : activeAsset.subkategori === 'glasses' ? 'KACAMATA' : 'BAJU'}
                </span>
              </div>

              {/* Gesture Hint */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md text-[10px] font-mono text-[#94A3B8]">
                <RotateCw className="w-2.5 h-2.5 text-[#38BDF8] animate-spin" style={{ animationDuration: '4s' }} />
                <span>Geser untuk memutar 360°</span>
              </div>

              {/* Previous Button */}
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous Product"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0B1528]/90 text-white transition-all hover:bg-blue-600 hover:border-blue-500 cursor-pointer hover:scale-105 active:scale-95 shadow-lg"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next Product"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0B1528]/90 text-white transition-all hover:bg-blue-600 hover:border-blue-500 cursor-pointer hover:scale-105 active:scale-95 shadow-lg"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              {/* Three.js Turntable */}
              <div className="w-full h-full">
                <FashionTurntable3D
                  modelPath={activeAsset.glbPath}
                  category={activeAsset.kategori as any}
                  accentColor="#38BDF8"
                  autoRotateSpeed={0.015}
                />
              </div>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5 mt-3">
              {FASHION_ASET.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === currentIndex ? 'w-6 bg-blue-500 shadow-sm' : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Pilih produk ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ============ Maskot COBA di Kanan Bawah (Bubble Chat & Maskot Naik Turun Bersama) ============ */}
      <div
        onClick={() => onOpenStudio()}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-center cursor-pointer group select-none animate-bounce"
        style={{ animationDuration: '2.8s' }}
        title="Mulai Fitting Virtual bersama Maskot COBA!"
      >
        {/* Bubble Chat dengan Ekor Penunjuk ke Maskot */}
        <div className="relative mb-2 px-4 py-2 rounded-2xl border border-blue-500/30 bg-[#0B1528]/95 text-white text-xs font-mono shadow-2xl transition-transform duration-300 group-hover:scale-105">
          <span className="text-[#38BDF8] font-bold">COBA:</span> Siap fitting?
          {/* Ekor Balon Chat Segitiga */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#0B1528]" />
          <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 -z-10 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[9px] border-t-blue-500/30" />
        </div>

        {/* Mascot Image */}
        <img
          src="/images/mascot.png"
          alt="COBA Mascot"
          className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      {/* ============ Footer ============ */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-[#64748B] font-mono">
        <p>© 2026 COBA — Cocokkan Outfit Sesuai Badan Anda • Kompetisi AIC 2026</p>
      </footer>
    </div>
  );
}
