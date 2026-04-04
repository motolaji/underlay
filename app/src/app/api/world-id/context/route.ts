import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

export async function GET() {
  const rpId = process.env.RP_ID;
  const signingKey = process.env.WORLD_RP_SIGNING_KEY;

  if (!rpId || !signingKey) {
    return NextResponse.json(
      {
        error: "World ID RP context is not configured.",
      },
      { status: 503 }
    );
  }

  const signature = signRequest(
    process.env.NEXT_PUBLIC_WORLD_ACTION_ID ?? "place-position",
    signingKey,
    300
  );

  return NextResponse.json({
    rp_id: rpId,
    nonce: signature.nonce,
    created_at: signature.createdAt,
    expires_at: signature.expiresAt,
    signature: signature.sig,
  });
}
