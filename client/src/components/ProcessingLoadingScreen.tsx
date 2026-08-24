'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';

export interface TelemetryLogItem {
  id: string;
  category: 'profile' | 'answer' | 'algorithm' | 'archetype';
  title: string;
  detail: string;
  timestamp: string;
}

export interface ProcessingLoadingScreenProps {
  userProfile?: Record<string, any>;
  answers?: Record<string, any>;
  questionsMap?: Record<string, { question: string; options: { id: string; label: string; desc?: string }[] }>;
  subcategory?: string;
  onComplete: () => void;
}

export const ProcessingLoadingScreen: React.FC<ProcessingLoadingScreenProps> = ({
  userProfile = {},
  answers = {},
  questionsMap = {},
  subcategory = 'fashion',
  onComplete,
}) => {
  const [completedSteps, setCompletedSteps] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  // Build telemetry log steps
  const logSteps: TelemetryLogItem[] = React.useMemo(() => {
    const steps: TelemetryLogItem[] = [];

    const mt = userProfile.monk_tone || 'MST-06';
    const ut = userProfile.undertone || 'Warm';
    const fs = userProfile.face_shape || 'Oval';
    const bs = userProfile.body_shape || 'Hourglass';

    steps.push({
      id: 'step-biometric',
      category: 'profile',
      title: 'Mengekstrak Karakteristik Personal',
      detail: `Monk Tone: ${mt} • Undertone: ${ut} • Bentuk Wajah: ${fs} • Siluet: ${bs}`,
      timestamp: '0.10s',
    });

    Object.entries(answers).forEach(([qId, optVal], idx) => {
      const qData = questionsMap[qId];
      const qTitle = qData ? qData.question : `Preferensi #${idx + 1}`;
      
      let optLabel = '';
      if (typeof optVal === 'string') {
        const found = qData?.options?.find((o) => o.id === optVal);
        optLabel = found ? found.label : optVal;
      } else if (Array.isArray(optVal)) {
        optLabel = optVal
          .map((v) => {
            if (typeof v === 'object' && v !== null) {
              return v.label || v.name || v.id || JSON.stringify(v);
            }
            return String(v);
          })
          .join(', ');
      } else if (typeof optVal === 'object' && optVal !== null) {
        optLabel = optVal.label || optVal.name || optVal.id || JSON.stringify(optVal);
      } else {
        optLabel = String(optVal);
      }

      steps.push({
        id: `step-ans-${qId}`,
        category: 'answer',
        title: `Memetakan Preferensi #${idx + 1}`,
        detail: `[${qTitle.slice(0, 32)}...] ➔ ${optLabel}`,
        timestamp: `${(0.25 + idx * 0.18).toFixed(2)}s`,
      });
    });

    steps.push({
      id: 'step-color-harmony',
      category: 'algorithm',
      title: 'Menghitung Harmoni Palet Warna Kulit',
      detail: `Memetakan spektrum CIELAB undertone ${ut} terhadap palet katalog ${subcategory}`,
      timestamp: `${(0.3 + Object.keys(answers).length * 0.18).toFixed(2)}s`,
    });

    steps.push({
      id: 'step-geometry',
      category: 'algorithm',
      title: 'Kalkulasi Keserasian Proporsi 3D',
      detail: `Menyesuaikan dimensi frame & siluet busana terhadap proporsi ${fs} Face & ${bs} Body`,
      timestamp: `${(0.45 + Object.keys(answers).length * 0.18).toFixed(2)}s`,
    });

    steps.push({
      id: 'step-archetype',
      category: 'archetype',
      title: 'Menyusun Kurasi Top-4 Style Archetypes',
      detail: 'The Perfect Match (#1) • Safe Classic (#2) • Bold Statement (#3) • Modern Silhouette (#4)',
      timestamp: `${(0.6 + Object.keys(answers).length * 0.18).toFixed(2)}s`,
    });

    return steps;
  }, [userProfile, answers, questionsMap, subcategory]);

  const totalSteps = logSteps.length;
  const stepDelayMs = Math.max(220, Math.min(450, Math.floor(3600 / totalSteps)));

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setCompletedSteps(current);
      setProgressPercent(Math.min(100, Math.round((current / totalSteps) * 100)));

      if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      }

      if (current >= totalSteps) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }, stepDelayMs);

    return () => clearInterval(interval);
  }, [totalSteps, stepDelayMs, onComplete]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-4 animate-fadeIn text-white">
      {/* Header Banner */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#0B1528] border border-blue-500/30 text-[#93C5FD] text-xs font-mono tracking-wider shadow-lg">
          <Activity className="w-3.5 h-3.5 animate-spin text-[#38BDF8]" />
          <span>AI RECOMMENDATION SYNTHESIS IN PROGRESS</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Menyelaraskan Rekomendasi Gaya Anda
        </h2>
        <p className="text-[#94A3B8] text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
          AI sedang mengevaluasi data biometrik dan preferensi gaya Anda untuk merumuskan kurasi 3D terbaik.
        </p>
      </div>

      {/* Main Telemetry Card (Hanya Card Kanan, Diperlebar & Dipusatkan) */}
      <div className="bg-[#0B1528]/90 rounded-3xl p-6 sm:p-8 space-y-5 border border-blue-500/20 backdrop-blur-xl shadow-2xl">
        {/* Progress Bar & Counter */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
            <span className="text-[#93C5FD] flex items-center gap-2 font-semibold">
              <Activity className="w-4 h-4 text-[#38BDF8]" />
              <span>Memuat Vektor Gaya ({completedSteps} / {totalSteps} Tahapan)</span>
            </span>
            <span className="text-[#38BDF8] font-bold">{progressPercent}%</span>
          </div>

          <div className="w-full bg-black/60 h-3 rounded-full overflow-hidden border border-blue-500/20 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-[#FACC15] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Dynamic Telemetry Log Console */}
        <div
          ref={logsContainerRef}
          className="bg-black/60 rounded-2xl p-4 border border-blue-500/20 max-h-72 overflow-y-auto space-y-2.5 font-mono scroll-smooth text-xs"
        >
          {logSteps.map((step, idx) => {
            const isDone = idx < completedSteps;
            const isCurrent = idx === completedSteps;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${
                  isDone
                    ? 'bg-[#071120]/60 border border-blue-500/20 text-white/90'
                    : isCurrent
                    ? 'bg-blue-600/15 border border-blue-500/40 text-white'
                    : 'opacity-25 text-white/40'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-[#38BDF8] fill-current" />
                  ) : isCurrent ? (
                    <RotateCw className="w-4 h-4 text-[#FACC15] animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/30" />
                  )}
                </div>

                <div className="flex-1 text-xs space-y-1 leading-snug">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{step.title}</span>
                    <span className="text-[10px] text-[#64748B]">{step.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-[#93C5FD]/80 break-words">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy Footer */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
            <span>Zero Persistent Biometrics (UU PDP No. 27/2022)</span>
          </div>
          <div className="text-[#93C5FD] font-bold">
            <span>Kategori: {subcategory.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
