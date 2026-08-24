'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  ChevronLeft,
  Check,
  ArrowRight,
  Plus,
  Loader2,
  Brain,
  AlertCircle,
  Sparkles,
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

/* ------------------------------------------------------------------ */
/*  Alternative Options Pool Bank for Dynamic Re-Rolling             */
/* ------------------------------------------------------------------ */
const ALTERNATIVE_OPTIONS_MAP: Record<string, QuestionOption[][]> = {
  occasion: [
    [
      { id: "Occ_Cafe", label: "Ngopi & Hangout Santai", desc: "Aktivitas kasual harian bersama teman" },
      { id: "Occ_Executive", label: "Meeting Eksekutif Resmi", desc: "Suasana kerja profesional dan berwibawa" },
      { id: "Occ_Gala", label: "Gala & Dinner Romantis", desc: "Momen perayaan malam berkesan" },
      { id: "Occ_Gym", label: "Gym & Mobilitas Aktif", desc: "Ketahanan tinggi untuk aktivitas dinamis" },
    ],
    [
      { id: "Occ_Travel", label: "Traveling & Liburan", desc: "Fleksibel dan nyaman di perjalanan" },
      { id: "Occ_Creative", label: "Studio & Komunitas Kreatif", desc: "Tampilan ekspresif bernuansa artistik" },
      { id: "Occ_Daily", label: "Daily Essentials Harian", desc: "Pilihan serbaguna dari pagi hingga malam" },
      { id: "Occ_FormalEvent", label: "Resepsi & Acara Resmi", desc: "Kesan anggun/maskulin yang rapi" },
    ],
  ],
  fit_preference: [
    [
      { id: "Fit_Geometric", label: "Geometris Heksagonal", desc: "Sudut kontemporer unik berani beda" },
      { id: "Fit_Rimless", label: "Rimless / Tanpa Bingkai", desc: "Sangat ringan dan tidak dominan" },
      { id: "Fit_VintageRound", label: "Bulat Retro Artistik", desc: "Sentuhan klasik intelektual" },
      { id: "Fit_Clubmaster", label: "Clubmaster / Browline", desc: "Garis atas tegas beraksen metal" },
    ],
    [
      { id: "Fit_AviatorDouble", label: "Aviator Double-Bridge", desc: "Jembatan ganda memotong panjang wajah" },
      { id: "Fit_SquareBold", label: "Kotak Tebal Solid", desc: "Garis tegas memperkuat struktur rahang" },
      { id: "Fit_CatEyeSoft", label: "Cat-Eye / Sudut Halus", desc: "Aksen terangkat mempersegar tatapan" },
      { id: "Fit_MinimalistWire", label: "Wireframe Tipis Presisi", desc: "Simpel, bersih, dan profesional" },
    ],
  ],
  color_mood: [
    [
      { id: "Col_Champagne", label: "Champagne & Caramel", desc: "Nuansa emas lembut berkelas" },
      { id: "Col_SmokyOnyx", label: "Smoky Charcoal & Onyx", desc: "Abu arang modern berwibawa" },
      { id: "Col_SageForest", label: "Sage Green & Forest", desc: "Hijau alami yang menenangkan" },
      { id: "Col_RichHavana", label: "Rich Havana Tortoise", desc: "Gradasi amber mewah eksotis" },
    ],
    [
      { id: "Col_DeepNavy", label: "Deep Navy & Perak", desc: "Kontras biru pekat elegan" },
      { id: "Col_BronzeEarth", label: "Bronze & Terrakota Tua", desc: "Kilau tembaga hangat memikat" },
      { id: "Col_RoseGold", label: "Rose Gold & Soft Blush", desc: "Sentuhan lembut manis berkelas" },
      { id: "Col_MatteBlack", label: "All-Black Doff Solid", desc: "Ketegasan maskulin minimalis" },
    ],
  ],
  brand_style: [
    [
      { id: "Style_Techwear", label: "Tech-Wear Fungsional", desc: "Fokus material modern dan utilitas" },
      { id: "Style_Retro90s", label: "Vintage 90s Heritage", desc: "Sentuhan nostalgia yang otentik" },
      { id: "Style_QuietLuxury", label: "Quiet Luxury Elegan", desc: "Mewah bersahaja tanpa logo mencolok" },
      { id: "Style_Cyberpunk", label: "Kontemporer Eksploratif", desc: "Desain masa depan berkarakter tajam" },
    ],
  ],
  comfort_priority: [
    [
      { id: "Comf_AntiSlip", label: "Anti-Slip & Tahan Keringat", desc: "Tetap stabil saat cuaca panas tropis" },
      { id: "Comf_SoftPads", label: "Bantalan Hidung Lembut", desc: "Bantalan silikon adaptif tanpa bekas" },
      { id: "Comf_SpringHinges", label: "Engsel Pegas Fleksibel", desc: "Menyesuaikan lebar pelipis dengan pas" },
      { id: "Comf_Weightless", label: "Beban Terdistribusi Merata", desc: "Terasa seringan tanpa beban di hidung" },
    ],
  ],
  material_preference: [
    [
      { id: "Mat_CarbonFiber", label: "Carbon Fiber Composite", desc: "Daya tahan maksimal bobot ekstra ringan" },
      { id: "Mat_Alloy", label: "Aluminium Alloy Ringan", desc: "Logam modern dengan fleksibilitas tinggi" },
      { id: "Mat_Ultem", label: "Ultem Resilient Memory", desc: "Fleksibel, tidak mudah patah, elastis" },
      { id: "Mat_EcoAcetate", label: "Eco-Acetate Selulosa", desc: "Ramah lingkungan dan lembut di kulit" },
    ],
  ],
  finish_style: [
    [
      { id: "Fin_SatinSilky", label: "Satin Silky Touch", desc: "Sentuhan halus lembut semi-doff" },
      { id: "Fin_Ceramic", label: "Ceramic Matte Coating", desc: "Lapisan tahan gores bertekstur kokoh" },
      { id: "Fin_Gradation", label: "Gradasi Amber Tortoise", desc: "Pola motif alami berdimensi kaya" },
      { id: "Fin_Anodized", label: "Metallic Anodized", desc: "Warna logam menyatu anti-luntur" },
    ],
  ],
  budget_range: [
    [
      { id: "Bud_Value", label: "Smart Value (< Rp400rb)", desc: "Kualitas harian harga hemat" },
      { id: "Bud_Midrange", label: "Mid-Tier Pilihan (Rp400-800rb)", desc: "Material lebih kokoh dan detail rapi" },
      { id: "Bud_HighEnd", label: "High-End Artisan (Rp800rb-1.5Jt)", desc: "Finishing presisi pengerjaan tangan" },
      { id: "Bud_Collector", label: "Collector Edition (> Rp1.5Jt)", desc: "Material langka dan seri terbatas" },
    ],
  ],
};

