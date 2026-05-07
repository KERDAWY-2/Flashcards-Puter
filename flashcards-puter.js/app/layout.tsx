import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flashcards",
  description: "A minimalist AI-assisted flashcards app powered by Puter.js.",
};

// Viewport is split out per Next 14 conventions; the `viewport-fit=cover`
// + theme-color combo gives us a tighter, app-like look on mobile.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/*
          Puter.js is browser-only. We load the CDN build with `beforeInteractive`
          so `window.puter` is available the moment React boots, avoiding a
          flash of empty state on the deck list.
        */}
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
