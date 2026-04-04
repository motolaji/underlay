import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  decodeAbiParameters,
  encodePacked,
  http,
  keccak256,
  parseAbi,
  stringToHex,
} from "viem";
import { baseSepolia } from "viem/chains";

const worldRouterAbi = parseAbi([
  "function verifyProof(uint256 root,uint256 groupId,uint256 signalHash,uint256 nullifierHash,uint256 externalNullifierHash,uint256[8] proof) external view",
]);

const BASE_WORLD_ID_ROUTER =
  "0x42FF98C4E85212a5D31358ACbFe76a621b50fC02" as const;
const WORLD_GROUP_ID = 1n;
const ROOT_PENDING_SELECTOR = "0xddae3b71";

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

    const [proof] = decodeAbiParameters(
      [{ type: "uint256[8]" }],
      responseItem.proof
    );

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(
        process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ??
          baseSepolia.rpcUrls.default.http[0]
      ),
    });

    try {
      await publicClient.readContract({
        address: BASE_WORLD_ID_ROUTER,
        abi: worldRouterAbi,
        functionName: "verifyProof",
        args: [
          BigInt(responseItem.merkle_root),
          WORLD_GROUP_ID,
          hashToField(body.walletAddress),
          BigInt(responseItem.nullifier),
          buildExternalNullifier(appId, body.result.action ?? "place-position"),
          proof,
        ],
      });

      return NextResponse.json({
        ready: true,
        verified: true,
      });
    } catch (error) {
      const errorText = extractErrorText(error);

      if (
        errorText.includes(ROOT_PENDING_SELECTOR) ||
        errorText.includes("NonExistentRoot")
      ) {
        return NextResponse.json({
          ready: false,
          verified: true,
          code: "root_pending",
          error:
            "World ID proof received. Waiting for Base Sepolia root sync. Retry will continue automatically.",
        });
      }

      return NextResponse.json(
        {
          ready: false,
          verified: true,
          code: "onchain_preflight_failed",
          error: "World ID proof is valid, but onchain preflight still failed.",
          details: errorText,
        },
        { status: 400 }
      );
    }
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

function hashToField(value: `0x${string}` | string) {
  const input = value.startsWith("0x")
    ? (value as `0x${string}`)
    : stringToHex(value);
  return BigInt(keccak256(input)) >> 8n;
}

function buildExternalNullifier(appId: string, action: string) {
  const appIdField = hashToField(appId);
  const packed = encodePacked(["uint256", "string"], [appIdField, action]);

  return hashToField(packed);
}

function extractErrorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    return [
      error.message,
      extractErrorText((error as { cause?: unknown }).cause),
      JSON.stringify(error),
    ]
      .filter(Boolean)
      .join(" ");
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
