import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Mono, Inter, Syne } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
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

const themeInitScript = `
(() => {
  try {
    const key = "underlay-theme";
    const stored = localStorage.getItem(key);
    const theme = stored === "dark" || stored === "light"
      ? stored
      : "light";
    const root = document.documentElement;

    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }

    root.style.colorScheme = theme;
    localStorage.setItem(key, theme);
  } catch (error) {
    // Ignore storage errors and keep the default theme.
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookies = headers().get("cookie");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>
        <AppProviders cookies={cookies}>{children}</AppProviders>
        <Toaster position="bottom-center" theme="dark" richColors />
      </body>
    </html>
  );
}
