"use client";

import { useQuery } from "@tanstack/react-query";

import type { MarketsResponseDto } from "@/types/market";

export function useMarketsQuery(category: string) {
  return useQuery({
    queryKey: ["markets", category],
    queryFn: async () => {
      const response = await fetch(
        `/api/markets?category=${category}&limit=24`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch markets.");
      }

      return (await response.json()) as MarketsResponseDto;
    },
    staleTime: 30_000,
  });
}
