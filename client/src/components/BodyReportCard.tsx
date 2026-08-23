"use client";

import React from "react";
import {
  User,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Shirt,
  Scissors,
  Footprints,
  Info,
  ChevronLeft,
  RotateCcw,
} from "lucide-react";
import { BodyLandmarkAnalysisResult } from "../lib/api";

export interface BodyReportCardProps {
  report: BodyLandmarkAnalysisResult;
  snapshotDataUrl?: string | null;
  onProceedToQuiz: () => void;
  onBack?: () => void;
}

export const BodyReportCard: React.FC<BodyReportCardProps> = ({
  report,
  snapshotDataUrl,
  onProceedToQuiz,
  onBack,
}) => {
  const shape = report.body_shape?.shape || "Hourglass";
  const shapeLabel = report.body_shape?.label_indonesian || "Hourglass (Jam Pasir)";
  const balanceLabel = report.torso_leg_balance?.label_indonesian || "Proporsi Seimbang (Balanced)";
  const meas = report.measurements_cm || {};
  const pillars = report.pillars || [];
  const narrative = report.narrative || { summary: "" };

  const shoulderCm = meas.shoulder_width_cm ?? 42.0;
  const waistCm = meas.waist_width_cm ?? 32.5;
  const hipCm = meas.hip_width_cm ?? 38.0;
  const heightCm = meas.total_height_cm ?? 165;
  const proportion = meas.body_proportion || "1.1 : 0.85 : 1.0";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Back Button */}
      {onBack && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-mono"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Pindai Ulang Tubuh</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>LAPORAN ANALISIS BIOMETRIK TUBUH</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Profil Proporsi & Karakter Tubuh Anda
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          AI telah mengukur rasio antropometri tubuh Anda untuk menentukan potongan <strong>Baju, Kemeja, dan Jaket Outerwear</strong> yang paling ideal.
        </p>
      </div>

      {/* Main Grid: Visual Body + Metrics & Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Foto Tubuh Beranotasi SVG (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-surface-100 aspect-[3/4] max-h-[580px] flex items-center justify-center">
            {snapshotDataUrl ? (
              <img
                src={snapshotDataUrl}
                alt="Scan Tubuh Pengguna"
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-slate-900 via-blue-950/40 to-slate-900 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <User className="w-20 h-20 text-slate-600 mb-2" />
                <span className="text-xs font-mono">Simulasi Antropometri Tubuh</span>
              </div>
            )}

            {/* SVG Anotasi Geometris Bergaris Ukuran (Shoulder, Waist, Hip) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 540 720"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <filter id="bodyGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.8" />
                </filter>
              </defs>

              {/* 1. Garis Lebar Bahu */}
              <g filter="url(#bodyGlow)">
                <line x1="120" y1="180" x2="420" y2="180" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="4 4" />
                <circle cx="120" cy="180" r="4" fill="#38bdf8" />
                <circle cx="420" cy="180" r="4" fill="#38bdf8" />
              </g>
              <rect x="180" y="160" width="180" height="22" rx="6" fill="rgba(10, 15, 29, 0.85)" stroke="#38bdf8" strokeWidth="1" />
              <text x="270" y="175" fill="#e0f2fe" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Lebar Bahu: {shoulderCm} cm
              </text>

              {/* 2. Garis Lebar Pinggang */}
              <g filter="url(#bodyGlow)">
                <line x1="160" y1="300" x2="380" y2="300" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="4 4" />
                <circle cx="160" cy="300" r="4" fill="#fbbf24" />
                <circle cx="380" cy="300" r="4" fill="#fbbf24" />
              </g>
              <rect x="180" y="288" width="180" height="22" rx="6" fill="rgba(10, 15, 29, 0.85)" stroke="#fbbf24" strokeWidth="1" />
              <text x="270" y="303" fill="#fef3c7" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Lebar Pinggang: {waistCm} cm
              </text>

              {/* 3. Garis Lebar Pinggul */}
              <g filter="url(#bodyGlow)">
                <line x1="140" y1="410" x2="400" y2="410" stroke="#34d399" strokeWidth="2.5" strokeDasharray="4 4" />
                <circle cx="140" cy="410" r="4" fill="#34d399" />
                <circle cx="400" cy="410" r="4" fill="#34d399" />
              </g>
              <rect x="180" y="398" width="180" height="22" rx="6" fill="rgba(10, 15, 29, 0.85)" stroke="#34d399" strokeWidth="1" />
              <text x="270" y="413" fill="#d1fae5" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Lebar Pinggul: {hipCm} cm
              </text>
            </svg>

            {/* Badge Proporsi Rasio */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Rasio Bahu : Pinggang : Pinggul</span>
                <p className="text-xs font-bold text-white font-mono">{proportion}</p>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Tinggi Acuan</span>
                <p className="text-xs font-bold text-blue-400 font-mono">{heightCm} cm</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-2xl bg-surface-100 border border-white/5 text-slate-400 text-xs">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Terkalibrasi standar antropometri ANSUR II & ISO 7250.</span>
          </div>
        </div>

        {/* Kolom Kanan: Grid 5 Dimensi + 3 Pilar + Narasi (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 5-Dimension Badge Grid */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> 5 Dimensi Karakter Tubuh
              </span>
              <span className="text-[10px] font-mono px-2.5 py-0.8 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                Akurasi 94%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* 1. Bentuk Tubuh */}
              <div className="p-3.5 rounded-2xl bg-surface-50 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-400" /> Bentuk Tubuh
                </span>
                <p className="text-xs font-bold text-white leading-tight">{shapeLabel}</p>
              </div>

              {/* 2. Rasio Torso-Kaki */}
              <div className="p-3.5 rounded-2xl bg-surface-50 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-amber-400" /> Proporsi Vertikal
                </span>
                <p className="text-xs font-bold text-white leading-tight">{balanceLabel}</p>
              </div>

              {/* 3. Fit Atasan (Topwear) */}
              <div className="p-3.5 rounded-2xl bg-surface-50 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Shirt className="w-3 h-3 text-indigo-400" /> Fit Atasan
                </span>
                <p className="text-xs font-bold text-white leading-tight">
                  {report.body_shape?.topwear_recommendations?.[0] || "Structured Fit"}
                </p>
              </div>

              {/* 4. Fit Bawahan (Bottomwear) */}
              <div className="p-3.5 rounded-2xl bg-surface-50 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-400" /> Potongan Celana
                </span>
                <p className="text-xs font-bold text-white leading-tight">
                  {report.body_shape?.bottomwear_recommendations?.[0] || "Straight / Wide-Leg"}
                </p>
              </div>

              {/* 5. Siluet Sepatu (Footwear) */}
              <div className="p-3.5 rounded-2xl bg-surface-50 border border-white/5 space-y-1 col-span-2 sm:col-span-2">
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Footprints className="w-3 h-3 text-pink-400" /> Siluet Alas Kaki
                </span>
                <p className="text-xs font-bold text-white leading-tight">
                  {report.body_shape?.footwear_recommendations?.[0] || "Chunky Sneakers / Loafers"}
                </p>
              </div>
            </div>
          </div>

          {/* 3-Pillar Scientific Justification Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              3 Pilar Ilmiah Rekomendasi Busana
            </h3>

            <div className="space-y-3">
              {pillars.map((p, idx) => (
                <div
                  key={idx}
                  className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2 hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      {p.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                      {p.recommendation}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{p.reason}</p>
                  <p className="text-[10px] font-mono text-slate-500 pt-1 border-t border-white/5">
                    Basis Ilmiah: {p.scientific_basis}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Narasi Ringkasan Personal */}
          {narrative.summary && (
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 space-y-1.5">
              <span className="text-[11px] font-mono text-blue-400 font-bold uppercase">Ringkasan Gaya Personal</span>
              <p className="text-xs text-slate-300 leading-relaxed">{narrative.summary}</p>
            </div>
          )}

          {/* CTA Buttons: Pindai Ulang & Lanjut ke Kuesioner */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-surface-50 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-blue-400" />
                <span>Pindai Ulang</span>
              </button>
            )}

            <button
              type="button"
              onClick={onProceedToQuiz}
              className="flex-1 w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 group transition-all duration-300 cursor-pointer"
            >
              <span>Lanjut ke Kuesioner Personalisasi Busana</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BodyReportCard;
