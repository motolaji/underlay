"use client";

import { useState } from "react";
import {
  IDKitRequestWidget,
  deviceLegacy,
  type IDKitResult,
  type RpContext,
  type ResponseItemV3,
} from "@worldcoin/idkit";
import { decodeAbiParameters, parseAbiParameters } from "viem";

import type { WorldIdProof } from "@/types/domain";

type WorldIdVerifyButtonProps = {
  walletAddress: `0x${string}`;
  onVerified: (proof: WorldIdProof) => void;
};

export function WorldIdVerifyButton({
  walletAddress,
  onVerified,
}: WorldIdVerifyButtonProps) {
  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID as
    | `app_${string}`
    | undefined;
  const action = process.env.NEXT_PUBLIC_WORLD_ACTION_ID ?? "place-position";
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function prepareAndOpen() {
    if (!appId) {
      setError("NEXT_PUBLIC_WORLD_APP_ID is not configured.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/world-id/context", {
        cache: "no-store",
      });
      const body = (await response.json()) as RpContext | { error?: string };

      if (!response.ok || "error" in body) {
        throw new Error(
          (body as { error?: string }).error ?? "World ID context unavailable."
        );
      }

      setRpContext(body as RpContext);
      setOpen(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "World ID setup failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSuccess(result: IDKitResult) {
    const response = result.responses[0] as ResponseItemV3 | undefined;

    if (!response || result.protocol_version !== "3.0") {
      setError(
        "This verification returned a proof format that is not yet wired to the current onchain path. Please retry in the desktop browser flow."
      );
      return;
    }

    setLoading(true);
    setStatus("Verifying proof...");

    fetch("/api/world-id/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, result }),
    })
      .then((res) => res.json())
      .then((body: { ready?: boolean; verified?: boolean; code?: string; error?: string }) => {
        if (body.ready) {
          const [proof] = decodeAbiParameters(
            parseAbiParameters("uint256[8]"),
            response.proof as `0x${string}`
          );

          onVerified({
            root: BigInt(response.merkle_root),
            nullifierHash: BigInt(response.nullifier),
            proof: [...proof] as [
              bigint, bigint, bigint, bigint,
              bigint, bigint, bigint, bigint
            ],
          });

          setStatus("World ID proof verified.");
          setOpen(false);
        } else {
          setError(body.error ?? "World ID verification failed.");
          setStatus(null);
        }
      })
      .catch((nextError: unknown) => {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "World ID verification failed."
        );
        setStatus(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={prepareAndOpen}
        disabled={loading || !walletAddress}
        className="w-full border border-[color:var(--border-default)] py-3 text-sm font-medium text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Verifying..." : "Verify with World ID"}
      </button>

      {error && (
        <p className="text-xs text-[color:var(--risk-high)]">{error}</p>
      )}
      {status && (
        <p className="text-xs text-[color:var(--text-secondary)]">{status}</p>
      )}

      {appId && rpContext ? (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={appId}
          action={action}
          action_description="Verify identity to place a high-stake position"
          rp_context={rpContext}
          allow_legacy_proofs={true}
          preset={deviceLegacy({ signal: walletAddress })}
          onSuccess={handleSuccess}
          onError={(errorCode) => {
            setError(`World ID error: ${errorCode}`);
          }}
        />
      ) : null}
    </div>
  );
}
