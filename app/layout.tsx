import type { Metadata } from "next";

import {
  Archivo,
  IBM_Plex_Mono,
  Instrument_Serif,
} from "next/font/google";

import "./globals.css";

/*
 * Las tres voces de la marca del CRM (sistema de diseño de Vocero):
 * Archivo para la interfaz, Instrument Serif para acentos editoriales
 * e IBM Plex Mono para etiquetas y cifras. next/font las descarga en
 * BUILD y las sirve self-hosted (sin CDN en runtime).
 */

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "Rafael Allende | Inteligencia de Cartera",

  description:
    "Cockpit ejecutivo de cartera, ventas, retención y crecimiento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${instrumentSerif.variable} ${plexMono.variable}`}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
