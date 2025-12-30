import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Bebas_Neue,
  Playfair_Display,
  Inter,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cinematic fonts for text overlays
const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nyvarra Studio - Cinematic Image Grading in Your Browser",
  description:
    "Professional-grade color grading engine built on WebGL. 32-bit precision, 3D LUTs, Palette Heist, and God Light relighting. All processing happens locally on your device.",
  keywords: [
    "color grading",
    "image editor",
    "cinematic grading",
    "WebGL",
    "3D LUT",
    "film emulation",
    "photo editing",
    "RAW processing",
    "browser-based editor",
    "local processing",
    "privacy-first editor",
  ],
  authors: [{ name: "Nyvarra Studio" }],
  creator: "Nyvarra Studio",
  publisher: "Nyvarra Studio",
  openGraph: {
    title: "Nyvarra Studio - Cinematic Image Grading",
    description:
      "Professional color grading powered by WebGL. God Light relighting, Palette Heist, and cinema-grade optics—running entirely in your browser.",
    url: "https://nyvarra.studio",
    siteName: "Nyvarra Studio",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nyvarra Studio - Cinematic Image Grading",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nyvarra Studio - Cinematic Image Grading",
    description:
      "Professional color grading powered by WebGL. All processing happens locally on your device.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${playfair.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
