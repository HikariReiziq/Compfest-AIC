'use client';

import React, { useState } from 'react';
import LandingClient from './landing/LandingClient';
import { HeaderNavbar } from './HeaderNavbar';
import { CameraScan } from './CameraScan';
import { BodyOutfitViewer } from './BodyOutfitViewer';
import { CategorySelector } from './CategorySelector';
import { TargetedQuiz } from './TargetedQuiz';
import { ProcessingLoadingScreen } from './ProcessingLoadingScreen';
import { ARCanvasViewer } from './ARCanvasViewer';
import { SwitchControls } from './SwitchControls';
import { ProductDetailModal } from './ProductDetailModal';
import UniversalLoading3D from './UniversalLoading3D';
import { UserPersonalProfile, RecommendationItem, MOCK_PRESETS } from '../lib/mockData';
import { fetchTop4Recommendations } from '../lib/api';
import { RotateCcw, Camera, Undo2, ArrowLeft, AlertCircle } from 'lucide-react';

interface MainAppWrapperProps {
  fontClass: string;
}

export default function MainAppWrapper({ fontClass }: MainAppWrapperProps) {
  // Top-level View Mode: "LANDING" | "STUDIO"
  const [viewMode, setViewMode] = useState<'LANDING' | 'STUDIO'>('LANDING');

  // Loading transition from Landing to Studio (2-3 seconds)
  const [isTransitioningToStudio, setIsTransitioningToStudio] = useState<boolean>(false);

  // Step Sequence within Studio: CATEGORY -> SCAN -> QUIZ -> PROCESSING -> TRYON
  const [currentStep, setCurrentStep] = useState<'CATEGORY' | 'SCAN' | 'QUIZ' | 'PROCESSING' | 'TRYON'>('CATEGORY');

  // User Profiling Data
  const [userProfile, setUserProfile] = useState<UserPersonalProfile | null>(null);

  // Media stream from camera scan
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Selected Category / Subcategory
  const [selectedDomain, setSelectedDomain] = useState<'accessories' | 'apparel'>('accessories');
  const [selectedSubcategory, setSelectedSubcategory] = useState<'glasses' | 'hats' | 'shirts'>('glasses');

  // Telemetry processing state
  const [collectedAnswers, setCollectedAnswers] = useState<Record<string, string>>({});
  const [collectedQuestionsMap, setCollectedQuestionsMap] = useState<Record<string, any>>({});

  // Recommendation Output
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  // Quiz initial Gemini loading — navbar must stay hidden behind the fullscreen loader
  const [isQuizLoading, setIsQuizLoading] = useState<boolean>(false);
  const [currentRecIndex, setCurrentRecIndex] = useState<number>(0);

  // Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Handler to jump directly from Landing into Studio with a 2.5s loading animation
  const handleOpenStudio = (
    categoryPreset?: 'glasses' | 'hats' | 'shirts',
    gender: 'male' | 'female' = 'male'
  ) => {
    if (categoryPreset) {
      setSelectedSubcategory(categoryPreset);
      setSelectedDomain(categoryPreset === 'shirts' ? 'apparel' : 'accessories');
      setCurrentStep('SCAN');
    } else {
      setCurrentStep('CATEGORY');
    }

    const initialProfile: UserPersonalProfile = {
      ...MOCK_PRESETS.indonesian_warm_sawo_matang.profile,
      gender: {
        label: gender === 'female' ? "Wanita (Female)" : "Pria (Male)",
        label_id: gender,
        confidence: 1.0,
        method: "manual_selection",
        rule: "dipilih pengguna",
      },
      body_shape_classification: {
        body_shape: gender === 'female' ? "Hourglass (Gitar Spanyol)" : "Trapezoid (Atletis)",
        confidence: 1.0,
      },
    };
    setUserProfile(initialProfile);

    setIsTransitioningToStudio(true);

    setTimeout(() => {
      setIsTransitioningToStudio(false);
      setViewMode('STUDIO');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2500);
  };

  // STEP 1: Category Selected -> Move to Scan
  const handleCategorySelected = (
    domain: 'accessories' | 'apparel',
    subcat: 'glasses' | 'hats' | 'shirts'
  ) => {
    setSelectedDomain(domain);
    setSelectedSubcategory(subcat);
    setCurrentStep('SCAN');
  };

  // STEP 2: Scan Complete -> Move to Quiz
  const handleScanComplete = (
    profile: UserPersonalProfile,
    stream?: MediaStream,
    meta?: { inputMode: 'camera' | 'upload' }
  ) => {
    const enrichedProfile: UserPersonalProfile = {
      ...profile,
      face_analysis_meta: {
        ...(profile.face_analysis_meta || { confidence: 0.92, source: 'engine' }),
        input_mode: meta?.inputMode || (stream ? 'camera' : 'upload'),
      },
    };
    setUserProfile(enrichedProfile);

    if (stream instanceof MediaStream) {
      setMediaStream(stream);
    } else {
      setMediaStream(null);
    }
    setCurrentStep('QUIZ');
  };

  // STEP 3: Quiz Complete -> Move to Telemetry Loading -> Fetch Recommendations
  const handleQuizSubmit = async (
    answers: Record<string, string>,
    questionsMap?: Record<string, any>
  ) => {
    setCollectedAnswers(answers);
    if (questionsMap) setCollectedQuestionsMap(questionsMap);

    setCurrentStep('PROCESSING');
    setIsLoadingRecommendations(true);
    setRecommendationError(null);

    try {
      const recs = await fetchTop4Recommendations(
        selectedSubcategory,
        userProfile || ({} as any),
        answers
      );

      const items = (recs as any)?.items || (recs as any)?.recommendations || recs;
      if (items && items.length > 0) {
        setRecommendations(items);
        setCurrentRecIndex(0);
      }
    } catch (err: any) {
      console.warn('Failed fetching recommendations:', err);
      setRecommendationError('Gagal memuat rekomendasi cerdas. Menggunakan rekomendasi default.');
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Processing Completed -> Show Final Recommendations
  const handleProcessingComplete = () => {
    setCurrentStep('TRYON');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset entire flow back to Category selection (or initial step)
  const handleResetFlow = () => {
    setCurrentStep('CATEGORY');
    setRecommendations([]);
    setCollectedAnswers({});
    setCurrentRecIndex(0);
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
  };

  // Retake scan without clearing everything
  const handleRetakeScan = () => {
    setCurrentStep('SCAN');
  };

  // Switch Navigation
  const handleNextItem = () => {
    if (recommendations.length === 0) return;
    setCurrentRecIndex((prev) => (prev + 1) % recommendations.length);
  };

  const handlePrevItem = () => {
    if (recommendations.length === 0) return;
    setCurrentRecIndex((prev) => (prev === 0 ? recommendations.length - 1 : prev - 1));
  };

  // Active Recommended Item
  const activeItem = recommendations[currentRecIndex] || recommendations[0];

  const userProfileDict = userProfile
    ? {
        face_shape: userProfile.face_shape?.shape,
        undertone: userProfile.undertone?.undertone,
        gender: userProfile.gender?.label_id,
        monk_tone: userProfile.monk_tone?.code || (userProfile as any).monk_skin_tone?.scale || 'MST-06',
        shoulder_width_cm: userProfile.body_measurements_cm?.shoulder_width_cm,
        body_shape: userProfile.body_shape_classification?.body_shape,
      }
    : {
        face_shape: 'Oval',
        undertone: 'Warm',
        gender: 'female',
        monk_tone: 'MST-06',
        body_shape: 'Hourglass',
      };

  // If transitioning from Landing to Studio, show Universal 3D loading screen (2-3s)
  if (isTransitioningToStudio) {
    return (
      <UniversalLoading3D
        subcategory={selectedSubcategory}
        gender={userProfile?.gender?.label_id as ('male' | 'female')}
      />
    );
  }

  // If in Landing Mode, render the Landing Hero Showcase
  if (viewMode === 'LANDING') {
    return (
      <LandingClient
        fontClass={fontClass}
        initialGender={userProfile?.gender?.label_id as ('male' | 'female')}
        onOpenStudio={handleOpenStudio}
      />
    );
  }

  // If in Studio Mode, render the 4-step Virtual Fitting Room with COBA logo & mascot aesthetics
  const currentGender: ('male' | 'female') =
    ((userProfile?.gender as any)?.label_id || userProfile?.gender || 'male') as ('male' | 'female');
  const isFemale = currentGender === 'female';

  return (
    <main
      className={`${fontClass} relative min-h-screen bg-[#060B14] text-white flex flex-col justify-between ${
        isFemale ? 'selection:bg-pink-600 selection:text-white' : 'selection:bg-blue-600 selection:text-white'
      }`}
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {/* Background Wallpaper Dahlia Flowers */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
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
              : 'bg-gradient-to-b from-[#060B14]/65 via-[#060B14]/55 to-[#060B14]/75'
          }`}
        />
      </div>

      {/* Navigation Header */}
      {currentStep !== 'PROCESSING' && !(currentStep === 'QUIZ' && isQuizLoading) && (
        <HeaderNavbar
          currentStep={currentStep}
          gender={currentGender}
          onReset={handleResetFlow}
          onBackToLanding={() => {
            if (mediaStream) {
              mediaStream.getTracks().forEach((t) => t.stop());
              setMediaStream(null);
            }
            setViewMode('LANDING');
          }}
          onStepClick={(step) => {
            if (step === 'CATEGORY') handleResetFlow();
            else if (step === 'SCAN') setCurrentStep('SCAN');
            else if (step === 'QUIZ' && userProfile) setCurrentStep('QUIZ');
            else if (step === 'TRYON' && recommendations.length > 0) setCurrentStep('TRYON');
          }}
          canNavigateToQuiz={Boolean(userProfile)}
          canNavigateToTryon={recommendations.length > 0}
        />
      )}

      {/* Main Container — jarak atas lega dari floating navbar */}
      <div className="relative z-10 w-full px-6 sm:px-10 lg:px-14 pt-32 sm:pt-36 lg:pt-40 pb-12 flex-1 flex flex-col justify-start">
        {/* STEP 1: CATEGORY SELECTION */}
        {currentStep === 'CATEGORY' && (
          <CategorySelector
            gender={currentGender}
            onSelectCategory={handleCategorySelected}
          />
        )}

        {/* STEP 2: PERSONAL PROFILING SCAN (FACE / BODY BIOMETRICS) */}
        {currentStep === 'SCAN' && (
          <CameraScan
            subcategory={selectedSubcategory}
            onScanComplete={handleScanComplete}
            onBack={() => setCurrentStep('CATEGORY')}
            overrideProfile={userProfile || undefined}
          />
        )}

        {/* STEP 3: TARGETED QUESTIONNAIRE */}
        {currentStep === 'QUIZ' && (
          <TargetedQuiz
            subcategory={selectedSubcategory}
            userProfile={userProfileDict}
            onSubmitQuiz={handleQuizSubmit}
            onBack={() => setCurrentStep('SCAN')}
            isLoading={isLoadingRecommendations}
            onLoadingChange={setIsQuizLoading}
          />
        )}

        {/* STEP 3.5: CINEMATIC AI PROCESSING TELEMETRY SCREEN (WITH 3D SPINNER) */}
        {currentStep === 'PROCESSING' && (
          <ProcessingLoadingScreen
            userProfile={userProfileDict}
            answers={collectedAnswers}
            questionsMap={collectedQuestionsMap}
            subcategory={selectedSubcategory}
            onComplete={handleProcessingComplete}
          />
        )}

        {/* STEP 4: VIRTUAL TRY-ON & SWITCH NAVIGATION STUDIO */}
        {currentStep === 'TRYON' && !activeItem && (
          <div className="w-full max-w-xl mx-auto text-center space-y-6 py-16 animate-fadeIn">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4" />
              <span>REKOMENDASI BELUM TERSEDIA</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Rekomendasi belum berhasil dimuat</h2>
            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              AI Stylist belum menerima Top-4 rekomendasi untuk sesi ini. Silakan ulangi kuesioner atau pindai ulang.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentStep('QUIZ')}
                className={`px-6 py-3 rounded-full text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-all cursor-pointer border ${
                  isFemale
                    ? 'bg-pink-600 hover:bg-pink-700 border-pink-400'
                    : 'bg-blue-600 hover:bg-blue-700 border-blue-400'
                }`}
              >
                Ulangi Kuesioner
              </button>
              <button
                type="button"
                onClick={handleResetFlow}
                className="px-6 py-3 rounded-full bg-slate-800 border border-white/10 text-slate-300 font-semibold text-sm hover:text-white transition-all cursor-pointer"
              >
                Mulai Ulang
              </button>
            </div>
          </div>
        )}

        {currentStep === 'TRYON' && activeItem && (
          <div className="w-full space-y-7 animate-fadeIn">
            {recommendationError && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>
                  Rekomendasi gagal dimuat dari server: <span className="font-mono text-xs">{recommendationError}</span> — kembali ke kuesioner dan coba lagi.
                </span>
              </div>
            )}
            {/* Header: All aligned in 1 single clean row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
              <div>
                <div
                  className={`inline-flex items-center gap-3 px-6 py-2 rounded-full border text-xs font-mono font-bold tracking-wider mb-2 ${
                    isFemale
                      ? 'bg-[#1c0b1a] border-pink-500/30 text-pink-300'
                      : 'bg-[#0B1528] border-blue-500/30 text-[#93C5FD]'
                  }`}
                >
                  <span>TAHAP 4: VALIDASI VISUAL TRY-ON</span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  Studio Try-On Top-4
                </h2>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentStep('QUIZ')}
                  className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold border flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    isFemale
                      ? 'text-pink-300 bg-[#160716] hover:bg-pink-600 hover:text-white border-pink-500/30'
                      : 'text-[#93C5FD] bg-[#08101E] hover:bg-blue-600 hover:text-white border-blue-500/30'
                  }`}
                  title="Kembali ke Kuesioner"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Ubah Kuesioner</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (mediaStream) {
                      mediaStream.getTracks().forEach((t) => t.stop());
                      setMediaStream(null);
                    }
                    setCurrentStep('SCAN');
                  }}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white border flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    isFemale
                      ? 'bg-pink-600 hover:bg-pink-700 border-pink-400'
                      : 'bg-blue-600 hover:bg-blue-700 border-blue-400'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (mediaStream) {
                      mediaStream.getTracks().forEach((t) => t.stop());
                      setMediaStream(null);
                    }
                    setCurrentStep('CATEGORY');
                  }}
                  className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold border flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    isFemale
                      ? 'text-pink-300 bg-[#160716] hover:bg-pink-600 hover:text-white border-pink-500/30'
                      : 'text-[#93C5FD] bg-[#08101E] hover:bg-blue-600 hover:text-white border-blue-500/30'
                  }`}
                  title="Ganti Kategori"
                >
                  <Undo2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Ganti Kategori</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-12">
              {/* Left Column: Unified Real-Time 3D AR Canvas (Glasses, Hats & Shirts) */}
              <div className="lg:col-span-7 space-y-4">
                <ARCanvasViewer
                  activeItem={activeItem}
                  subcategory={selectedSubcategory}
                  mediaStream={mediaStream}
                  inputMode={userProfile?.face_analysis_meta?.input_mode || (mediaStream ? 'camera' : 'upload')}
                  gender={currentGender}
                />
              </div>

              {/* Right Column: Switch Controls */}
              <div className="lg:col-span-5 flex flex-col justify-start">
                <SwitchControls
                  items={recommendations}
                  currentIndex={currentRecIndex}
                  userProfile={userProfile}
                  onSelectIndex={(idx) => setCurrentRecIndex(idx)}
                  onPrev={handlePrevItem}
                  onNext={handleNextItem}
                  onOpenDetails={() => setIsDetailModalOpen(true)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Product Detail Modal */}
      {isDetailModalOpen && activeItem && (
        <ProductDetailModal
          item={activeItem}
          userProfile={userProfile}
          gender={currentGender}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}

      {/* Footer with adequate clearance */}
      <footer className="relative z-10 w-full pt-10 pb-8 text-center text-xs text-[#64748B] font-mono">
        <p>© 2026 COBA — Cocokkan Outfit Sesuai Badan Anda • Kompetisi AIC 2026 • AI &amp; AR Fashion Style Recommendation Engine • Zero Persistent Biometrics (UU PDP No. 27/2022)</p>
      </footer>
    </main>
  );
}
