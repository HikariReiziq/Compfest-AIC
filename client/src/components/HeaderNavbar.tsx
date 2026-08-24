'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface HeaderNavbarProps {
  currentStep: 'CATEGORY' | 'SCAN' | 'REPORT' | 'QUIZ' | 'PROCESSING' | 'TRYON';
  gender?: 'male' | 'female';
  onReset: () => void;
  onStepClick?: (step: 'CATEGORY' | 'SCAN' | 'REPORT' | 'QUIZ' | 'TRYON') => void;
  onBackToLanding?: () => void;
  canNavigateToQuiz?: boolean;
  canNavigateToTryon?: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  currentStep,
  gender,
  onReset,
  onStepClick,
  onBackToLanding,
  canNavigateToQuiz = false,
  canNavigateToTryon = false,
}) => {
  const isFemale = gender === 'female';

  const steps: Array<{
    id: 'CATEGORY' | 'SCAN' | 'QUIZ' | 'TRYON';
    label: string;
    stepIndex: number;
  }> = [
    { id: 'CATEGORY', label: '1. Kategori', stepIndex: 1 },
    { id: 'SCAN', label: '2. Pindai', stepIndex: 2 },
    { id: 'QUIZ', label: '3. Kuesioner', stepIndex: 3 },
    { id: 'TRYON', label: '4. Studio Try-On', stepIndex: 4 },
  ];

  const activeId = currentStep === 'PROCESSING' ? 'QUIZ' : currentStep === 'REPORT' ? 'SCAN' : currentStep;

  const currentStepIndex =
    currentStep === 'CATEGORY'
      ? 1
      : currentStep === 'SCAN' || currentStep === 'REPORT'
      ? 2
      : currentStep === 'QUIZ' || currentStep === 'PROCESSING'
      ? 3
      : 4;

  const handleStepClicked = (stepId: 'CATEGORY' | 'SCAN' | 'QUIZ' | 'TRYON') => {
    if (!onStepClick) return;
    if (stepId === 'CATEGORY') {
      onStepClick('CATEGORY');
    } else if (stepId === 'SCAN') {
      onStepClick('SCAN');
    } else if (stepId === 'QUIZ' && canNavigateToQuiz) {
      onStepClick('QUIZ');
    } else if (stepId === 'TRYON' && canNavigateToTryon) {
      onStepClick('TRYON');
    }
  };

  const handleBackPreviousStep = () => {
    if (!onStepClick) {
      onReset();
      return;
    }
    if (currentStep === 'SCAN') onStepClick('CATEGORY');
    else if (currentStep === 'QUIZ' || currentStep === 'PROCESSING') onStepClick('SCAN');
    else if (currentStep === 'TRYON') onStepClick('QUIZ');
    else onReset();
  };

  return (
    <>
      {/* Standalone Floating Back Button at Top-Left (Exact Navbar Height Level) */}
      {currentStep !== 'CATEGORY' && (
        <button
          type="button"
          onClick={handleBackPreviousStep}
          className={`fixed top-5 left-4 sm:left-6 z-50 inline-flex items-center gap-2 px-4 py-3 rounded-full border bg-[#0B1528]/90 backdrop-blur-2xl text-xs font-mono font-bold transition-all cursor-pointer shadow-2xl hover:scale-105 ${
            isFemale
              ? 'border-pink-500/30 text-pink-300 hover:bg-pink-600 hover:text-white'
              : 'border-blue-500/30 text-sky-300 hover:bg-blue-600 hover:text-white'
          }`}
          title="Kembali ke Tahap Sebelumnya"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {currentStep === 'SCAN'
              ? 'Kategori'
              : currentStep === 'QUIZ'
              ? 'Pindai'
              : 'Kuesioner'}
          </span>
        </button>
      )}

      {/* Main Centered Floating Header Navbar */}
      <header
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-6xl rounded-full border bg-[#0B1528]/85 backdrop-blur-2xl px-5 sm:px-8 py-3 flex items-center justify-between transition-all shadow-2xl text-white ${
          isFemale ? 'border-pink-500/20' : 'border-blue-500/20'
        }`}
      >
        {/* Left: Brand Logo */}
        <div
          onClick={onBackToLanding || onReset}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
          title="Kembali ke Beranda"
        >
          <img
            src="/images/logo.png"
            alt="COBA Logo"
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[14px] sm:text-[15px] tracking-[0.16em] text-white">
                COBA
              </span>
              <span
                className={`text-[9px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-[#071120] border hidden sm:inline-block ${
                  isFemale ? 'text-pink-300 border-pink-500/30' : 'text-[#93C5FD] border-blue-500/30'
                }`}
              >
                STUDIO FITTING 3D
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] font-light hidden sm:block">
              Cocokkan Outfit Sesuai Badan Anda
            </p>
          </div>
        </div>

        {/* Step Flow Indicators (Interactive Floating Breadcrumbs) */}
        <div
          className={`hidden md:flex items-center gap-1.5 bg-[#08101E] p-1.5 rounded-full border font-mono ${
            isFemale ? 'border-pink-500/20' : 'border-blue-500/20'
          }`}
        >
          {steps.map((s) => {
            const isActive = s.id === activeId;
            const isCompleted = s.stepIndex < currentStepIndex;
            const isClickable =
              s.id === 'CATEGORY' ||
              s.id === 'SCAN' ||
              (s.id === 'QUIZ' && canNavigateToQuiz) ||
              (s.id === 'TRYON' && canNavigateToTryon);

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleStepClicked(s.id)}
                disabled={!isClickable}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                  isActive
                    ? isFemale
                      ? 'bg-pink-600 text-white font-bold shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                      : 'bg-blue-600 text-white font-bold shadow-md'
                    : isCompleted
                    ? 'text-[#FACC15] hover:text-[#FDE047] hover:bg-white/5 cursor-pointer'
                    : 'text-[#475569] cursor-not-allowed opacity-60'
                }`}
              >
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Actions: Back to Landing */}
        <div className="flex items-center gap-2">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full border bg-[#08101E] text-xs font-mono font-semibold transition-all cursor-pointer shadow-md ${
                isFemale
                  ? 'border-pink-500/30 text-pink-300 hover:bg-pink-600 hover:text-white'
                  : 'border-blue-500/30 text-[#93C5FD] hover:bg-blue-600 hover:text-white'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">BERANDA</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
};
