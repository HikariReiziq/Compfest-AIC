import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import MainAppWrapper from '@/components/MainAppWrapper';

/**
 * Server shell. Font sengaja dimuat di sini, bukan di dalam komponen klien:
 * `next/font` yang dipanggil dari komponen bertanda 'use client' tidak ikut
 * ter-render saat SSR, sehingga markup server dan klien berbeda dan React
 * melaporkan hydration mismatch.
 *
 * Tiga muka huruf:
 * - Archivo        : judul, grotesque padat dengan tracking rapat (--font-display)
 * - IBM Plex Sans  : teks isi, dirancang untuk antarmuka teknis editorial (--font-sans)
 * - IBM Plex Mono  : angka telemetri, koordinat, dan label instrumen (--font-mono)
 */
const display = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export default function Home() {
  return (
    <MainAppWrapper
      fontClass={`${display.variable} ${sans.variable} ${mono.variable}`}
    />
  );
}
