"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  HelpCircle,
  ChevronLeft,
  Sparkles,
  Check,
  ArrowRight,
  Plus,
  Loader2,
  Brain,
  Zap,
  AlertCircle,
} from "lucide-react";
import { fetchDynamicQuestions } from "../lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
export interface QuestionOption {
  id: string;
  label: string;
  desc: string;
}

export interface DynamicQuestion {
  id: string;
  question: string;
  reason: string;
  options: QuestionOption[];
}

interface TargetedQuizProps {
  subcategory: "glasses" | "hats" | "shirts" | "jackets";
  userProfile: Record<string, any>;
  onSubmitQuiz: (
    answers: Record<string, string>,
    questionsMap: Record<string, { question: string; options: QuestionOption[] }>
  ) => void;
  onBack: () => void;
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export const TargetedQuiz: React.FC<TargetedQuizProps> = ({
  subcategory,
  userProfile,
  onSubmitQuiz,
  onBack,
  isLoading,
}) => {
  const [questionsList, setQuestionsList] = useState<DynamicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentBatch, setCurrentBatch] = useState<number>(1);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [questionSource, setQuestionSource] = useState<string>("gemini_api");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load Initial Batch 1 Questions
  useEffect(() => {
    let cancelled = false;

    async function loadBatch1() {
      setIsLoadingInitial(true);
      try {
        const res = await fetchDynamicQuestions(
          subcategory.includes("glass") || subcategory.includes("hat") ? "accessories" : "apparel",
          subcategory,
          userProfile,
          null,
          1
        );
        if (!cancelled) {
          setQuestionsList(res.questions || []);
          setQuestionSource(res.source || "gemini_api");
          // NOTE: Per user request, DO NOT pre-select any answers!
          setAnswers({});
        }
      } catch (err) {
        console.warn("Failed to fetch initial questions:", err);
      } finally {
        if (!cancelled) setIsLoadingInitial(false);
      }
    }

    loadBatch1();
    return () => { cancelled = true; };
  }, [subcategory, userProfile]);

