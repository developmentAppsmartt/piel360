import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

/**
 * Tipografía global Piel360 (admin / doctor / patient / landings).
 * Manrope: sans geométrica moderna alineada al dashboard de referencia.
 */
const fontSans = Manrope({
  variable: "--font-piel360-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Piel360",
  description: "Plataforma de diagnóstico dermatológico asistido por IA",
  icons: { icon: "/logo-piel360.webp" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
