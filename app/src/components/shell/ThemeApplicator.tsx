"use client";

import { useEffect, useLayoutEffect } from "react";
import { useUiStore } from "@/stores/uiStore";

const STORAGE_KEY = "underlay-theme";
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ThemeApplicator() {
  const theme = useUiStore((state) => state.theme);

  // When theme changes: apply to DOM and persist
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }

    root.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return null;
}
