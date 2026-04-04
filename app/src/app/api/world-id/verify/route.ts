import { NextRequest, NextResponse } from "next/server";

type VerifyRequestBody = {
  walletAddress: `0x${string}`;
  result: {
    protocol_version: "3.0" | "4.0";
    nonce: string;
    action?: string;
    action_description?: string;
    environment?: string;
    responses: Array<{
      identifier: string;
      proof: `0x${string}`;
      merkle_root: `0x${string}`;
      nullifier: `0x${string}`;
      signal_hash?: `0x${string}`;
    }>;
  };
};

export async function POST(request: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID;
  const rpId = process.env.RP_ID;

  if (!appId || !rpId) {
    return NextResponse.json(
      { error: "World app ID or RP ID is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as VerifyRequestBody;
    const responseItem = body.result.responses[0];

    if (!responseItem || body.result.protocol_version !== "3.0") {
      return NextResponse.json(
        {
          ready: false,
          verified: false,
          code: "proof_format_unsupported",
          error:
            "Only legacy 3.0 World ID proofs are supported by the current onchain path.",
        },
        { status: 400 }
      );
    }

    const verificationResponse = await fetch(
      `https://developer.world.org/api/v4/verify/${rpId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body.result),
      }
    );

    const verificationBody = await verificationResponse.json();

    if (!verificationResponse.ok) {
      return NextResponse.json(
        {
          ready: false,
          verified: false,
          code: verificationBody.code ?? "verification_failed",
          error:
            verificationBody.detail ??
            verificationBody.error ??
            "World proof verification failed.",
        },
        { status: 400 }
      );
    }

    // World Developer API confirmed the proof is valid.
    // Onchain root sync on Base Sepolia testnet is unreliable and the gate is
    // disabled on this deployment, so we accept the proof as ready immediately.
    return NextResponse.json({ ready: true, verified: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "World verification failed.",
      },
      { status: 400 }
    );
  }
}
