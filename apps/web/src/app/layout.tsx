import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

/**
 * Tipografía global Piel360 (admin / doctor / patient / landings).
 * Plus Jakarta Sans: sans moderna del backoffice (más expresiva que Manrope/system).
 */
const fontSans = Plus_Jakarta_Sans({
  variable: "--font-piel360-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Piel360",
  description:
    "Plataforma de Análisis Estético, Biotipo, Fototipo y Diagnostico de apoyo Dermatológico asistido con Inteligencia Artificial",
  // El icono de la pestaña sale de `app/favicon.ico` (convención de Next).
  // Antes se forzaba aquí el logo horizontal, que a 16px era ilegible.
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
      <body className={`${fontSans.className} flex min-h-full flex-col`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
