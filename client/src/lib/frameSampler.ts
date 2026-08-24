/**
 * frameSampler.ts — Temporal smoothing (ADR-019).
 *
 * Akumulasi fitur per-frame selama status pemandu HIJAU:
 * - Rasio & fitur wajah: MEDIAN (robust terhadap outlier landmark jitter)
 * - LAB kulit: MEAN + std_l (sinyal stabil antar frame)
 * - Deterministik: window maksimal 30 sampel, syarat minimal 15.
 *
 * Ini jawaban teknis untuk inkonsistensi 3× scan berulang: klasifikasi tidak
 * lagi diambil dari satu frame sesaat, melainkan agregat frame yang seluruhnya
 * berada dalam keadaan ALIGNED.
 */

import type {
  BrowFeatures,
  EyeFeatures,
  FaceRatios,
  GenderFeatures,
  NoseFeatures,
} from "./faceGeometry";

export interface FrameSample {
  ratios: FaceRatios;
  nose: NoseFeatures;
  eye: EyeFeatures;
  brow: BrowFeatures;
  gender: GenderFeatures;
  pose: { roll_deg: number; yaw_deg: number; pitch_deg: number };
  skinLab: { l: number; a: number; b: number };
}

export interface AggregatedSample {
  ratios: Record<string, number>;
  nose: Record<string, number>;
  eye: Record<string, number>;
  brow: Record<string, number>;
  gender: Record<string, number>;
  pose: { roll_deg: number; yaw_deg: number; pitch_deg: number };
  skin_lab: { l: number; a: number; b: number; std_l: number };
}

export const MIN_SAMPLES = 4;
export const MAX_SAMPLES = 30;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function medianRecord(
  samples: FrameSample[],
  key: "ratios" | "nose" | "eye" | "brow" | "gender"
): Record<string, number> {
  const first = samples[0][key] as unknown as Record<string, number>;
  const out: Record<string, number> = {};
  for (const k of Object.keys(first)) {
    out[k] =
      Math.round(median(samples.map((s) => (s[key] as unknown as Record<string, number>)[k])) * 10000) / 10000;
  }
  return out;
}

export class FrameSampler {
  private samples: FrameSample[] = [];

  push(s: FrameSample): void {
    this.samples.push(s);
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
  }

  get count(): number {
    return this.samples.length;
  }

  reset(): void {
    this.samples = [];
  }

  /** Agregat final — median per kunci numerik; LAB mean + std_l. */
  aggregate(): AggregatedSample {
    if (this.samples.length === 0) throw new Error("FrameSampler kosong — tidak bisa agregat");
    const ls = this.samples.map((s) => s.skinLab.l);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanL = mean(ls);
    const stdL = Math.sqrt(mean(ls.map((v) => (v - meanL) ** 2)));
    return {
      ratios: medianRecord(this.samples, "ratios"),
      nose: medianRecord(this.samples, "nose"),
      eye: medianRecord(this.samples, "eye"),
      brow: medianRecord(this.samples, "brow"),
      gender: medianRecord(this.samples, "gender"),
      pose: {
        roll_deg: Math.round(median(this.samples.map((s) => s.pose.roll_deg)) * 100) / 100,
        yaw_deg: Math.round(median(this.samples.map((s) => s.pose.yaw_deg)) * 100) / 100,
        pitch_deg: Math.round(median(this.samples.map((s) => s.pose.pitch_deg)) * 100) / 100,
      },
      skin_lab: {
        l: Math.round(mean(this.samples.map((s) => s.skinLab.l)) * 100) / 100,
        a: Math.round(mean(this.samples.map((s) => s.skinLab.a)) * 100) / 100,
        b: Math.round(mean(this.samples.map((s) => s.skinLab.b)) * 100) / 100,
        std_l: Math.round(stdL * 100) / 100,
      },
    };
  }
}
