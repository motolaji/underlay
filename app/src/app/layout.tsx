import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Mono, Inter, Syne } from "next/font/google";
import { AppProviders } from "@/providers/AppProviders";
import "./globals.css";

const display = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Underlay",
  description:
    "Community-owned risk underwriting infrastructure for multi-outcome positions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookies = headers().get("cookie");

  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>
        <AppProviders cookies={cookies}>{children}</AppProviders>
      </body>
    </html>
  );
}
