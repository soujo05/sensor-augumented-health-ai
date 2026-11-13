import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Health Risk Scoring",
  description: "Explainable cardiovascular health risk assessment",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
