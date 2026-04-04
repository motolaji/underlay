import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type OgStatusResponse =
  | {
      configured: false;
      reason: string;
      services: null;
    }
  | {
      configured: true;
      services: Array<{ provider: string; model: string; serviceType: string }>;
      storageIndexer: string;
    };

export async function GET(): Promise<NextResponse<OgStatusResponse>> {
  const rpcUrl = process.env.OG_EVM_RPC;
  const indexerRpc = process.env.OG_INDEXER_RPC;
  const privateKey = process.env.OG_PRIVATE_KEY;

  if (!rpcUrl || !indexerRpc || !privateKey) {
    return NextResponse.json({
      configured: false,
      reason: "OG_EVM_RPC, OG_INDEXER_RPC, and OG_PRIVATE_KEY must all be set.",
      services: null,
    });
  }

  try {
    const [brokerModule, ethersModule] = await Promise.all([
      import("@0glabs/0g-serving-broker"),
      import("ethers"),
    ]);

    const provider = new ethersModule.JsonRpcProvider(rpcUrl);
    const signer = new ethersModule.Wallet(privateKey, provider);
    const broker = await brokerModule.createZGComputeNetworkBroker(signer);
    const services = await broker.inference.listService();

    return NextResponse.json({
      configured: true,
      services: services.map(
        (s: { provider: string; model: string; serviceType: string }) => ({
          provider: s.provider,
          model: s.model,
          serviceType: s.serviceType,
        })
      ),
      storageIndexer: indexerRpc,
    });
  } catch (error) {
    return NextResponse.json({
      configured: false,
      reason: error instanceof Error ? error.message : "Failed to connect to 0G network.",
      services: null,
    });
  }
}
