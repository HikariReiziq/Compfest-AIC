'use client';

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

/**
 * Bahasa visual indikator status, bergaya panel "Fashion Atelier OS":
 * chip status, bar bersegmen, gauge cincin bertakik, dan gelembung terhubung.
 *
 * Aksen utama lime dipakai untuk keadaan "hidup/aktif"; aksen indigo & amber
 * untuk data biometrik dan rekomendasi AI.
 */

export const LIME = '#C9F73D';
export const INDIGO = '#818CF8';
export const ROSE = '#FB7185';
export const AMBER = '#FBBF24';

/* ---------------------------------------------------------------- */
/* Chip status                                                       */
/* ---------------------------------------------------------------- */

type VarianChip = 'aktif' | 'sinkron' | 'siaga' | 'mati';

const GAYA_CHIP: Record<VarianChip, string> = {
  aktif: 'bg-[#C9F73D] text-[#0B1005] border-transparent',
  sinkron: 'bg-[#151C12] text-[#9FB08C] border-[#232E1C]',
  siaga: 'bg-[#2A1E08] text-[#FBBF24] border-[#3D2C0C]',
  mati: 'bg-[#1A1A1A] text-[#6B6B6B] border-[#262626]',
};

export function ChipStatus({ label, varian = 'sinkron' }: { label: string; varian?: VarianChip }) {
  const kurangiGerak = useReducedMotion();
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold tracking-[0.06em] ${GAYA_CHIP[varian]}`}
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {varian === 'sinkron' && !kurangiGerak && (
        <motion.span
          className="h-1 w-1 rounded-full bg-[#9FB08C]"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {label}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Angka yang menghitung naik                                        */
/* ---------------------------------------------------------------- */

export function Angka({ nilai, durasi = 1.4 }: { nilai: number; durasi?: number }) {
  const kurangiGerak = useReducedMotion();
  const mv = useMotionValue(0);
  const teks = useTransform(mv, (v) => Math.round(v).toLocaleString('id-ID'));

  useEffect(() => {
    if (kurangiGerak) {
      mv.set(nilai);
      return;
    }
    const kontrol = animate(mv, nilai, { duration: durasi, ease: 'easeOut' });
    return () => kontrol.stop();
  }, [nilai, kurangiGerak, mv, durasi]);

  return <motion.span>{teks}</motion.span>;
}

/* ---------------------------------------------------------------- */
/* Bar bersegmen                                                     */
/* ---------------------------------------------------------------- */

/**
 * Meter batang yang tersusun dari takik, bukan bilah mulus — bagian terisi
 * memakai gradasi putih ke lime/aksen sehingga ujungnya terbaca sebagai nilai real-time.
 */
export function BarSegmen({
  rasio,
  segmen = 24,
  tinggi = 22,
  warnaAksen = LIME,
}: {
  rasio: number;
  segmen?: number;
  tinggi?: number;
  warnaAksen?: string;
}) {
  const kurangiGerak = useReducedMotion();
  const terisi = Math.round(segmen * Math.min(1, Math.max(0, rasio)));

  return (
    <div className="flex items-end gap-[2px]" style={{ height: tinggi }} aria-hidden>
      {Array.from({ length: segmen }).map((_, i) => {
        const aktif = i < terisi;
        const warna = aktif ? warnaAksen : '#1E2618';
        return (
          <motion.span
            key={i}
            className="w-[3px] rounded-[1px]"
            style={{ backgroundColor: warna, height: aktif ? '100%' : '50%' }}
            initial={kurangiGerak ? false : { opacity: 0, scaleY: 0.3 }}
            whileInView={{ opacity: 1, scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.28, delay: i * 0.014, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Gauge cincin bertakik                                             */
/* ---------------------------------------------------------------- */

export function Gauge({
  nilai,
  maks,
  label,
  satuan,
  warna = LIME,
  ukuran = 148,
}: {
  nilai: number;
  maks: number;
  label: string;
  satuan: string;
  warna?: string;
  ukuran?: number;
}) {
  const kurangiGerak = useReducedMotion();
  const r = 58;
  const keliling = 2 * Math.PI * r;
  const busur = keliling * 0.75;
  const rasio = Math.min(1, Math.max(0, nilai / maks));

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: ukuran, height: ukuran }}>
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-[135deg]">
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#222A1C"
            strokeWidth="9"
            strokeDasharray="2 5"
            strokeDashoffset="0"
          />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#1A2114"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${busur} ${keliling}`}
          />
          <motion.circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke={warna}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${busur} ${keliling}`}
            initial={kurangiGerak ? false : { strokeDashoffset: busur }}
            whileInView={{ strokeDashoffset: busur * (1 - rasio) }}
            viewport={{ once: true }}
            transition={{ duration: 1.3, ease: [0.16, 0.84, 0.34, 1] }}
            style={kurangiGerak ? { strokeDashoffset: busur * (1 - rasio) } : undefined}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="flex items-baseline gap-1">
            <span
              className="text-[34px] font-extrabold leading-none tracking-[-0.03em] text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Angka nilai={nilai} />
            </span>
            <span className="text-[11px] text-[#7E8C70]" style={{ fontFamily: 'var(--font-mono)' }}>
              {satuan}
            </span>
          </p>
        </div>
      </div>
      <p className="mt-1 text-[10px] tracking-[0.16em] text-[#7E8C70]" style={{ fontFamily: 'var(--font-mono)' }}>
        {label}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Trio gelembung terhubung                                          */
/* ---------------------------------------------------------------- */

export function TrioGelembung({
  items,
}: {
  items: { nilai: number; label: string }[];
}) {
  const kurangiGerak = useReducedMotion();
  return (
    <div className="flex items-center justify-center">
      {items.map((it, i) => {
        const utama = i === 1;
        return (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, scale: 0.86 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
            className={`relative flex aspect-square flex-col items-center justify-center rounded-full ${
              utama ? 'z-10 h-[104px] w-[104px]' : 'h-[88px] w-[88px]'
            } ${i === 1 ? '-mx-3' : ''}`}
            style={
              utama
                ? {
                    background: `radial-gradient(circle at 34% 28%, #E8FF7A, ${LIME} 62%, #9CC420)`,
                    boxShadow: `0 0 34px ${LIME}55`,
                  }
                : { backgroundColor: '#141A10', border: '1px solid #232E1C' }
            }
          >
            {utama && !kurangiGerak && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: `0 0 0 0 ${LIME}55` }}
                animate={{ boxShadow: [`0 0 0 0 ${LIME}44`, `0 0 0 14px ${LIME}00`] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <span
              className={`text-[22px] font-extrabold leading-none tracking-[-0.03em] ${
                utama ? 'text-[#141A10]' : 'text-white'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Angka nilai={it.nilai} />
            </span>
            <span
              className={`mt-1 text-[9px] tracking-[0.12em] ${utama ? 'text-[#3A4A18]' : 'text-[#7E8C70]'}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {it.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Judul panel & Panel Kontainer                                     */
/* ---------------------------------------------------------------- */

export function JudulPanel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[15px] font-extrabold uppercase tracking-[0.14em] text-white"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {children}
    </h3>
  );
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#1B2416] bg-[#080C08]/90 p-6 backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}
