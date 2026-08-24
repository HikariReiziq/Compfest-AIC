'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

export interface ProcessingLoadingScreenProps {
  userProfile?: Record<string, any>;
  answers?: Record<string, any>;
  questionsMap?: Record<string, { question: string; options: { id: string; label: string; desc?: string }[] }>;
  subcategory?: string;
  onComplete: () => void;
}

const STATUS_PHASES = [
  'Menganalisis harmoni warna & undertone kulit...',
  'Menyesuaikan siluet dengan proporsi wajah...',
  'Menyusun kurasi Top-4 Style Archetypes...',
];

export const ProcessingLoadingScreen: React.FC<ProcessingLoadingScreenProps> = ({
  subcategory = 'fashion',
  onComplete,
}) => {
  const [progress, setProgress] = useState<number>(10);
  const [phaseIndex, setPhaseIndex] = useState<number>(0);

  useEffect(() => {
    // 1.8s total duration for a fast, responsive, and elegant transition
    const totalDuration = 1800;
    const intervalTime = 40;
    const increment = 100 / (totalDuration / intervalTime);

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 200);
          return 100;
        }
        if (next >= 66) {
          setPhaseIndex(2);
        } else if (next >= 33) {
          setPhaseIndex(1);
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="w-full max-w-xl mx-auto py-12 px-4 animate-fadeIn text-white flex flex-col items-center justify-center min-h-[420px]">
      {/* Minimalist Glowing Orbital Spinner */}
      <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping opacity-25" />
        <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-sky-400 border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-transparent border-b-[#FACC15] border-l-blue-400 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
        <div className="w-16 h-16 rounded-full bg-[#0B1528] border border-blue-500/30 flex items-center justify-center shadow-xl shadow-blue-500/10">
          <Sparkles className="w-7 h-7 text-[#38BDF8] animate-pulse" />
        </div>
      </div>

      {/* Main Title & Phase Status */}
      <div className="text-center space-y-3 mb-8">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Menyiapkan Rekomendasi
        </h2>
        <p className="text-sm font-medium text-[#93C5FD] transition-all duration-300 min-h-[24px]">
          {STATUS_PHASES[phaseIndex]}
        </p>
      </div>

      {/* Clean Minimalist Progress Bar */}
      <div className="w-full max-w-md space-y-2 mb-6">
        <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-blue-500/20 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-[#FACC15] rounded-full transition-all duration-100 ease-out"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-xs font-mono text-[#64748B]">
          <span>Katalog: {subcategory.toUpperCase()}</span>
          <span className="text-[#38BDF8] font-bold">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Trust & Privacy Badge */}
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0B1528]/80 border border-blue-500/20 text-[#64748B] text-[11px] font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
        <span>Kepatuhan UU PDP No. 27/2022</span>
      </div>
    </div>
  );
};
