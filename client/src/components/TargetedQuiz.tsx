'use client';

import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  ChevronLeft,
  Check,
  ArrowRight,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { fetchDynamicQuestions } from '../lib/api';
import UniversalLoading3D from './UniversalLoading3D';

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
  subcategory: 'glasses' | 'hats' | 'shirts';
  userProfile: Record<string, any>;
  onSubmitQuiz: (
    answers: Record<string, string>,
    questionsMap: Record<string, { question: string; options: QuestionOption[] }>
  ) => void;
  onBack: () => void;
  isLoading: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

function normalizeQuestions(rawList: DynamicQuestion[], batchNumber: number): DynamicQuestion[] {
  const seenIds = new Set<string>();
  return (rawList || []).map((q, idx) => {
    let uniqueQId = q.id || `q_b${batchNumber}_${idx + 1}`;
    if (seenIds.has(uniqueQId)) {
      uniqueQId = `${uniqueQId}_${idx + 1}`;
    }
    seenIds.add(uniqueQId);

    const optSeen = new Set<string>();
    const options = (q.options || []).map((opt, optIdx) => {
      let optId = opt.id || `opt_${idx + 1}_${optIdx + 1}`;
      if (optSeen.has(optId)) {
        optId = `${optId}_${optIdx + 1}`;
      }
      optSeen.add(optId);
      return {
        ...opt,
        id: optId,
      };
    });

    return {
      ...q,
      id: uniqueQId,
      options,
    };
  });
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
  onLoadingChange,
}) => {
  const [questionsList, setQuestionsList] = useState<DynamicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentBatch, setCurrentBatch] = useState<number>(1);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [questionSource, setQuestionSource] = useState<string>('gemini_api');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [rerollingId, setRerollingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState<number>(0);

  // Stable serialized key for the profile object — prevents the load effect
  // from re-firing on every parent re-render (which created an infinite fetch loop)
  const profileKey = JSON.stringify(userProfile);

  // Load Initial Batch 1 Questions (100% Gemini-generated)
  useEffect(() => {
    let cancelled = false;

    async function loadBatch1() {
      setIsLoadingInitial(true);
      setLoadError(null);
      onLoadingChange?.(true);
      try {
        const res = await fetchDynamicQuestions(
          subcategory.includes('glass') || subcategory.includes('hat') ? 'accessories' : 'apparel',
          subcategory,
          userProfile,
          null,
          1
        );
        if (!cancelled) {
          const validatedQuestions = normalizeQuestions(res.questions || [], 1);
          if (validatedQuestions.length === 0) {
            throw new Error('Gemini tidak menghasilkan pertanyaan.');
          }
          setQuestionsList(validatedQuestions);
          setQuestionSource(res.source || 'gemini_api');
          setAnswers({});
        }
      } catch (err: any) {
        console.warn('Failed to fetch initial questions:', err);
        if (!cancelled) {
          setLoadError(err?.message || 'Gemini AI Engine tidak dapat dihubungi.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingInitial(false);
          onLoadingChange?.(false);
        }
      }
    }

    loadBatch1();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcategory, profileKey, retryTick]);

  // Load More Questions
  const handleLoadMoreQuestions = async () => {
    const nextBatch = currentBatch + 1;
    setIsLoadingMore(true);
    setValidationError(null);

    try {
      const res = await fetchDynamicQuestions(
        subcategory.includes('glass') || subcategory.includes('hat') ? 'accessories' : 'apparel',
        subcategory,
        userProfile,
        answers,
        nextBatch
      );
      if (res.questions && res.questions.length > 0) {
        const nextValidated = normalizeQuestions(res.questions, nextBatch);
        setQuestionsList((prev) => [...prev, ...nextValidated]);
        setCurrentBatch(nextBatch);
      }
    } catch (err) {
      console.warn('Failed to load more questions:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Re-roll options for a specific question — alternatives are re-generated live by Gemini
  const handleRerollQuestion = async (questionId: string) => {
    setRerollingId(questionId);
    try {
      const res = await fetchDynamicQuestions(
        subcategory.includes('glass') || subcategory.includes('hat') ? 'accessories' : 'apparel',
        subcategory,
        userProfile,
        answers,
        1
      );
      const fresh = normalizeQuestions(res.questions || [], 1);
      const target = questionsList.find((q) => q.id === questionId);

      // Prefer a fresh question about the same theme; otherwise take the first fresh set
      const candidate =
        fresh.find(
          (q) =>
            target &&
            q.question.toLowerCase().split(/\s+/).some((w) =>
              w.length > 4 && target.question.toLowerCase().includes(w)
            )
        ) || fresh[0];

      if (candidate && candidate.options?.length) {
        setQuestionsList((prevList) =>
          prevList.map((q) => (q.id === questionId ? { ...q, options: candidate.options } : q))
        );
        // Reset previous selection for this question so user picks from new choices
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
      }
    } catch (err) {
      console.warn('Failed to reroll question options via Gemini:', err);
    } finally {
      setRerollingId(null);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const unanswered = questionsList.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setValidationError(
        `Harap jawab semua ${questionsList.length} pertanyaan sebelum melanjutkan (${unanswered.length} pertanyaan belum terisi).`
      );
      return;
    }

    const qMap: Record<string, { question: string; options: QuestionOption[] }> = {};
    const richAnswers: Record<string, any> = { ...answers };
    const answeredItemsSummary: Array<{ question: string; label: string; desc: string }> = [];

    questionsList.forEach((q, idx) => {
      qMap[q.id] = {
        question: q.question,
        options: q.options,
      };

      const chosenOpt = q.options.find((o) => o.id === answers[q.id]);
      if (chosenOpt) {
        answeredItemsSummary.push({
          question: q.question,
          label: chosenOpt.label,
          desc: chosenOpt.desc,
        });

        richAnswers[`label_${q.id}`] = chosenOpt.label;
        richAnswers[`desc_${q.id}`] = chosenOpt.desc;

        const textToAnalyze = `${q.question} ${chosenOpt.label} ${chosenOpt.desc}`.toLowerCase();

        if (
          idx === 0 ||
          textToAnalyze.includes('momen') ||
          textToAnalyze.includes('situasi') ||
          textToAnalyze.includes('waktu') ||
          textToAnalyze.includes('aktivitas') ||
          textToAnalyze.includes('dipakai')
        ) {
          if (!richAnswers.occasion) {
            richAnswers.occasion = chosenOpt.label;
          }
        }

        if (
          idx === 1 ||
          textToAnalyze.includes('bentuk') ||
          textToAnalyze.includes('siluet') ||
          textToAnalyze.includes('bingkai') ||
          textToAnalyze.includes('potongan') ||
          textToAnalyze.includes('ukuran') ||
          textToAnalyze.includes('gaya')
        ) {
          if (!richAnswers.fit_preference) {
            richAnswers.fit_preference = chosenOpt.label;
          }
        }

        if (
          idx === 2 ||
          textToAnalyze.includes('warna') ||
          textToAnalyze.includes('palet') ||
          textToAnalyze.includes('rona') ||
          textToAnalyze.includes('nuansa') ||
          textToAnalyze.includes('tone') ||
          textToAnalyze.includes('mood')
        ) {
          if (!richAnswers.color_mood) {
            richAnswers.color_mood = chosenOpt.label;
          }
        }
      }
    });

    richAnswers.answers_summary = answeredItemsSummary;
    onSubmitQuiz(richAnswers, qMap);
  };

  const totalQuestions = questionsList.length;
  const answeredCount = Object.keys(answers).length;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const isFemale =
    userProfile?.gender === 'female' ||
    userProfile?.gender?.label_id === 'female' ||
    userProfile?.gender === 'Wanita' ||
    userProfile?.gender_label === 'female';

  if (isLoadingInitial) {
    return (
      <UniversalLoading3D
        title="Menyusun Kuesioner Personalisasi AI..."
        subtitle={`AI sedang menganalisis karakteristik biometrik Anda untuk merumuskan pertanyaan gaya ${subcategory}`}
        badgeText={`TAHAP 3: SINTESIS GAYA (${subcategory.toUpperCase()})`}
        subcategory={subcategory}
        gender={isFemale ? 'female' : 'male'}
      />
    );
  }

  if (loadError) {
    return (
      <div className="w-full max-w-xl mx-auto text-center space-y-6 animate-fadeIn text-white py-16">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
          <AlertCircle className="w-4 h-4" />
          <span>GEMINI AI ENGINE TIDAK TERSEDIA</span>
        </div>
        <h2 className="text-2xl font-bold">Kuesioner Gagal Dimuat</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Semua pertanyaan kuesioner dihasilkan langsung oleh Gemini AI (tanpa bank soal statis),
          jadi koneksi ke AI Engine wajib tersedia. Error: <span className="text-rose-300 font-mono text-xs">{loadError}</span>
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setRetryTick((t) => t + 1)}
            className={`px-6 py-3 rounded-full text-white font-semibold text-sm shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer ${
              isFemale
                ? 'bg-gradient-to-r from-pink-600 to-rose-500'
                : 'bg-gradient-to-r from-blue-600 to-sky-500'
            }`}
          >
            Coba Lagi
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-full bg-slate-800 border border-white/10 text-slate-300 font-semibold text-sm hover:text-white transition-all cursor-pointer"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-9 animate-fadeIn text-white">
      {/* Header */}
      <div className="text-center space-y-3">
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center gap-1.5 text-xs font-mono transition-colors mb-1 cursor-pointer ${
            isFemale ? 'text-pink-300 hover:text-white' : 'text-[#93C5FD] hover:text-white'
          }`}
        >
          <ChevronLeft className={`w-4 h-4 ${isFemale ? 'text-pink-400' : 'text-[#38BDF8]'}`} />
          <span>
            {subcategory === 'shirts'
              ? 'Kembali ke Laporan Analisis Tubuh'
              : 'Kembali ke Pemindaian Wajah'}
          </span>
        </button>

        <div className="flex items-center justify-center">
          <div
            className={`inline-flex items-center gap-3 px-6 py-2.5 rounded-full border text-sm sm:text-base font-mono font-bold shadow-xl tracking-wider ${
              isFemale
                ? 'bg-[#1c0b1a] border-pink-500/30 text-pink-300'
                : 'bg-[#0B1528] border-blue-500/30 text-[#93C5FD]'
            }`}
          >
            <span>TAHAP 3: KUESIONER BERTARGET ({subcategory.toUpperCase()})</span>
          </div>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Sesuaikan Preferensi Gaya Anda
        </h2>

        <p className="text-[#94A3B8] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Pilih preferensi yang paling mencerminkan karakter Anda. Anda dapat menambahkan soal untuk personalisasi yang semakin akurat.
        </p>

        {/* Status Indicator & Counter */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-mono ${
              isFemale
                ? 'bg-[#180918] border-pink-500/20 text-pink-300'
                : 'bg-[#0B1528] border-blue-500/20 text-[#93C5FD]'
            }`}
          >
            <HelpCircle className={`w-3.5 h-3.5 ${isFemale ? 'text-pink-400' : 'text-[#38BDF8]'}`} />
            <span>
              {questionSource === 'gemini_api'
                ? 'Dihasilkan oleh Gemini AI Engine'
                : 'Bank Kurasi COBA Stylist'}
            </span>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-mono font-semibold transition-all ${
              isAllAnswered
                ? isFemale
                  ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
                  : 'bg-blue-500/20 border-blue-500/40 text-[#93C5FD]'
                : 'bg-[#08101E] border-white/15 text-[#64748B]'
            }`}
          >
            <span>
              Terjawab: {answeredCount} / {totalQuestions} Soal
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Questions List — 2-column grid to fill the screen left-right */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-7 items-start">
        {questionsList.map((q, index) => {
          const isAnswered = !!answers[q.id];

          return (
            /* Double-Bezel Luxury Outer Shell */
            <div
              key={q.id}
              className={`relative p-1.5 sm:p-2 rounded-[2.25rem] border backdrop-blur-2xl transition-all duration-500 shadow-xl ${
                questionsList.length % 2 === 1 && index === questionsList.length - 1 ? 'xl:col-span-2' : ''
              } ${
                !isAnswered && validationError
                  ? 'border-rose-500/60 bg-rose-950/20'
                  : isFemale
                  ? 'bg-gradient-to-b from-pink-500/10 via-pink-500/[0.02] to-transparent border-pink-500/25 hover:border-pink-400/50'
                  : 'bg-gradient-to-b from-blue-500/10 via-blue-500/[0.02] to-transparent border-blue-500/25 hover:border-blue-400/50'
              }`}
            >
              {/* Floating Compact Re-Roll Button Attached to Container */}
              <div className="absolute -top-3.5 right-6 z-10">
                <button
                  type="button"
                  onClick={() => handleRerollQuestion(q.id)}
                  disabled={rerollingId === q.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold border transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 ${
                    isFemale
                      ? 'text-pink-300 border-pink-400/40 hover:border-pink-400 hover:bg-pink-600/25 hover:text-white bg-[#140613]'
                      : 'text-[#38BDF8] border-blue-400/40 hover:border-blue-400 hover:bg-blue-600/25 hover:text-white bg-[#071120]'
                  }`}
                  title="Tidak ada pilihan yang cocok? Acak opsi alternatif lain"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isFemale ? 'text-pink-400' : 'text-[#38BDF8]'} ${
                      rerollingId === q.id ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Opsi Lain</span>
                </button>
              </div>

              {/* Inner Core */}
              <div
                className={`p-6 sm:p-7 rounded-[calc(2.25rem-0.375rem)] space-y-5 transition-all duration-500 ${
                  isFemale
                    ? 'bg-[#150714]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                    : 'bg-[#071120]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start gap-4">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 text-white shadow-md ${
                      isFemale ? 'bg-pink-600 shadow-pink-600/30' : 'bg-blue-600 shadow-blue-600/30'
                    }`}
                  >
                    {index + 1}
                  </span>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h3
                        className="font-bold text-white text-lg sm:text-xl leading-snug tracking-tight"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {q.question}
                      </h3>
                      {isAnswered && (
                        <span
                          className={`text-xs font-mono px-3 py-1 rounded-full shrink-0 flex items-center gap-1 border font-bold ${
                            isFemale
                              ? 'text-pink-300 bg-pink-500/20 border-pink-500/40'
                              : 'text-[#93C5FD] bg-blue-500/20 border-blue-500/40'
                          }`}
                        >
                          <Check className={`w-3 h-3 ${isFemale ? 'text-pink-400' : 'text-[#38BDF8]'}`} />
                          <span>Terjawab</span>
                        </span>
                      )}
                    </div>

                    {q.reason && (
                      <div
                        className={`flex items-start gap-2 px-3.5 py-2.5 rounded-2xl border text-xs leading-relaxed font-light ${
                          isFemale
                            ? 'bg-[#1f091d]/60 border-pink-500/20 text-pink-300/90'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        <span>{q.reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {q.options.map((opt) => {
                    const isSelected = answers[q.id] === opt.id;
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => handleSelectOption(q.id, opt.id)}
                        className={`text-left p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${
                          isSelected
                            ? isFemale
                              ? 'bg-gradient-to-br from-pink-500/25 to-pink-950/40 border-pink-400 text-white shadow-[0_0_25px_rgba(244,114,182,0.25)]'
                              : 'bg-gradient-to-br from-blue-500/25 to-blue-950/40 border-blue-400 text-white shadow-[0_0_25px_rgba(56,189,248,0.25)]'
                            : isFemale
                            ? 'bg-[#180816]/70 border-white/10 text-slate-300 hover:border-pink-500/40 hover:bg-[#1f0b1d]'
                            : 'bg-[#0b1424]/70 border-white/10 text-slate-300 hover:border-blue-500/40 hover:bg-[#0f1b30]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm sm:text-base">{opt.label}</span>
                          {isSelected ? (
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm ${
                                isFemale ? 'bg-pink-600' : 'bg-blue-600'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-white/20" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed font-light">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        </div>

        {/* Add More Questions Button */}
        <div className="flex flex-col items-center justify-center pt-3 space-y-2">
          <button
            type="button"
            onClick={handleLoadMoreQuestions}
            disabled={isLoadingMore}
            className={`px-8 py-3.5 rounded-full text-sm font-semibold border transition-all flex items-center gap-2.5 disabled:opacity-50 cursor-pointer shadow-lg ${
              isFemale
                ? 'text-pink-300 bg-[#1a0c1a] border-pink-500/30 hover:bg-pink-600 hover:text-white'
                : 'text-[#93C5FD] bg-[#0B1528] border-blue-500/30 hover:bg-blue-600 hover:text-white'
            }`}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className={`w-4 h-4 animate-spin ${isFemale ? 'text-pink-400' : 'text-[#38BDF8]'}`} />
                <span>Menyusun Pertanyaan Batch #{currentBatch + 1}...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-[#FACC15]" />
                <span>
                  Tambah Soal untuk Personalisasi Lebih Dalam (Batch #{currentBatch + 1})
                </span>
              </>
            )}
          </button>
          <span className="text-xs font-mono text-[#64748B]">
            Dapat ditambahkan berkali-kali untuk kurasi semakin presisi
          </span>
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-4 min-h-[54px] rounded-full font-extrabold text-base sm:text-lg text-white transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer tracking-wide ${
            isAllAnswered
              ? isFemale
                ? 'bg-pink-600 hover:bg-pink-700 hover:scale-[1.01] active:scale-[0.99] border border-pink-400'
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] border border-blue-400'
              : 'bg-[#08101E] border border-white/15 text-[#64748B]'
          }`}
        >
          {isLoading ? (
            <span>Menghubungkan ke AI Engine...</span>
          ) : (
            <>
              <span>Hasilkan Rekomendasi Top-4 &amp; Validasi di AR</span>
              <ArrowRight className="w-6 h-6 text-[#FACC15]" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
