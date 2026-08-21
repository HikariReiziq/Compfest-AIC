import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="id" className="dark">
      <body className="bg-background text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
