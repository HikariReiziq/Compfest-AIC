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
  onComplete,
}) => {
  const letters = ['L', 'O', 'A', 'D', 'I', 'N', 'G', '.', '.', '.'];

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
        <div className="absolute inset-0 bg-gradient-to-b from-[#060B14]/70 via-[#060B14]/60 to-[#060B14]/80" />
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
      <div className="relative z-10 flex items-center space-x-1 font-mono text-base sm:text-lg font-bold tracking-[0.2em] text-[#38BDF8] uppercase">
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
    </div>
  );
};

export default ProcessingLoadingScreen;
