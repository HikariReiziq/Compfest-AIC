'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Radio, ArrowRight } from 'lucide-react';
import { LIME, INDIGO } from '@/components/landing/indicators';

/**
 * Bar status tetap di bawah layar, meniru docking runway & luxury fashion atelier command bar.
 *
 * Dimuat lewat dynamic(..., { ssr: false }) untuk menghindari hydration mismatch jam dinding.
 */
export default function BarBawah({
  tampil = true,
  onOpenStudio,
}: {
  tampil?: boolean;
  onOpenStudio?: () => void;
}) {
  const [jam, setJam] = useState('--:--');

  useEffect(() => {
    const perbarui = () =>
      setJam(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    perbarui();
    const t = setInterval(perbarui, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      aria-hidden={!tampil}
      animate={{ opacity: tampil ? 1 : 0, y: tampil ? 0 : 26 }}
      initial={false}
      transition={{ duration: 0.4, ease: [0.16, 0.84, 0.34, 1] }}
      className={`fixed inset-x-0 bottom-0 z-40 hidden justify-center px-5 pb-5 md:flex ${
        tampil ? 'pointer-events-none' : 'pointer-events-none invisible'
      }`}
    >
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-[#232E1C] bg-[#080C08]/92 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,.75)] backdrop-blur-2xl"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs"
          style={{ backgroundColor: LIME, color: '#0B1005' }}
        >
          <Radio className="h-4 w-4" />
        </span>
        <span className="flex items-center gap-1.5 rounded-xl bg-[#12190E] px-3 py-1.5 text-[11px] text-[#C4D3B4]">
          <MapPin className="h-3 w-3 text-[#7E8C70]" />
          Indonesia • Tropis Melanin
        </span>
        <span className="flex items-center gap-1.5 rounded-xl bg-[#12190E] px-3 py-1.5 text-[11px] text-[#C4D3B4]">
          <Clock className="h-3 w-3 text-[#7E8C70]" />
          {jam} WIB
        </span>
        <span className="hidden items-center gap-1.5 rounded-xl bg-[#12190E] px-3 py-1.5 text-[11px] text-[#7E8C70] lg:flex">
          ENGINE: RANDOM FOREST + MONK CIELAB
        </span>
        <span
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold"
          style={{ backgroundColor: `${LIME}22`, color: LIME, border: `1px solid ${LIME}44` }}
        >
          <Radio className="h-3 w-3 animate-pulse text-[#C9F73D]" />
          60 FPS REALTIME
        </span>

        {onOpenStudio && (
          <button
            type="button"
            onClick={onOpenStudio}
            className="group ml-1 flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-[11px] font-bold tracking-wider transition-all hover:brightness-110 cursor-pointer shadow-md"
            style={{ backgroundColor: LIME, color: '#0B1005' }}
          >
            FITTING VIRTUAL
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
