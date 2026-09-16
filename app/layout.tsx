import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { TutorProvider } from "@/components/tutor/TutorContext";
import { TutorMount } from "@/components/tutor/TutorPanel";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoDraft AI — Engineering Drawing Visualizer",
  description: "Turn engineering drawing questions into interactive 3D solids and mathematically generated orthographic projections.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-ink antialiased">
        <TutorProvider>
          {children}
          <TutorMount />
        </TutorProvider>
        <Analytics />
      </body>
    </html>
  );
}
