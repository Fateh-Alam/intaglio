import type { Metadata } from "next";
import { SerwistProvider } from "@serwist/turbopack/react";
import {
  Geist,
  Geist_Mono,
  Bebas_Neue,
  Inter,
  Instrument_Serif,
  Playfair_Display,
} from "next/font/google";
import { BRAND } from "./lib/brand";
import { ColophonNote } from "./components/ColophonNote";
import SerwistUpdatePrompt from "./components/SerwistUpdatePrompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Kept for existing text-overlay presets.
const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Display serif for landing-page headlines only.
const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  subsets: ["latin"],
});

// Editorial serif for text-overlay presets.
const playfairDisplay = Playfair_Display({
  weight: ["400", "700"],
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.domain),
  title: "Etch — A Precision-Machined Digital Darkroom",
  description: BRAND.shortDescription,
  keywords: [
    "digital darkroom",
    "photo editing",
    "photography workflow",
    "local-first editor",
    "look recipes",
    "photo archive",
    "film emulation",
    "browser photo editor",
    "privacy-first photography",
  ],
  authors: [{ name: BRAND.author }],
  creator: BRAND.author,
  publisher: BRAND.author,
  openGraph: {
    title: "Etch — A Precision-Machined Digital Darkroom",
    description: BRAND.shortDescription,
    url: BRAND.domain,
    siteName: BRAND.name,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Etch — A Precision-Machined Digital Darkroom",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Etch — A Precision-Machined Digital Darkroom",
    description: BRAND.shortDescription,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    colophon: "Edition of one · /humans.txt",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={instrumentSerif.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${inter.variable} ${playfairDisplay.variable} antialiased`}
      >
        <SerwistProvider
          swUrl="/serwist/sw.js"
          // The desktop app ships its files locally, so it needs no service worker.
          register={process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ETCH_TARGET !== "desktop"}
          cacheOnNavigation
          reloadOnOnline={false}
        >
          <SerwistUpdatePrompt />
          <ColophonNote />
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
