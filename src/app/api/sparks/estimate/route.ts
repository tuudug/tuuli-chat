import { NextResponse } from "next/server";
import { calculateSparksCost } from "@/lib/sparks";
import type { GeminiModelId } from "@/lib/types";

interface EstimateRequest {
  model_id: GeminiModelId;
  input_tokens: number;
  output_tokens?: number;
}

export async function POST(req: Request) {
  try {
    const body: EstimateRequest = await req.json();
    const { model_id, input_tokens, output_tokens } = body;

    if (!model_id || typeof input_tokens !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: model_id, input_tokens" },
        { status: 400 }
      );
    }

    // Calculate sparks cost using frontend function (includes model multipliers)
    const estimatedCost = calculateSparksCost(
      model_id,
      input_tokens,
      output_tokens || input_tokens
    );

    return NextResponse.json({
      estimated_cost: estimatedCost,
      model_id,
      input_tokens,
      output_tokens: output_tokens || input_tokens,
    });
  } catch (error) {
    console.error("Sparks estimate API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
