import type { Metadata } from "next";

import "./globals.css";

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
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
