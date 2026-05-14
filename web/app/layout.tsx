import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, EB_Garamond, JetBrains_Mono, UnifrakturCook } from "next/font/google";
import { Providers } from "@/lib/providers";
import { Navbar } from "@/lib/navbar";
import { Footer } from "@/lib/footer";
import { StealthRecoveryBanner } from "@/lib/stealth-recovery-banner";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const body = EB_Garamond({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const ceremonial = UnifrakturCook({
  variable: "--font-ceremonial",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PragueConnect — by the hand of",
  description:
    "A peer-to-peer marketplace for human favors in Prague. Reputation belongs to the human, not the platform.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "PragueConnect",
    description: "By the hand of — Prague's sealed marketplace.",
    siteName: "PragueConnect",
    images: [{ url: "/logo.png", width: 1536, height: 1024, alt: "PragueConnect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PragueConnect",
    description: "By the hand of — Prague's sealed marketplace.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F4ECD8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} ${ceremonial.variable}`}
    >
      <body>
        <Providers>
          <Navbar />
          <StealthRecoveryBanner />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
