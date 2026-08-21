"use client";

import React from "react";
import { Glasses, ShieldCheck, Sparkles } from "lucide-react";

interface HeaderNavbarProps {
  currentStep: "CATEGORY" | "SCAN" | "QUIZ" | "PROCESSING" | "TRYON";
  onReset: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({ currentStep, onReset }) => {
  const steps = [
    { id: "CATEGORY", label: "1. Kategori" },
    { id: "SCAN", label: "2. Pindai Wajah" },
    { id: "QUIZ", label: "3. Kuesioner" },
    { id: "TRYON", label: "4. Studio AR" },
  ];

  const activeId = currentStep === "PROCESSING" ? "QUIZ" : currentStep;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div 
          onClick={onReset} 
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
            <Glasses className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                COBA
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                AI & 3D AR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-light">
              Smart AI & 3D AR Fashion Recommendation Engine
            </p>
          </div>
        </div>

        {/* Step Flow Indicators */}
        <div className="hidden md:flex items-center space-x-1 bg-surface-50/60 p-1.5 rounded-full border border-white/5 font-mono">
          {steps.map((s) => {
            const isActive = s.id === activeId;
            return (
              <div
                key={s.id}
                className={`px-3.5 py-1 rounded-full text-xs transition-all duration-300 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Privacy & Engine Badge */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Biometric Storage</span>
          </div>
        </div>
      </div>
    </header>
  );
};
