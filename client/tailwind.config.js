/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#070A0F",
        surface: {
          DEFAULT: "#0F172A",
          50: "#1E293B",
          100: "#0B1120",
          glass: "rgba(15, 23, 42, 0.75)",
        },
        cyber: {
          indigo: "#6366F1",
          rose: "#F43F5E",
          emerald: "#10B981",
          amber: "#F59E0B",
          cyan: "#06B6D4",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "sans-serif"],
        mono: ["var(--font-poppins)", "Poppins", "sans-serif"],
        display: ["var(--font-poppins)", "Poppins", "sans-serif"],
      },
      backgroundImage: {
        "radial-cyber": "radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15), transparent 70%)",
        "radial-rose": "radial-gradient(circle at 100% 100%, rgba(244, 63, 94, 0.12), transparent 60%)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-laser": "scanLaser 2.2s ease-in-out infinite alternate",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.03)" },
        },
        scanLaser: {
          "0%": { top: "5%" },
          "100%": { top: "95%" },
        },
      },
    },
  },
  plugins: [],
};
