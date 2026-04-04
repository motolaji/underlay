"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { cookieToInitialState, type Config, WagmiProvider } from "wagmi";
import { initializeAppKit, wagmiConfig } from "@/lib/wagmi";
import { ThemeApplicator } from "@/components/shell/ThemeApplicator";

initializeAppKit();

type AppProvidersProps = {
  children: ReactNode;
  cookies: string | null;
};

export function AppProviders({ children, cookies }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const initialState = cookieToInitialState(wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <ThemeApplicator />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