  // Load More Questions (Unlimited Batches: 2, 3, 4, 5...)
  const handleLoadMoreQuestions = async () => {
    const nextBatch = currentBatch + 1;
    setIsLoadingMore(true);
    setValidationError(null);

    try {
      const res = await fetchDynamicQuestions(
        subcategory.includes("glass") || subcategory.includes("hat") ? "accessories" : "apparel",
        subcategory,
        userProfile,
        answers,
        nextBatch
      );

      const newQuestions: DynamicQuestion[] = res.questions || [];
      // Filter out any duplicates by ID
      setQuestionsList((prev) => {
        const existingIds = new Set(prev.map((q) => q.id));
        const filteredNew = newQuestions.filter((q) => !existingIds.has(q.id));
        return [...prev, ...filteredNew];
      });
      setCurrentBatch(nextBatch);
    } catch (err) {
      console.warn(`Failed to fetch batch ${nextBatch} questions:`, err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if all displayed questions have been answered
    const unanswered = questionsList.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setValidationError(
        `Masih ada ${unanswered.length} pertanyaan yang belum Anda jawab. Silakan pilih opsi untuk semua pertanyaan.`
      );
      return;
    }

    // Build question map for telemetry screen
    const qMap: Record<string, { question: string; options: QuestionOption[] }> = {};
    questionsList.forEach((q) => {
      qMap[q.id] = { question: q.question, options: q.options };
    });

    onSubmitQuiz(answers, qMap);
  };

  const totalQuestions = questionsList.length;
  const answeredCount = Object.keys(answers).length;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  const accentColors = [
    { bg: "rgba(99,102,241,0.2)", fg: "#818cf8", border: "#6366f1" },
    { bg: "rgba(244,63,94,0.2)",  fg: "#fb7185", border: "#f43f5e" },
    { bg: "rgba(16,185,129,0.2)", fg: "#34d399", border: "#10b981" },
    { bg: "rgba(245,158,11,0.2)", fg: "#fbbf24", border: "#f59e0b" },
    { bg: "rgba(6,182,212,0.2)",  fg: "#22d3ee", border: "#06b6d4" },
    { bg: "rgba(139,92,246,0.2)", fg: "#a78bfa", border: "#8b5cf6" },
  ];

  if (isLoadingInitial) {
    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center py-20 space-y-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
          <Brain className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
        <p className="text-sm text-slate-300 font-semibold">Menyusun Kuesioner Personalisasi AI...</p>
        <p className="text-xs text-slate-500 font-mono">Menyelaraskan dengan karakteristik {subcategory}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Pemindaian Wajah</span>
        </button>

        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>TAHAP 3: KUESIONER BERTARGET ({subcategory.toUpperCase()})</span>
        </div>

        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Sesuaikan Preferensi Gaya Anda
        </h2>

        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Pilih jawaban yang paling mencerminkan karakter Anda. Anda dapat menambahkan soal untuk personalisasi yang semakin akurat.
        </p>

        {/* Status Indicator & Counter */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-surface-50 border border-white/10 text-[11px] font-mono text-slate-300">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {questionSource === "gemini_api"
                ? "Dihasilkan oleh Gemini AI Engine"
                : "Bank Kurasi COBA Stylist"}
            </span>
          </div>

          <div
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-semibold transition-all ${
              isAllAnswered
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-surface-50 border-white/10 text-slate-400"
            }`}
          >
            <span>
              Terjawab: {answeredCount} / {totalQuestions} Soal
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Questions List */}
        {questionsList.map((q, index) => {
          const accent = accentColors[index % accentColors.length];
          const isAnswered = !!answers[q.id];

          return (
            <div
              key={q.id}
              className={`glass-panel rounded-3xl p-6 space-y-4 transition-all duration-300 ${
                !isAnswered && validationError
                  ? "border-rose-500/50 shadow-lg shadow-rose-500/10"
                  : ""
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start space-x-3">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0"
                  style={{ backgroundColor: accent.bg, color: accent.fg }}
                >
                  {index + 1}
                </span>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base leading-snug">{q.question}</h3>
                    {isAnswered && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0 ml-2">
                        ✓ Terjawab
                      </span>
                    )}
                  </div>

                  {/* Contextual Reason Badge */}
                  {q.reason && (
                    <div className="flex items-start space-x-1.5 px-3 py-2 rounded-xl bg-indigo-500/8 border border-indigo-500/15 text-[11px] text-indigo-300/80">
                      <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
                      <span>{q.reason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(q.id, opt.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "bg-indigo-600/25 border-indigo-500 shadow-lg shadow-indigo-600/20 text-white scale-[1.01]"
                          : "bg-surface-50/50 border-white/5 text-slate-300 hover:border-white/20 hover:bg-surface-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{opt.label}</span>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-white/20" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{opt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Add More Questions Button (Unlimited batches) */}
        <div className="flex flex-col items-center justify-center pt-2 space-y-2">
          <button
            type="button"
            onClick={handleLoadMoreQuestions}
            disabled={isLoadingMore}
            className="px-6 py-3.5 rounded-2xl text-sm font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:scale-[1.01] transition-all flex items-center space-x-2.5 shadow-lg shadow-indigo-500/5 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Menyusun Pertanyaan Batch #{currentBatch + 1}...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>
                  Tambah Soal untuk Personalisasi Lebih Dalam (Batch #{currentBatch + 1})
                </span>
              </>
            )}
          </button>
          <span className="text-[11px] font-mono text-slate-500">
            Dapat ditambahkan berkali-kali untuk kurasi semakin presisi
          </span>
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center space-x-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-300 shadow-xl flex items-center justify-center space-x-2.5 disabled:opacity-50 ${
            isAllAnswered
              ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-rose-600 hover:scale-[1.01] shadow-indigo-600/30"
              : "bg-gradient-to-r from-indigo-700/60 to-slate-700/60 opacity-80"
          }`}
        >
          {isLoading ? (
            <span>Menghubungkan ke AI Engine...</span>
          ) : (
            <>
              <span>Hasilkan Rekomendasi Top-4 & Validasi di AR</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
