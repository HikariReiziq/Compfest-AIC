"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, ScanFace, ZoomIn, ZoomOut, Move } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  RepositionTool — reposisi foto interaktif sebelum analisis AI      */
/*  Drag/pan + zoom (wheel & tombol) + rotate, dengan oval pemandu     */
/*  yang identik dengan mode webcam (ADR-013).                         */
/* ------------------------------------------------------------------ */

const W = 640;
const H = 480;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const ROTATE_RANGE = 30;

/** Geometri oval pemandu — konsisten dengan overlay mode webcam. */
const OVAL = { cx: W / 2, cy: H * 0.46, rx: W * 0.3, ry: H * 0.42 };

interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number; // derajat
}

export interface RepositionToolProps {
  photoDataUrl: string;
  gender?: "male" | "female";
  onConfirm: (snapshotDataUrl: string, width: number, height: number) => void;
  onBack: () => void;
}

export default function RepositionTool({ photoDataUrl, gender, onConfirm, onBack }: RepositionToolProps) {
  const isFemale = gender === "female";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const trRef = useRef<Transform>({ x: W / 2, y: H / 2, scale: 1, rotation: 0 });
  const dragRef = useRef<{ px: number; py: number; moved: boolean } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  const [rotation, setRotation] = useState(0);
  const [scaleLabel, setScaleLabel] = useState(1);
  const [imgReady, setImgReady] = useState(false);

  /* ---- Render loop: gambar + transform + oval pemandu ---- */
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const img = imgRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const t = trRef.current;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#060B14";
    ctx.fillRect(0, 0, W, H);

    if (img) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.scale(t.scale, t.scale);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();
    }

    // Mask gelap di luar oval
    ctx.save();
    ctx.fillStyle = "rgba(6, 11, 20, 0.45)";
    ctx.fillRect(0, 0, W, H);

    // Lubangi oval
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.ellipse(OVAL.cx, OVAL.cy, OVAL.rx, OVAL.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Garis oval pemandu (Pink saat female, Sky Blue saat male)
    ctx.save();
    ctx.strokeStyle = isFemale ? "rgba(244, 114, 182, 0.9)" : "rgba(56, 189, 248, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.ellipse(OVAL.cx, OVAL.cy, OVAL.rx, OVAL.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Garis bantu horizontal mata
    ctx.strokeStyle = isFemale ? "rgba(251, 113, 133, 0.5)" : "rgba(56, 189, 248, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(OVAL.cx - OVAL.rx * 0.7, OVAL.cy - OVAL.ry * 0.1);
    ctx.lineTo(OVAL.cx + OVAL.rx * 0.7, OVAL.cy - OVAL.ry * 0.1);
    ctx.stroke();
    ctx.restore();
  }, [isFemale]);

  /* ---- Muat foto & fit awal ---- */
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      imgRef.current = img;
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      trRef.current = { x: W / 2, y: H / 2, scale: s, rotation: 0 };
      setScaleLabel(Number(s.toFixed(2)));
      setRotation(0);
      setImgReady(true);
      draw();
    };
    img.src = photoDataUrl;
    return () => { active = false; };
  }, [photoDataUrl, draw]);

  useEffect(() => {
    draw();
  }, [draw, rotation]);

  /* ---- Interaksi pointer ---- */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
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
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    dragRef.current = null;
    pinchRef.current = null;
  };

  const zoomBy = (factor: number) => {
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, trRef.current.scale * factor));
    trRef.current.scale = nextScale;
    setScaleLabel(Number(nextScale.toFixed(2)));
    draw();
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08);
  };

  /* ---- Kontrol ---- */
  const setRotationDeg = (deg: number) => {
    trRef.current.rotation = deg;
    setRotation(deg);
    draw();
  };

  const resetTransform = () => {
    const img = imgRef.current;
    if (!img) return;
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    trRef.current = { x: W / 2, y: H / 2, scale: s, rotation: 0 };
    setScaleLabel(Number(s.toFixed(2)));
    setRotation(0);
    draw();
  };

  const confirm = () => {
    const cv = canvasRef.current;
    const img = imgRef.current;
    if (!cv || !img) return;
    const snap = document.createElement("canvas");
    snap.width = W;
    snap.height = H;
    const ctx = snap.getContext("2d");
    if (!ctx) return;
    const t = trRef.current;
    ctx.fillStyle = "#060B14";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.scale, t.scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
    onConfirm(snap.toDataURL("image/jpeg", 0.92), W, H);
  };

  return (
    <div className="w-full space-y-4">
      <p className="text-center text-sm text-[#94A3B8] flex items-center justify-center gap-2">
        <Move className={`w-4 h-4 ${isFemale ? "text-pink-400" : "text-[#38BDF8]"}`} />
        Geser (drag), perbesar (scroll / tombol), dan putar foto hingga{" "}
        <strong className={isFemale ? "text-pink-300" : "text-[#38BDF8]"}>dahi, mata, dan dagu</strong> berada di dalam oval.
      </p>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className={`w-full aspect-[4/3] rounded-3xl border bg-[#060B14] touch-none cursor-grab active:cursor-grabbing shadow-2xl block mx-auto ${
          isFemale ? "border-pink-500/30" : "border-blue-500/30"
        }`}
      />

      <div className="max-w-xl mx-auto space-y-3">
        {/* Rotasi */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#94A3B8] w-14 shrink-0">ROTASI</span>
          <input
            type="range"
            min={-ROTATE_RANGE}
            max={ROTATE_RANGE}
            value={rotation}
            step={1}
            className={`flex-1 ${isFemale ? "accent-pink-500" : "accent-blue-500"}`}
            onChange={(e) => setRotationDeg(Number(e.target.value))}
          />
          <span className={`text-[10px] font-mono w-12 text-right ${isFemale ? "text-pink-300" : "text-[#93C5FD]"}`}>
            {rotation}°
          </span>
          <button
            type="button"
            onClick={resetTransform}
            className={`p-2 rounded-full border transition-colors cursor-pointer ${
              isFemale
                ? "border-pink-500/30 bg-[#180918] hover:bg-pink-600 hover:text-white text-pink-300"
                : "border-blue-500/30 bg-[#0B1528] hover:bg-blue-600 hover:text-white text-[#93C5FD]"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#94A3B8] w-14 shrink-0">ZOOM</span>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.15)}
            className={`p-2 rounded-full border transition-colors cursor-pointer ${
              isFemale
                ? "border-pink-500/30 bg-[#180918] hover:bg-pink-600 hover:text-white text-pink-300"
                : "border-blue-500/30 bg-[#0B1528] hover:bg-blue-600 hover:text-white text-[#93C5FD]"
            }`}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div
            className={`flex-1 h-2 rounded-full overflow-hidden border ${
              isFemale ? "bg-[#140614] border-pink-500/20" : "bg-[#08101E] border-blue-500/20"
            }`}
          >
            <div
              className={`h-full transition-all ${
                isFemale ? "bg-gradient-to-r from-pink-600 to-rose-400" : "bg-gradient-to-r from-blue-600 to-sky-400"
              }`}
              style={{ width: `${Math.min(100, (scaleLabel / MAX_SCALE) * 100)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => zoomBy(1.15)}
            className={`p-2 rounded-full border transition-colors cursor-pointer ${
              isFemale
                ? "border-pink-500/30 bg-[#180918] hover:bg-pink-600 hover:text-white text-pink-300"
                : "border-blue-500/30 bg-[#0B1528] hover:bg-blue-600 hover:text-white text-[#93C5FD]"
            }`}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className={`text-[10px] font-mono w-10 text-right ${isFemale ? "text-pink-300" : "text-[#93C5FD]"}`}>
            {scaleLabel}×
          </span>
        </div>

        {/* Aksi */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className={`flex-1 py-3 rounded-full border font-semibold font-mono text-xs text-white transition-colors cursor-pointer ${
              isFemale
                ? "border-pink-500/30 bg-[#140614] hover:bg-white/10"
                : "border-blue-500/30 bg-[#08101E] hover:bg-white/10"
            }`}
          >
            Ganti Foto
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!imgReady}
            className={`flex-[2] py-3 rounded-full disabled:opacity-50 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              isFemale
                ? "bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 border-pink-400/30 shadow-[0_4px_20px_rgba(236,72,153,0.3)]"
                : "bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 border-blue-400/30"
            }`}
          >
            <ScanFace className="w-4 h-4" />
            Analisis Wajah
          </button>
        </div>
      </div>
    </div>
  );
}
