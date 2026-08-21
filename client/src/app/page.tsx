"use client";

import React, { useState } from "react";
import { HeaderNavbar } from "../components/HeaderNavbar";
import { CameraScan } from "../components/CameraScan";
import { CategorySelector } from "../components/CategorySelector";
import { TargetedQuiz } from "../components/TargetedQuiz";
import { ProcessingLoadingScreen } from "../components/ProcessingLoadingScreen";
import { ARCanvasViewer } from "../components/ARCanvasViewer";
import { SwitchControls } from "../components/SwitchControls";
import { ProductDetailModal } from "../components/ProductDetailModal";
import { UserPersonalProfile, RecommendationItem, MOCK_PRESETS } from "../lib/mockData";
import { fetchTop4Recommendations } from "../lib/api";
import { RotateCcw, Sparkles, Camera, Undo2, ArrowLeft } from "lucide-react";

export default function Home() {
  // Step Sequence: CATEGORY -> SCAN -> QUIZ -> PROCESSING -> TRYON
  const [currentStep, setCurrentStep] = useState<"CATEGORY" | "SCAN" | "QUIZ" | "PROCESSING" | "TRYON">("CATEGORY");
  
  // User Profiling Data
  const [userProfile, setUserProfile] = useState<UserPersonalProfile | null>(null);

  // Media stream from camera scan (reused seamlessly for AR try-on)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Selected Category / Subcategory (Default: accessories -> glasses)
  const [selectedDomain, setSelectedDomain] = useState<"accessories" | "apparel">("accessories");
  const [selectedSubcategory, setSelectedSubcategory] = useState<"glasses" | "hats" | "shirts" | "jackets">("glasses");

  // Telemetry processing state
  const [collectedAnswers, setCollectedAnswers] = useState<Record<string, string>>({});
  const [collectedQuestionsMap, setCollectedQuestionsMap] = useState<Record<string, any>>({});

  // Recommendation Output
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [currentRecIndex, setCurrentRecIndex] = useState<number>(0);

  // Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // STEP 1: Category Selected -> Move to Face Scan
  const handleCategorySelected = (
    domain: "accessories" | "apparel",
    subcat: "glasses" | "hats" | "shirts" | "jackets"
  ) => {
    setSelectedDomain(domain);
    setSelectedSubcategory(subcat);
    setCurrentStep("SCAN");
  };

  // STEP 2: Face Scan Complete -> Move to Targeted Quiz
  const handleScanComplete = (profile: UserPersonalProfile, stream?: MediaStream) => {
    setUserProfile(profile);
    if (stream) setMediaStream(stream);
    setCurrentStep("QUIZ");
  };

  // STEP 3: Quiz Submitted -> Move to Processing Telemetry Screen
  const handleQuizSubmit = async (
    answers: Record<string, string>,
    questionsMap: Record<string, any>
  ) => {
    setCollectedAnswers(answers);
    setCollectedQuestionsMap(questionsMap);
    setCurrentStep("PROCESSING");
    setIsLoadingRecommendations(true);

    try {
      // Send all collected quiz answers to backend recommendation engine
      const data = await fetchTop4Recommendations(
        selectedSubcategory,
        userProfile || MOCK_PRESETS.indonesian_warm_sawo_matang.profile,
        answers,
        false
      );

      setRecommendations(data.items);
      setCurrentRecIndex(0);
    } catch (err) {
      console.error("Error getting recommendations:", err);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // STEP 3.5: Processing Animation Finished -> Move to Step 4 (TRYON)
  const handleProcessingComplete = () => {
    setCurrentStep("TRYON");
  };

  // STEP 4: Switch Navigation Handlers
  const handlePrevItem = () => {
    setCurrentRecIndex((prev) => (prev > 0 ? prev - 1 : recommendations.length - 1));
  };

  const handleNextItem = () => {
    setCurrentRecIndex((prev) => (prev < recommendations.length - 1 ? prev + 1 : 0));
  };

  // Reset back to Stage 1 (Category Selection)
  const handleResetFlow = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
    setUserProfile(null);
    setCollectedAnswers({});
    setCollectedQuestionsMap({});
    setCurrentStep("CATEGORY");
    setCurrentRecIndex(0);
  };

  const activeItem = recommendations[currentRecIndex] || recommendations[0];

  // Build userProfile dict for quiz & loading components
  const userProfileDict: Record<string, any> = userProfile
    ? {
        monk_tone: userProfile.monk_tone?.code || "MST-06",
        undertone: userProfile.undertone?.undertone || "Warm",
        face_shape: userProfile.face_shape?.shape || "Oval",
        body_shape: userProfile.body_shape?.shape || "Hourglass",
      }
    : {
        monk_tone: "MST-06",
        undertone: "Warm",
        face_shape: "Oval",
        body_shape: "Hourglass",
      };

  return (
    <main className="min-h-screen bg-background flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <HeaderNavbar
        currentStep={currentStep}
        onReset={handleResetFlow}
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col justify-center">
        
        {/* STEP 1: CATEGORY SELECTION (Focus Accessories: Glasses & Hats) */}
        {currentStep === "CATEGORY" && (
          <CategorySelector
            onSelectCategory={handleCategorySelected}
          />
        )}

        {/* STEP 2: FACE / PERSONAL PROFILING SCAN */}
        {currentStep === "SCAN" && (
          <CameraScan
            subcategory={selectedSubcategory}
            onScanComplete={handleScanComplete}
            onBack={() => setCurrentStep("CATEGORY")}
            overrideProfile={userProfile}
          />
        )}

        {/* STEP 3: TARGETED QUESTIONNAIRE */}
        {currentStep === "QUIZ" && (
          <TargetedQuiz
            subcategory={selectedSubcategory}
            userProfile={userProfileDict}
            onSubmitQuiz={handleQuizSubmit}
            onBack={() => setCurrentStep("SCAN")}
            isLoading={isLoadingRecommendations}
          />
        )}

        {/* STEP 3.5: CINEMATIC AI PROCESSING TELEMETRY SCREEN */}
        {currentStep === "PROCESSING" && (
          <ProcessingLoadingScreen
            userProfile={userProfileDict}
            answers={collectedAnswers}
            questionsMap={collectedQuestionsMap}
            subcategory={selectedSubcategory}
            onComplete={handleProcessingComplete}
          />
        )}

        {/* STEP 4: 3D AR TRY-ON & SWITCH NAVIGATION STUDIO */}
        {currentStep === "TRYON" && activeItem && (
          <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>TAHAP 4: VALIDASI VISUAL AR & SWITCH NAVIGATION</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  Studio AR & Rekomendasi Top-4 ({selectedSubcategory.toUpperCase()})
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => {
                    if (mediaStream) {
                      mediaStream.getTracks().forEach((t) => t.stop());
                      setMediaStream(null);
                    }
                    setCurrentStep("SCAN");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 shadow-md shadow-rose-600/20 border border-white/10 flex items-center space-x-1.5 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Ulang Wajah</span>
                </button>

                <button
                  onClick={() => {
                    if (mediaStream) {
                      mediaStream.getTracks().forEach((t) => t.stop());
                      setMediaStream(null);
                    }
                    setCurrentStep("CATEGORY");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-surface-50 hover:bg-slate-800 border border-white/10 flex items-center space-x-1.5 transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Ganti Aksesoris</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: 3D AR WebGL Canvas */}
              <div className="lg:col-span-7 h-[420px] sm:h-[500px]">
                <ARCanvasViewer
                  activeItem={activeItem}
                  subcategory={selectedSubcategory}
                  mediaStream={mediaStream}
                />
              </div>

              {/* Right Column: Switch Controls */}
              <div className="lg:col-span-5 space-y-4">
                <SwitchControls
                  items={recommendations}
                  currentIndex={currentRecIndex}
                  onSelectIndex={setCurrentRecIndex}
                  onPrev={handlePrevItem}
                  onNext={handleNextItem}
                  onOpenDetails={() => setIsDetailModalOpen(true)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        item={isDetailModalOpen ? activeItem : null}
        userProfile={userProfile}
        onClose={() => setIsDetailModalOpen(false)}
      />

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-4 text-center text-xs text-slate-500 font-mono">
        <p>COBA © 2026 — Smart AI & AR Fashion Style Recommendation Engine • Zero Persistent Biometrics (UU PDP No. 27/2022 Compliant)</p>
      </footer>
    </main>
  );
}
