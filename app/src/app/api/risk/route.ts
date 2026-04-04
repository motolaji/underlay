import { NextRequest, NextResponse } from "next/server";

import { assessRisk } from "@/lib/server/risk-engine";
import type { RiskAssessmentRequestDto } from "@/types/dto";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as RiskAssessmentRequestDto;
    const assessment = await assessRisk(payload);

    return NextResponse.json(assessment);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Risk assessment failed.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      }
    );
  }
}
