"use client";

import React from "react";
import { UserCheck, Sparkles, Sliders } from "lucide-react";
import { MOCK_PRESETS, UserPersonalProfile } from "../lib/mockData";

interface MockDataToggleProps {
  activePresetKey: string | null;
  onSelectPreset: (key: string, profile: UserPersonalProfile) => void;
  onUseLiveCamera: () => void;
}

export const MockDataToggle: React.FC<MockDataToggleProps> = ({
  activePresetKey,
  onSelectPreset,
  onUseLiveCamera,
}) => {
  return (
    <div className="w-full bg-surface-100/90 border border-indigo-500/20 backdrop-blur-md rounded-2xl p-3 shadow-xl mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2 text-xs font-mono text-indigo-300">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold uppercase tracking-wider">Evaluation Control:</span>
          <span className="text-slate-400">Pilih Preset Karakter / Kamera Fisik</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onUseLiveCamera}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activePresetKey === null
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-surface-50 text-slate-300 hover:bg-surface-50/80 border border-white/5"
            }`}
          >
            📷 Live Kamera
          </button>

          {Object.entries(MOCK_PRESETS).map(([key, data]) => {
            const isSelected = activePresetKey === key;
            return (
              <button
                key={key}
                onClick={() => onSelectPreset(key, data.profile)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                  isSelected
                    ? "bg-gradient-to-r from-indigo-600 to-rose-600 text-white shadow-md shadow-rose-600/20"
                    : "bg-surface-50 text-slate-300 hover:bg-slate-800 border border-white/5"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: data.profile.monk_tone.hex }}
                />
                <span>{data.name.split(":")[1] || data.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
