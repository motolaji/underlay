import { NextRequest, NextResponse } from "next/server";

const CLOB_API_BASE = "https://clob.polymarket.com";

// GET /api/markets/titles?conditionId=0x...&conditionId=0x...
// Returns { "0x...": "Market question title", ... }
export async function GET(request: NextRequest) {
  const conditionIds = request.nextUrl.searchParams.getAll("conditionId");

  if (conditionIds.length === 0) {
    return NextResponse.json({});
  }

  const results = await Promise.allSettled(
    conditionIds.map(async (conditionId) => {
      const res = await fetch(
        `${CLOB_API_BASE}/markets/${conditionId}`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { question?: string };
      const question = data?.question ?? null;
      return question ? { conditionId, question } : null;
    })
  );

  const titles: Record<string, string> = {};
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      titles[result.value.conditionId] = result.value.question;
    }
  }

  return NextResponse.json(titles);
}
