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
  onConfirm: (snapshotDataUrl: string, width: number, height: number) => void;
  onBack: () => void;
}

export default function RepositionTool({ photoDataUrl, onConfirm, onBack }: RepositionToolProps) {
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

    // Oval pemandu (tetap tergambar pada snapshot — membantu detektor
    // menemukan wajah terpusat dan tidak mengganggu FaceLandmarker).
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#38BDF8";
    ctx.beginPath();
    ctx.ellipse(OVAL.cx, OVAL.cy, OVAL.rx, OVAL.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Penanda horizon dahi / mata / dagu di dalam oval
    ctx.strokeStyle = "rgba(56,189,248,0.4)";
    ctx.lineWidth = 1.5;
    [0.18, 0.46, 0.74].forEach((f) => {
      const y = OVAL.cy - OVAL.ry + OVAL.ry * 2 * f;
      const halfW = OVAL.rx * Math.sqrt(Math.max(0, 1 - Math.pow((y - OVAL.cy) / OVAL.ry, 2)));
      ctx.beginPath();
      ctx.moveTo(OVAL.cx - halfW * 0.7, y);
      ctx.lineTo(OVAL.cx + halfW * 0.7, y);
      ctx.stroke();
    });
  }, []);

  /* ---- Muat foto & fit awal ---- */
  useEffect(() => {
    setImgReady(false);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Fit awal: tinggi gambar menutupi ~95% tinggi kanvas agar wajah mudah disejajarkan
      const fit = (H * 0.95) / img.naturalHeight;
      trRef.current = { x: W / 2, y: H / 2, scale: fit, rotation: 0 };
      setRotation(0);
      setScaleLabel(Math.round(fit * 100) / 100);
      setImgReady(true);
      draw();
    };
    img.src = photoDataUrl;
  }, [photoDataUrl, draw]);

  useEffect(() => {
    draw();
  }, [draw, rotation]);

  /* ---- Interaksi pointer: drag = pan, dua jari = pinch zoom ---- */
  const canvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = canvasPos(e);
    if (pinchRef.current === null) {
      dragRef.current = { px: p.x, py: p.y, moved: false };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = canvasPos(e);
    if (dragRef.current) {
      const dx = p.x - dragRef.current.px;
      const dy = p.y - dragRef.current.py;
      if (Math.abs(dx) + Math.abs(dy) > 1) dragRef.current.moved = true;
      trRef.current.x += dx;
      trRef.current.y += dy;
      dragRef.current.px = p.x;
      dragRef.current.py = p.y;
      draw();
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
    pinchRef.current = null;
  };

  const zoomBy = (factor: number) => {
    const t = trRef.current;
    t.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
    setScaleLabel(Math.round(t.scale * 100) / 100);
    draw();
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08);
  };

  /* ---- Kontrol ---- */
  const setRotationDeg = (v: number) => {
    trRef.current.rotation = v;
    setRotation(v);
    draw();
  };

  const resetTransform = () => {
    const img = imgRef.current;
    const fit = img ? (H * 0.95) / img.naturalHeight : 1;
    trRef.current = { x: W / 2, y: H / 2, scale: fit, rotation: 0 };
    setRotation(0);
    setScaleLabel(Math.round(fit * 100) / 100);
    draw();
  };

  const confirm = () => {
    const cv = canvasRef.current;
    if (!cv || !imgReady) return;
    draw(); // pastikan frame terakhir konsisten
    onConfirm(cv.toDataURL("image/jpeg", 0.92), W, H);
  };

  return (
    <div className="w-full space-y-4">
      <p className="text-center text-sm text-[#94A3B8] flex items-center justify-center gap-2">
        <Move className="w-4 h-4 text-[#38BDF8]" />
        Geser (drag), perbesar (scroll / tombol), dan putar foto hingga{" "}
        <strong className="text-[#38BDF8]">dahi, mata, dan dagu</strong> berada di dalam oval.
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
        className="w-full aspect-[4/3] rounded-3xl border border-blue-500/30 bg-[#060B14] touch-none cursor-grab active:cursor-grabbing shadow-2xl block mx-auto"
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
            aria-label="Rotasi foto"
            className="flex-1 accent-blue-500"
            onChange={(e) => setRotationDeg(Number(e.target.value))}
          />
          <span className="text-[10px] font-mono text-[#93C5FD] w-12 text-right">
            {rotation}°
          </span>
          <button
            type="button"
            onClick={resetTransform}
            aria-label="Reset posisi"
            title="Reset posisi"
            className="p-2 rounded-full border border-blue-500/30 bg-[#0B1528] hover:bg-blue-600 hover:text-white text-[#93C5FD] transition-colors cursor-pointer"
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
            aria-label="Perkecil"
            className="p-2 rounded-full border border-blue-500/30 bg-[#0B1528] hover:bg-blue-600 hover:text-white text-[#93C5FD] transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="flex-1 h-2 rounded-full bg-[#08101E] overflow-hidden border border-blue-500/20">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all"
              style={{ width: `${Math.min(100, (scaleLabel / MAX_SCALE) * 100)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => zoomBy(1.15)}
            aria-label="Perbesar"
            className="p-2 rounded-full border border-blue-500/30 bg-[#0B1528] hover:bg-blue-600 hover:text-white text-[#93C5FD] transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-[#93C5FD] w-10 text-right">
            {scaleLabel}×
          </span>
        </div>

        {/* Aksi */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3 rounded-full border border-blue-500/30 bg-[#08101E] hover:bg-white/10 font-semibold font-mono text-xs text-white transition-colors cursor-pointer"
          >
            Ganti Foto
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!imgReady}
            className="flex-[2] py-3 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 disabled:opacity-50 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 border border-blue-400/30 transition-all cursor-pointer"
          >
            <ScanFace className="w-4 h-4" />
            Analisis Wajah
          </button>
        </div>
      </div>
    </div>
  );
}
