import type { Metadata } from "next";
import { SerwistProvider } from "@serwist/turbopack/react";
import {
  Geist,
  Geist_Mono,
  Bebas_Neue,
  Inter,
  Instrument_Serif,
} from "next/font/google";
import { BRAND } from "./lib/brand";
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

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.domain),
  title: "Intaglio - A Precision-Machined Digital Darkroom",
  description: BRAND.shortDescription,
  keywords: [
    "digital darkroom",
    "photo editing",
    "photography workflow",
    "local-first editor",
    "print recipes",
    "photo archive",
    "film emulation",
    "browser photo editor",
    "privacy-first photography",
  ],
  authors: [{ name: BRAND.author }],
  creator: BRAND.author,
  publisher: BRAND.author,
  openGraph: {
    title: "Intaglio - A Precision-Machined Digital Darkroom",
    description: BRAND.shortDescription,
    url: BRAND.domain,
    siteName: BRAND.name,
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Intaglio - A Precision-Machined Digital Darkroom",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Intaglio - A Precision-Machined Digital Darkroom",
    description: BRAND.shortDescription,
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={instrumentSerif.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${inter.variable} antialiased`}
      >
        <SerwistProvider
          swUrl="/serwist/sw.js"
          register={process.env.NODE_ENV === "production"}
          cacheOnNavigation
          reloadOnOnline={false}
        >
          <SerwistUpdatePrompt />
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
