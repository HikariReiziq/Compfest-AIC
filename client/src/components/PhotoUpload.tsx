"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, AlertCircle, ImageIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  PhotoUpload — validasi ketat + drag-and-drop                       */
/*  PNG / JPG / JPEG, maks 8 MB, verifikasi magic bytes (anti-rename)  */
/* ------------------------------------------------------------------ */

const MAX_BYTES = 8 * 1024 * 1024;
const MIN_SHORT_SIDE = 100;
const MIN_LONG_SIDE = 200;

type SniffedFormat = "png" | "jpeg";

/** Deteksi format sesungguhnya dari byte awal file (bukan sekadar ekstensi). */
async function sniffFormat(dataUrl: string): Promise<SniffedFormat | null> {
  const res = await fetch(dataUrl);
  const buf = new Uint8Array(await res.arrayBuffer()).subarray(0, 4);
  // PNG: 89 50 4E 47 | JPEG: FF D8 FF
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = dataUrl;
  });
}

export interface PhotoUploadProps {
  subcategory?: "glasses" | "hats" | "shirts" | string;
  onPhotoLoaded: (dataUrl: string, width: number, height: number) => void;
}

export default function PhotoUpload({ onPhotoLoaded, subcategory }: PhotoUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isBody = subcategory === "shirts";

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!["png", "jpg", "jpeg"].includes(ext)) {
          setError("Format harus PNG, JPG, atau JPEG.");
          return;
        }
        if (file.size > MAX_BYTES) {
          setError("Ukuran foto maksimal 8 MB.");
          return;
        }
        const dataUrl = await readFileAsDataUrl(file);
        if ((await sniffFormat(dataUrl)) === null) {
          setError("File bukan PNG/JPEG yang valid (terdeteksi konten tidak sesuai ekstensi).");
          return;
        }
        const img = await decodeImage(dataUrl);
        const shortSide = Math.min(img.naturalWidth, img.naturalHeight);
        const longSide = Math.max(img.naturalWidth, img.naturalHeight);
        if (shortSide < MIN_SHORT_SIDE || longSide < MIN_LONG_SIDE) {
          setError(`Resolusi foto terlalu kecil (${img.naturalWidth}×${img.naturalHeight}). Minimal sisi panjang ${MIN_LONG_SIDE}px.`);
          return;
        }
        onPhotoLoaded(dataUrl, img.naturalWidth, img.naturalHeight);
      } catch {
        setError("Gagal membaca file. Coba foto lain.");
      } finally {
        setIsProcessing(false);
      }
    },
    [onPhotoLoaded]
  );

  return (
    <div className="w-full space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={isBody ? "Unggah foto tubuh" : "Unggah foto wajah"}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/5 bg-[#0B1528]/90 backdrop-blur-xl"
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-[#071120] border border-blue-500/20 flex items-center justify-center">
          {isProcessing ? (
            <Upload className="w-7 h-7 text-[#38BDF8] animate-pulse" />
          ) : (
            <ImageIcon className="w-7 h-7 text-[#38BDF8]" />
          )}
        </div>
        <span className="font-semibold text-white">
          {isProcessing
            ? "Memvalidasi foto..."
            : isBody
            ? "Unggah Foto Tubuh & Torso"
            : "Unggah Foto Wajah"}
        </span>
        <span className="text-xs text-[#94A3B8] text-center max-w-xs leading-relaxed">
          Tarik &amp; lepas foto ke sini, atau klik untuk memilih · PNG / JPG / JPEG · maks 8 MB · foto
          {isBody ? " tubuh bagian atas (bahu & dada)" : " frontal wajah"} dengan pencahayaan merata
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = ""; // izinkan memilih file yang sama lagi
        }}
      />

      {error && (
        <p className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
