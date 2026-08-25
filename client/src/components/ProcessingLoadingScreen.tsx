'use client';

import React, { useEffect } from 'react';

export interface ProcessingLoadingScreenProps {
  userProfile?: Record<string, any>;
  answers?: Record<string, any>;
  questionsMap?: Record<string, { question: string; options: { id: string; label: string; desc?: string }[] }>;
  subcategory?: string;
  onComplete: () => void;
}

export const ProcessingLoadingScreen: React.FC<ProcessingLoadingScreenProps> = ({
  userProfile,
  onComplete,
}) => {
  const letters = ['L', 'O', 'A', 'D', 'I', 'N', 'G', '.', '.', '.'];
  const isFemale = userProfile?.gender?.label_id === 'female';

  useEffect(() => {
    // 1.8s duration for smooth transition to recommendation stage
    const timer = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#060B14] flex flex-col items-center justify-center select-none overflow-hidden space-y-6">
      {/* Background Wallpaper Dahlia Flowers */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
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
              : 'bg-gradient-to-b from-[#060B14]/70 via-[#060B14]/60 to-[#060B14]/80'
          }`}
        />
      </div>

      {/* Maskot COBA dengan Efek Melayang Lembut */}
      <div className="relative z-10 flex items-center justify-center">
        <img
          src="/images/mascot.png"
          alt="COBA Mascot"
          className="relative w-40 h-40 sm:w-48 sm:h-48 object-contain drop-shadow-lg animate-bounce"
          style={{ animationDuration: '2s' }}
        />
      </div>

      {/* Tulisan Loading Bergelombang */}
      <div
        className={`relative z-10 flex items-center space-x-1 font-mono text-base sm:text-lg font-bold tracking-[0.2em] uppercase ${
          isFemale ? 'text-pink-400' : 'text-[#38BDF8]'
        }`}
      >
        {letters.map((char, index) => (
          <span
            key={index}
            className="animate-text-wave inline-block text-white"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            {char}
          </span>
        ))}
      </div>

      {/* Konteks proses agar pengguna tahu apa yang terjadi */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
        <p className="text-sm sm:text-base text-[#94A3B8] max-w-md leading-relaxed">
          AI Stylist COBA sedang mencocokkan jawaban kuesioner Anda dengan analisis biometrik
          untuk menyusun rekomendasi Top-4.
        </p>
        <div className="w-64 sm:w-80 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`animate-loading-slide h-full w-1/3 rounded-full ${
              isFemale
                ? 'bg-gradient-to-r from-pink-600 via-rose-400 to-pink-600'
                : 'bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default ProcessingLoadingScreen;
