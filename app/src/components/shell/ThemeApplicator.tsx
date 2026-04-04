"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";

const STORAGE_KEY = "underlay-theme";

export function ThemeApplicator() {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  // On mount: read localStorage and sync to store
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
    if (stored && stored !== theme) {
      toggleTheme();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When theme changes: apply to DOM and persist
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme === "dark" ? "dark" : ""
    );
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return null;
}
