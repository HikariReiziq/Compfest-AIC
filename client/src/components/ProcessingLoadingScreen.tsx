"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  CheckCircle2,
  Brain,
  Cpu,
  Layers,
  Palette,
  ShieldCheck,
  Zap,
  Activity,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
export interface TelemetryLogItem {
  id: string;
  category: "profile" | "answer" | "algorithm" | "archetype";
  title: string;
  detail: string;
  timestamp: string;
}

interface ProcessingLoadingScreenProps {
  userProfile: Record<string, any>;
  answers: Record<string, string>;
  questionsMap: Record<string, { question: string; options: { id: string; label: string; desc: string }[] }>;
  subcategory: string;
  onComplete: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export const ProcessingLoadingScreen: React.FC<ProcessingLoadingScreenProps> = ({
  userProfile,
  answers,
  questionsMap,
  subcategory,
  onComplete,
}) => {
  const [completedSteps, setCompletedSteps] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  // Build telemetry log steps based on actual user answers
  const logSteps: TelemetryLogItem[] = React.useMemo(() => {
    const steps: TelemetryLogItem[] = [];

    // 1. Biometric personal profiling step
    const mt = userProfile.monk_tone || "MST-06";
    const ut = userProfile.undertone || "Warm";
    const fs = userProfile.face_shape || "Oval";
    const bs = userProfile.body_shape || "Hourglass";

    steps.push({
      id: "step-biometric",
      category: "profile",
      title: "Mengekstrak Karakteristik Personal",
      detail: `Monk Tone: ${mt} • Undertone: ${ut} Tone • Wajah: ${fs} Face • Siluet: ${bs}`,
      timestamp: "0.10s",
    });

    // 2. Loop through every single answer provided by the user
    Object.entries(answers).forEach(([qId, optId], idx) => {
      const qData = questionsMap[qId];
      const qTitle = qData ? qData.question : `Preferensi Soal #${idx + 1}`;
      const optData = qData?.options.find((o) => o.id === optId);
      const optLabel = optData ? optData.label : optId;
      const optDesc = optData?.desc ? ` (${optData.desc})` : "";

      steps.push({
        id: `step-ans-${qId}`,
        category: "answer",
        title: `Memasukkan Preferensi Pengguna #${idx + 1}`,
        detail: `[${qTitle.slice(0, 38)}...] ➔ ${optLabel}${optDesc}`,
        timestamp: `${(0.25 + idx * 0.22).toFixed(2)}s`,
      });
    });

    // 3. Color harmony calculation
    steps.push({
      id: "step-color-harmony",
      category: "algorithm",
      title: "Menghitung Harmoni Palet Warna",
      detail: `Memetakan spektrum CIELAB undertone ${ut} terhadap palet musiman & katalog ${subcategory}`,
      timestamp: `${(0.3 + Object.keys(answers).length * 0.22).toFixed(2)}s`,
    });

    // 4. Geometric ratio alignment
    steps.push({
      id: "step-geometry",
      category: "algorithm",
      title: "Kalkulasi Keserasian Geometri",
      detail: `Menyesuaikan dimensi frame/siluet terhadap proporsi ${fs} Face & ${bs} Body`,
      timestamp: `${(0.45 + Object.keys(answers).length * 0.22).toFixed(2)}s`,
    });

    // 5. Curating Top-4 Archetypes
    steps.push({
      id: "step-archetype",
      category: "archetype",
      title: "Menyusun Kurasi Top-4 Style Archetypes",
      detail: "The Perfect Match (#1) • Safe Classic (#2) • Bold Statement (#3) • Modern Silhouette (#4)",
      timestamp: `${(0.6 + Object.keys(answers).length * 0.22).toFixed(2)}s`,
    });

    return steps;
  }, [userProfile, answers, questionsMap, subcategory]);

  const totalSteps = logSteps.length;
  // Dynamic duration: ~450ms per step item so user sees each answer item being loaded
  const stepDelayMs = Math.max(350, Math.min(650, Math.floor(4200 / totalSteps)));

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setCompletedSteps(current);
      setProgressPercent(Math.min(100, Math.round((current / totalSteps) * 100)));

      // Auto scroll logs container
      if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      }

      if (current >= totalSteps) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 600);
      }
    }, stepDelayMs);

    return () => clearInterval(interval);
  }, [totalSteps, stepDelayMs, onComplete]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 animate-spin" />
          <span>AI RECOMMENDATION SYNTHESIS IN PROGRESS</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Memproses & Menyelaraskan Gaya Personal Anda
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
          AI sedang mengevaluasi seluruh {Object.keys(answers).length} parameter kuesioner dan data biometrik
          Anda untuk menyusun rekomendasi terbaik.
        </p>
      </div>

      {/* Futuristic Telemetry Card */}
      <div className="glass-panel-glow rounded-3xl p-6 space-y-5 border border-indigo-500/30">
        {/* Progress Bar & Counter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-indigo-300 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Memuat Vektor Gaya ({completedSteps} / {totalSteps} Tahapan)</span>
            </span>
            <span className="text-emerald-400 font-bold">{progressPercent}%</span>
          </div>

          <div className="w-full bg-slate-900/80 h-2.5 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-rose-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Dynamic Telemetry Log Console */}
        <div
          ref={logsContainerRef}
          className="bg-black/50 rounded-2xl p-4 border border-white/10 max-h-72 overflow-y-auto space-y-2.5 font-mono scroll-smooth"
        >
          {logSteps.map((step, idx) => {
            const isDone = idx < completedSteps;
            const isCurrent = idx === completedSteps;

            return (
              <div
                key={step.id}
                className={`flex items-start space-x-3 p-2 rounded-xl transition-all duration-300 ${
                  isDone
                    ? "bg-indigo-950/30 border border-indigo-500/20 text-slate-200"
                    : isCurrent
                    ? "bg-indigo-600/20 border border-indigo-400 shadow-lg shadow-indigo-600/20 text-white animate-pulse"
                    : "opacity-30 text-slate-500"
                }`}
              >
                {/* Step Status Icon */}
                <div className="shrink-0 mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600" />
                  )}
                </div>

                {/* Log Details */}
                <div className="flex-1 text-xs space-y-0.5 leading-snug">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100">{step.title}</span>
                    <span className="text-[10px] text-slate-500">{step.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-indigo-300/90 break-words">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Badge Summary Footer */}
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero Persistent Biometrics (UU PDP No. 27/2022)</span>
          </div>
          <div className="text-indigo-400">
            <span>Kategori: {subcategory.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
