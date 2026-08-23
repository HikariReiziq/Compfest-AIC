"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, User, ZoomIn, ZoomOut, Move, Check } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  BodyRepositionTool — reposisi foto seluruh badan secara interaktif */
/*  Drag/pan + zoom (wheel & tombol) + rotate, dengan pemandu postur  */
/* ------------------------------------------------------------------ */

const W = 540;
const H = 720;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const ROTATE_RANGE = 30;

interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number; // derajat
}

export interface BodyRepositionToolProps {
  photoDataUrl: string;
  onConfirm: (snapshotDataUrl: string, width: number, height: number) => void;
  onBack: () => void;
}

export default function BodyRepositionTool({ photoDataUrl, onConfirm, onBack }: BodyRepositionToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const trRef = useRef<Transform>({ x: W / 2, y: H / 2, scale: 1, rotation: 0 });
  const dragRef = useRef<{ px: number; py: number; moved: boolean } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  const [rotation, setRotation] = useState(0);
  const [scaleLabel, setScaleLabel] = useState(1);
  const [imgReady, setImgReady] = useState(false);

  /* ---- Render loop: gambar + transform + siluet pemandu tubuh ---- */
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const img = imgRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const t = trRef.current;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, W, H);

    if (img) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.scale(t.scale, t.scale);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();
    }

    // Overlay gelap di luar garis pemandu
    ctx.save();
    ctx.fillStyle = "rgba(10, 15, 29, 0.45)";
    ctx.fillRect(0, 0, W, H);

    // Siluet Pemandu Tubuh (Kepala, Bahu, Pinggul, Kaki)
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(59, 130, 246, 0.85)"; // Blue accent
    ctx.setLineDash([8, 6]);

    // 1. Oval Kepala
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.15, W * 0.12, H * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Garis Bahu
    ctx.beginPath();
    ctx.moveTo(W * 0.22, H * 0.25);
    ctx.lineTo(W * 0.78, H * 0.25);
    ctx.stroke();

    // 3. Garis Pinggul
    ctx.beginPath();
    ctx.moveTo(W * 0.28, H * 0.48);
    ctx.lineTo(W * 0.72, H * 0.48);
    ctx.stroke();

    // 4. Siluet Badan Menyeluruh (Rounded Contour)
    ctx.beginPath();
    // Bahu ke Pinggul ke Kaki
    ctx.moveTo(W * 0.22, H * 0.25);
    ctx.bezierCurveTo(W * 0.25, H * 0.35, W * 0.28, H * 0.45, W * 0.28, H * 0.50); // Torso kiri
    ctx.lineTo(W * 0.32, H * 0.88); // Kaki kiri
    ctx.lineTo(W * 0.45, H * 0.88); // Selangkangan dalam
    ctx.lineTo(W * 0.50, H * 0.56); // Crotch center
    ctx.lineTo(W * 0.55, H * 0.88);
    ctx.lineTo(W * 0.68, H * 0.88); // Kaki kanan
    ctx.lineTo(W * 0.72, H * 0.50); // Pinggul kanan
    ctx.bezierCurveTo(W * 0.72, H * 0.45, W * 0.75, H * 0.35, W * 0.78, H * 0.25); // Torso kanan
    ctx.stroke();

    ctx.restore();
  }, []);

  /* ---- Load citra & auto-scale awal ---- */
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Auto-scale agar tinggi foto pas mencakup siluet tubuh
      const s = Math.min(W / img.naturalWidth, H / img.naturalHeight) * 0.92;
      trRef.current = { x: W / 2, y: H / 2, scale: s, rotation: 0 };
      setRotation(0);
      setScaleLabel(Math.round(s * 100) / 100);
      setImgReady(true);
      draw();
    };
    img.src = photoDataUrl;
  }, [photoDataUrl, draw]);

  useEffect(() => {
    if (imgReady) draw();
  }, [imgReady, draw]);

  /* ---- Pointer / Drag handler ---- */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.px;
    const dy = e.clientY - dragRef.current.py;
    dragRef.current.px = e.clientX;
    dragRef.current.py = e.clientY;
    dragRef.current.moved = true;

    trRef.current.x += dx;
    trRef.current.y += dy;
    draw();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Abaikan jika pointer capture gagal
      }
      dragRef.current = null;
    }
  };

  /* ---- Zoom (Wheel + Tombol) ---- */
  const applyZoom = useCallback(
    (factor: number) => {
      const cur = trRef.current.scale;
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, cur * factor));
      trRef.current.scale = next;
      setScaleLabel(Math.round(next * 100) / 100);
      draw();
    },
    [draw]
  );

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    applyZoom(factor);
  };

  /* ---- Rotasi slider ---- */
  const onRotateChange = (val: number) => {
    setRotation(val);
    trRef.current.rotation = val;
    draw();
  };

  /* ---- Reset transform ---- */
  const resetTransform = () => {
    const img = imgRef.current;
    if (!img) return;
    const s = Math.min(W / img.naturalWidth, H / img.naturalHeight) * 0.92;
    trRef.current = { x: W / 2, y: H / 2, scale: s, rotation: 0 };
    setRotation(0);
    setScaleLabel(Math.round(s * 100) / 100);
    draw();
  };

  /* ---- Konfirmasi & Ekspor Snapshot ---- */
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    // Render snapshot bersih (tanpa overlay garis) untuk dikirim ke MediaPipe Pose
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const ctx = off.getContext("2d");
    if (!ctx) return;

    const t = trRef.current;
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.scale, t.scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    const dataUrl = off.toDataURL("image/jpeg", 0.92);
    onConfirm(dataUrl, W, H);
  };

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      {/* Canvas Viewport */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-surface-100 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          className="w-full max-h-[520px] object-contain cursor-grab active:cursor-grabbing touch-none select-none"
        />

        {/* Petunjuk overlay kecil */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-blue-300 font-mono border border-blue-500/30 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Sesuaikan siluet tubuh
          </span>
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-slate-300 font-mono">
            {scaleLabel}x
          </span>
        </div>
      </div>

      {/* Control Panel: Zoom, Rotate, Reset */}
      <div className="glass-panel rounded-2xl p-4 space-y-3.5 border border-white/10">
        {/* Zoom & Drag hints */}
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Move className="w-3.5 h-3.5" /> Geser / Scroll untuk Zoom
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyZoom(0.9)}
              className="p-1.5 rounded-lg bg-surface-50 hover:bg-surface-200 text-slate-300 border border-white/5"
              title="Perkecil"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyZoom(1.1)}
              className="p-1.5 rounded-lg bg-surface-50 hover:bg-surface-200 text-slate-300 border border-white/5"
              title="Perbesar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetTransform}
              className="p-1.5 rounded-lg bg-surface-50 hover:bg-surface-200 text-slate-300 border border-white/5"
              title="Reset Posisi"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rotate Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Rotasi Kemiringan:</span>
            <span>{rotation > 0 ? `+${rotation}°` : `${rotation}°`}</span>
          </div>
          <input
            type="range"
            min={-ROTATE_RANGE}
            max={ROTATE_RANGE}
            step={1}
            value={rotation}
            onChange={(e) => onRotateChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-2xl border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-surface-50 transition-colors"
        >
          Ganti Foto
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
        >
          <Check className="w-4 h-4" />
          Konfirmasi & Analisis Tubuh
        </button>
      </div>
    </div>
  );
}
