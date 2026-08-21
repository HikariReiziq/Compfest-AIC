"use client";

import React from "react";
import { X, Sparkles, CheckCircle2, Tag, Shirt, ShieldAlert } from "lucide-react";
import { RecommendationItem, UserPersonalProfile } from "../lib/mockData";

interface ProductDetailModalProps {
  item: RecommendationItem | null;
  userProfile: Partial<UserPersonalProfile> | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  userProfile,
  onClose,
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-surface-100 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-50 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{item.archetype_title}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {item.name}
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Kategori: {item.category} • Sub: {item.subcategory.toUpperCase()} • Harga: <strong className="text-emerald-400">{item.price_idr}</strong>
          </p>
        </div>

        {/* 2D Preview and High-level compatibility */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          <div className="sm:col-span-5 aspect-square rounded-2xl overflow-hidden border border-white/10 bg-surface-50">
            <img
              src={item.preview_image_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="sm:col-span-7 space-y-3 text-xs">
            <div className="bg-surface-50 p-4 rounded-2xl border border-white/5 space-y-2">
              <div className="flex justify-between items-center font-semibold text-slate-300">
                <span>Skor Keserasian Total</span>
                <span className="font-mono text-emerald-400 text-sm font-bold">{item.compatibility_score}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Kecocokan Warna Kulit</span>
                <span className="font-mono text-indigo-300">{item.color_match_score}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Kecocokan Siluet Geometris</span>
                <span className="font-mono text-rose-300">{item.shape_match_score}%</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Warna Produk:</span>
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/30"
                style={{ backgroundColor: item.hex_colour }}
              />
              <span className="font-semibold text-white">{item.base_colour}</span>
            </div>
          </div>
        </div>

        {/* Detailed AI Stylist Analysis */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Mengapa AI Merekomendasikan Item Ini?</span>
          </h4>

          <div className="bg-surface-50/70 p-4 rounded-2xl border border-white/5 space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              <strong className="text-indigo-300">1. Analisis Warna Musiman:</strong> Warna <strong>{item.base_colour}</strong> sangat serasi dengan undertone kulit <strong>{userProfile?.undertone?.undertone || "Warm"}</strong> Anda, menghindari kesan *wash-out* dan memancarkan kilau segar alami.
            </p>
            <p>
              <strong className="text-rose-300">2. Proporsi Geometris:</strong> Potongan siluet produk ini dirancang untuk melengkapi bentuk {item.category === "Accessories" ? `wajah (${userProfile?.face_shape?.shape || "Oval"})` : `tubuh (${userProfile?.body_shape?.shape || "Hourglass"})`} sehingga menciptakan keseimbangan postur yang flattering.
            </p>
            <p>
              <strong className="text-emerald-300">3. Konteks Acara:</strong> Disesuaikan untuk kebutuhan penggunaan <strong>{item.usage}</strong> dengan karakter bahan yang nyaman.
            </p>
          </div>
        </div>

        {/* Close Modal Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/25"
        >
          Kembali ke 3D Try-On
        </button>
      </div>
    </div>
  );
};
