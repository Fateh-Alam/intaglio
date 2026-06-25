import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Bebas_Neue,
  Playfair_Display,
  Inter,
} from "next/font/google";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import { BRAND } from "./lib/brand";
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

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.domain),
  title: "Ormond - A Timeless Digital Darkroom",
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
    title: "Ormond - A Timeless Digital Darkroom",
    description: BRAND.shortDescription,
    url: BRAND.domain,
    siteName: BRAND.name,
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Ormond - A Timeless Digital Darkroom",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ormond - A Timeless Digital Darkroom",
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${playfair.variable} ${inter.variable} antialiased`}
      >
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
