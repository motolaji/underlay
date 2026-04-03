/* eslint-disable no-var */

import { createStorage, cookieStorage, http } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import { baseSepolia } from "@reown/appkit/networks";

const FALLBACK_PROJECT_ID = "00000000000000000000000000000000";

export const reownProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";
export const reownConfigured = reownProjectId.length > 0;
export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const appMetadata = {
  name: "Underlay",
  description:
    "The onchain risk vault that lets anyone be the house for multi-outcome positions.",
  url: appUrl,
  icons: ["https://underlay.app/icon.png"],
};

export const networks = [baseSepolia] as const;

export const wagmiAdapter = new WagmiAdapter({
  networks: [...networks],
  projectId: reownConfigured ? reownProjectId : FALLBACK_PROJECT_ID,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ??
        baseSepolia.rpcUrls.default.http[0]
    ),
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

declare global {
  var __underlayAppKitInitialized: boolean | undefined;
}

export function initializeAppKit() {
  if (!reownConfigured || globalThis.__underlayAppKitInitialized) {
    return;
  }

  createAppKit({
    adapters: [wagmiAdapter],
    projectId: reownProjectId,
    networks: [...networks],
    defaultNetwork: baseSepolia,
    metadata: appMetadata,
  });

  globalThis.__underlayAppKitInitialized = true;
}
