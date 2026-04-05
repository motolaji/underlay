"use client";

import { useQuery } from "@tanstack/react-query";

import type { MarketsResponseDto } from "@/types/market";

export function useMarketsQuery(category: string, sort = "volume") {
  return useQuery({
    queryKey: ["markets", category, sort],
    queryFn: async () => {
      const response = await fetch(
        `/api/markets?category=${category}&limit=24&sort=${sort}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch markets.");
      }

      return (await response.json()) as MarketsResponseDto;
    },
    staleTime: sort === "ending_soon" ? 0 : 30_000,
    refetchInterval: sort === "ending_soon" ? 30_000 : false,
  });
}
