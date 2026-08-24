import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "COBA — Smart AI & AR Fashion Style Recommendation Engine",
  description: "AI-driven personal style discovery, undertone profiling, and 3D WebGL AR try-on for Indonesian fashion commerce.",
  keywords: ["AI Fashion", "AR Try-On", "Style Recommendation", "Undertone Analysis", "Smart Commerce"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`dark ${poppins.variable}`}>
      <body className={`${poppins.className} bg-background text-slate-100 min-h-screen selection:bg-blue-600 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
