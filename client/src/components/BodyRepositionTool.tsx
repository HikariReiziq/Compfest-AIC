"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, ZoomIn, ZoomOut, Move, Check } from "lucide-react";

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
    ctx.fillStyle = "#0D070A";
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
    ctx.fillStyle = "rgba(6, 11, 20, 0.4)";
    ctx.fillRect(0, 0, W, H);

    // Siluet Pemandu Tubuh (Kepala, Bahu, Pinggul, Kaki) - Electric Sky Blue
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    ctx.setLineDash([8, 6]);

    // 1. Oval Kepala
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.15, W * 0.12, H * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Garis Bahu
    ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
    ctx.beginPath();
    ctx.moveTo(W * 0.22, H * 0.25);
    ctx.lineTo(W * 0.78, H * 0.25);
    ctx.stroke();

    // 3. Garis Pinggul
    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    ctx.beginPath();
    ctx.moveTo(W * 0.28, H * 0.48);
    ctx.lineTo(W * 0.72, H * 0.48);
    ctx.stroke();

    // 4. Siluet Badan Menyeluruh (Rounded Contour)
    ctx.beginPath();
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
      // Auto-scale agar tinggi/lebar foto pas mencakup siluet tubuh
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
  const canvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / (rect.width || 1)) * W,
      y: ((e.clientY - rect.top) / (rect.height || 1)) * H,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = canvasPos(e);
    dragRef.current = { px: p.x, py: p.y, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const p = canvasPos(e);
    const dx = p.x - dragRef.current.px;
    const dy = p.y - dragRef.current.py;
    dragRef.current.px = p.x;
    dragRef.current.py = p.y;
    dragRef.current.moved = true;

    trRef.current.x += dx;
    trRef.current.y += dy;
    draw();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = null;
  };

  /* ---- Wheel zoom ---- */
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    applyZoom(factor);
  };

  /* ---- Zoom helper ---- */
  const applyZoom = (factor: number) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, trRef.current.scale * factor));
    trRef.current.scale = newScale;
    setScaleLabel(Math.round(newScale * 100) / 100);
    draw();
  };

  /* ---- Rotation helper ---- */
  const onRotateChange = (deg: number) => {
    setRotation(deg);
    trRef.current.rotation = deg;
    draw();
  };

  /* ---- Reset transform ---- */
  const resetTransform = () => {
    if (!imgRef.current) return;
    const s = Math.min(W / imgRef.current.naturalWidth, H / imgRef.current.naturalHeight) * 0.92;
    trRef.current = { x: W / 2, y: H / 2, scale: s, rotation: 0 };
    setRotation(0);
    setScaleLabel(Math.round(s * 100) / 100);
    draw();
  };

  /* ---- Confirm cropped/transformed image ---- */
  const handleConfirm = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const snapshotDataUrl = cv.toDataURL("image/jpeg", 0.92);
    onConfirm(snapshotDataUrl, W, H);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 animate-fadeIn">
      {/* Canvas Area (Aspect 3:4 Preserves True Photo Proportions) */}
      <div className="relative rounded-3xl overflow-hidden border border-blue-500/30 bg-[#060B14] shadow-2xl flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          className="w-full aspect-[3/4] max-h-[560px] block touch-none cursor-grab active:cursor-grabbing"
        />

        {/* Overlay Badge Status */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-[#0B1528]/90 backdrop-blur-md text-xs text-[#93C5FD] font-mono border border-blue-500/20 shadow-md">
            Sesuaikan siluet tubuh
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#0B1528]/90 backdrop-blur-md text-[11px] text-[#93C5FD] font-mono border border-blue-500/20">
            {scaleLabel}x
          </span>
        </div>
      </div>

      {/* Control Panel: Zoom, Rotate, Reset */}
      <div className="bg-[#0B1528]/90 rounded-2xl p-4 space-y-3.5 border border-blue-500/20 backdrop-blur-xl">
        {/* Zoom & Drag hints */}
        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
          <span className="flex items-center gap-1.5 text-[#94A3B8]">
            <Move className="w-3.5 h-3.5 text-[#38BDF8]" /> Geser / Scroll untuk Zoom
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyZoom(0.9)}
              className="p-2 rounded-full bg-[#071120] hover:bg-blue-600 hover:text-white text-[#93C5FD] border border-blue-500/30 transition-colors cursor-pointer"
              title="Perkecil"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyZoom(1.1)}
              className="p-2 rounded-full bg-[#071120] hover:bg-blue-600 hover:text-white text-[#93C5FD] border border-blue-500/30 transition-colors cursor-pointer"
              title="Perbesar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetTransform}
              className="p-2 rounded-full bg-[#071120] hover:bg-blue-600 hover:text-white text-[#93C5FD] border border-blue-500/30 transition-colors cursor-pointer"
              title="Reset Posisi"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rotate Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono text-[#94A3B8]">
            <span>Rotasi Kemiringan:</span>
            <span className="text-[#93C5FD]">{rotation > 0 ? `+${rotation}°` : `${rotation}°`}</span>
          </div>
          <input
            type="range"
            min={-ROTATE_RANGE}
            max={ROTATE_RANGE}
            step={1}
            value={rotation}
            onChange={(e) => onRotateChange(Number(e.target.value))}
            className="w-full h-1.5 bg-[#08101E] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-full border border-blue-500/30 text-xs font-semibold font-mono text-[#94A3B8] hover:text-white bg-[#08101E] hover:bg-white/10 transition-colors cursor-pointer"
        >
          Ganti Foto
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 py-3 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold font-mono border border-blue-400/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" />
          Konfirmasi &amp; Analisis Tubuh
        </button>
      </div>
    </div>
  );
}