interface TargetedQuizProps {
  subcategory: 'glasses' | 'hats' | 'shirts';
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
  const [questionSource, setQuestionSource] = useState<string>('gemini_api');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [rerollCounts, setRerollCounts] = useState<Record<string, number>>({});
  const [rerollingId, setRerollingId] = useState<string | null>(null);

  // Load Initial Batch 1 Questions
  useEffect(() => {
    let cancelled = false;

    async function loadBatch1() {
      setIsLoadingInitial(true);
      try {
        const res = await fetchDynamicQuestions(
          subcategory.includes('glass') || subcategory.includes('hat') ? 'accessories' : 'apparel',
          subcategory,
          userProfile,
          null,
          1
        );
        if (!cancelled) {
          setQuestionsList(res.questions || []);
          setQuestionSource(res.source || 'gemini_api');
          setAnswers({});
        }
      } catch (err) {
        console.warn('Failed to fetch initial questions:', err);
      } finally {
        if (!cancelled) setIsLoadingInitial(false);
      }
    }

    loadBatch1();
    return () => { cancelled = true; };
  }, [subcategory, userProfile]);

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
        setQuestionsList((prev) => [...prev, ...res.questions]);
        setCurrentBatch(nextBatch);
      }
    } catch (err) {
      console.warn('Failed to load more questions:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Re-roll options for a specific question with alternative sets
  const handleRerollQuestion = (questionId: string) => {
    setRerollingId(questionId);

    setTimeout(() => {
      setQuestionsList((prevList) => {
        return prevList.map((q) => {
          if (q.id !== questionId) return q;

          // Find alternative sets matching the question key or fallback
          const qKey = Object.keys(ALTERNATIVE_OPTIONS_MAP).find(
            (k) => q.id.toLowerCase().includes(k) || q.question.toLowerCase().includes(k)
          ) || 'fit_preference';

          const altSets = ALTERNATIVE_OPTIONS_MAP[qKey] || ALTERNATIVE_OPTIONS_MAP.fit_preference;
          const currentCount = rerollCounts[questionId] || 0;
          const nextSetIdx = currentCount % altSets.length;
          const newOptions = altSets[nextSetIdx];

          setRerollCounts((prev) => ({
            ...prev,
            [questionId]: currentCount + 1,
          }));

          return {
            ...q,
            options: newOptions,
          };
        });
      });

      // Reset previous selection for this question so user picks from new choices
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });

      setRerollingId(null);
    }, 200);
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

  if (isLoadingInitial) {
    return (
      <UniversalLoading3D
        title="Menyusun Kuesioner Personalisasi AI..."
        subtitle={`AI sedang menganalisis karakteristik biometrik Anda untuk merumuskan pertanyaan gaya ${subcategory}`}
        badgeText={`TAHAP 3: SINTESIS GAYA (${subcategory.toUpperCase()})`}
        subcategory={subcategory}
      />
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-9 animate-fadeIn text-white">
      {/* Header */}
      <div className="text-center space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#93C5FD] hover:text-white transition-colors mb-1 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-[#38BDF8]" />
          <span>
            {subcategory === 'shirts'
              ? 'Kembali ke Laporan Analisis Tubuh'
              : 'Kembali ke Pemindaian Wajah'}
          </span>
        </button>

        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-[#0B1528] border border-blue-500/30 text-[#93C5FD] text-sm sm:text-base font-mono font-bold shadow-xl tracking-wider">
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0B1528] border border-blue-500/20 text-xs font-mono text-[#93C5FD]">
            <HelpCircle className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>
              {questionSource === 'gemini_api'
                ? 'Dihasilkan oleh Gemini AI Engine'
                : 'Bank Kurasi COBA Stylist'}
            </span>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-mono font-semibold transition-all ${
              isAllAnswered
                ? 'bg-blue-500/20 border-blue-500/40 text-[#93C5FD]'
                : 'bg-[#08101E] border-white/15 text-[#64748B]'
            }`}
          >
            <span>
              Terjawab: {answeredCount} / {totalQuestions} Soal
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        {/* Questions List */}
        {questionsList.map((q, index) => {
          const isAnswered = !!answers[q.id];

          return (
            <div
              key={q.id}
              className={`relative bg-[#0B1528]/90 rounded-3xl p-7 sm:p-8 space-y-5 transition-all duration-300 border backdrop-blur-xl shadow-xl ${
                !isAnswered && validationError
                  ? 'border-rose-500/60'
                  : 'border-blue-500/20'
              }`}
            >
              {/* Floating Compact Re-Roll Button Attached to Container */}
              <div className="absolute -top-3.5 right-6 z-10">
                <button
                  type="button"
                  onClick={() => handleRerollQuestion(q.id)}
                  disabled={rerollingId === q.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold text-[#38BDF8] bg-[#071120] border border-blue-400/40 hover:border-blue-400 hover:bg-blue-600/25 hover:text-white transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Tidak ada pilihan yang cocok? Acak opsi alternatif lain"
                >
                  <Sparkles className={`w-3 h-3 text-[#FACC15] ${rerollingId === q.id ? 'animate-spin' : ''}`} />
                  <span>Opsi Lain</span>
                </button>
              </div>

              {/* Question Header */}
              <div className="flex items-start gap-4">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 bg-blue-600 text-white"
                >
                  {index + 1}
                </span>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="font-bold text-white text-lg sm:text-xl leading-snug">{q.question}</h3>
                    {isAnswered && (
                      <span className="text-xs font-mono text-[#93C5FD] bg-blue-500/20 border border-blue-500/30 px-3 py-1 rounded-full shrink-0">
                        ✓ Terjawab
                      </span>
                    )}
                  </div>

                  {q.reason && (
                    <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-2xl bg-[#071120] border border-blue-500/20 text-xs text-[#93C5FD]/80">
                      <Brain className="w-4 h-4 shrink-0 mt-0.5 text-[#38BDF8]" />
                      <span>{q.reason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(q.id, opt.id)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-[#071120]/60 border-white/10 text-[#94A3B8] hover:border-blue-500/30 hover:bg-[#071120]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm sm:text-base">{opt.label}</span>
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-white/20" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed">{opt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Add More Questions Button */}
        <div className="flex flex-col items-center justify-center pt-3 space-y-2">
          <button
            type="button"
            onClick={handleLoadMoreQuestions}
            disabled={isLoadingMore}
            className="px-8 py-3.5 rounded-full text-sm font-semibold text-[#93C5FD] bg-[#0B1528] border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2.5 disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#38BDF8]" />
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
          className={`w-full py-6 sm:py-6.5 min-h-[70px] sm:min-h-[78px] rounded-full font-extrabold text-lg sm:text-xl text-white transition-all duration-300 flex items-center justify-center gap-3.5 disabled:opacity-50 cursor-pointer shadow-2xl tracking-wide ${
            isAllAnswered
              ? 'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 hover:scale-[1.01] active:scale-[0.99] border border-blue-400/30'
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
