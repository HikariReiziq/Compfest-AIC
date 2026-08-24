'use client';

import React from 'react';
import { X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { RecommendationItem, UserPersonalProfile } from '../lib/mockData';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn text-white">
      <div className="relative w-full max-w-2xl bg-[#0B1528] border border-blue-500/30 rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#071120] hover:bg-blue-600 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer border border-blue-500/20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#38BDF8] font-bold uppercase tracking-wider">
            <span>{item.archetype_title}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {item.name}
          </h2>
          <p className="text-xs text-[#94A3B8] font-mono">
            Kategori: {item.category} • Sub: {item.subcategory.toUpperCase()} • Harga: <strong className="text-[#FACC15]">{item.price_idr}</strong>
          </p>
        </div>

        {/* 2D Preview and High-level compatibility */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          <div className="sm:col-span-5 aspect-square rounded-2xl overflow-hidden border border-blue-500/20 bg-black/60 flex items-center justify-center p-3">
            <img
              src={
                item.preview_image_url && !item.preview_image_url.endsWith('.obj')
                  ? item.preview_image_url
                  : `/images/products/preview/${item.id}.png`
              }
              alt={item.name}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `/images/products/preview/${item.id}.png`;
              }}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="sm:col-span-7 space-y-3 text-xs">
            <div className="bg-[#071120]/80 p-4 rounded-2xl border border-blue-500/20 space-y-2">
              <div className="flex justify-between items-center font-semibold text-white">
                <span>Skor Keserasian Total</span>
                <span className="font-mono text-[#FACC15] text-sm font-bold">{item.compatibility_score}%</span>
              </div>
              <div className="flex justify-between items-center text-[#93C5FD]">
                <span>Kecocokan Rona Kulit</span>
                <span className="font-mono text-[#38BDF8]">{item.color_match_score}%</span>
              </div>
              <div className="flex justify-between items-center text-[#93C5FD]">
                <span>Kecocokan Siluet Geometris</span>
                <span className="font-mono text-[#60A5FA]">{item.shape_match_score}%</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#94A3B8]">Warna Produk:</span>
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
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#38BDF8] fill-current" />
            <span>Mengapa AI Merekomendasikan Item Ini?</span>
          </h4>

          <div className="bg-[#071120]/80 p-4 rounded-2xl border border-blue-500/20 space-y-2.5 text-xs text-[#94A3B8] leading-relaxed">
            <p>
              <strong className="text-[#93C5FD]">1. Analisis Spektrum Rona Kulit:</strong> Warna <strong>{item.base_colour}</strong> melengkapi rona kulit tropis Monk Scale Anda, menghindari efek wash-out dan memancarkan kilau rona alami.
            </p>
            <p>
              <strong className="text-[#60A5FA]">2. Proporsi Geometris 3D:</strong> Potongan siluet produk ini dirancang proporsional terhadap kontur wajah ({userProfile?.face_shape?.shape || 'Oval'}) dan postur torso Anda.
            </p>
            <p>
              <strong className="text-[#93C5FD]">3. Konteks Acara &amp; Fit:</strong> Disesuaikan untuk skenario penggunaan <strong>{item.usage}</strong> dengan siluet bahan yang jatuh rapi.
            </p>
          </div>
        </div>

        {/* Close Modal Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 border border-blue-400/30 transition-all cursor-pointer"
        >
          Kembali ke 3D Try-On
        </button>
      </div>
    </div>
  );
};
