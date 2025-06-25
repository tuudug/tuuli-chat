import { NextResponse } from "next/server";
import {
  createServer,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server"; // Use the existing server client and service role client
import { MODEL_PRICES, DATE_RANGE_OPTIONS } from "@/lib/constants";
import type { DateRangeValue } from "@/lib/constants";
import type { GeminiModelId } from "@/types";

export async function GET(request: Request) {
  const supabase = await createServer(); // Use the async createServer function

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_verified")
    .eq("id", session.user.id)
    .single();

  if (profileError || !userProfile) {
    return NextResponse.json(
      { error: "Could not retrieve user profile." },
      { status: 500 }
    );
  }

  if (!userProfile.is_verified) {
    return NextResponse.json(
      { error: "Forbidden. User is not verified." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const dateRange = searchParams.get("dateRange") as DateRangeValue | null;

  if (
    !dateRange ||
    !DATE_RANGE_OPTIONS.some((opt) => opt.value === dateRange)
  ) {
    return NextResponse.json(
      { error: "Invalid or missing dateRange parameter." },
      { status: 400 }
    );
  }

  // Now that we've confirmed the user is an admin, use the service role client to fetch all messages
  const serviceSupabase = createSupabaseServiceRoleClient();

  const initialDate = new Date(); // Changed to const
  let startDate: Date;

  switch (dateRange) {
    case "24h":
      startDate = new Date(initialDate.setDate(initialDate.getDate() - 1));
      break;
    case "7d":
      startDate = new Date(initialDate.setDate(initialDate.getDate() - 7));
      break;
    case "30d":
      startDate = new Date(initialDate.setDate(initialDate.getDate() - 30));
      break;
    default:
      startDate = new Date(initialDate.setDate(initialDate.getDate() - 1));
  }
  startDate.setUTCHours(0, 0, 0, 0); // Start of the day in UTC for consistency

  const { data: messages, error: messagesError } = await serviceSupabase // Use serviceSupabase here
    .from("messages")
    .select("model_used, prompt_tokens, completion_tokens, user_id, created_at")
    .eq("role", "assistant") // Only assistant messages have token counts from generation
    .gte("created_at", startDate.toISOString()); // Fetch messages from the start date

  if (messagesError) {
    console.error("Error fetching messages for analytics:", messagesError);
    return NextResponse.json(
      { error: "Failed to fetch messages for analytics." },
      { status: 500 }
    );
  }

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  const modelUsage: Record<string, number> = {};
  const priceByModel: Record<string, number> = {};
  const priceByUser: Record<string, number> = {};

  for (const message of messages) {
    if (message.prompt_tokens) totalPromptTokens += message.prompt_tokens;
    if (message.completion_tokens)
      totalCompletionTokens += message.completion_tokens;

    const modelId = message.model_used as GeminiModelId | null;
    if (modelId && MODEL_PRICES[modelId]) {
      modelUsage[modelId] = (modelUsage[modelId] || 0) + 1;

      const promptTokens = message.prompt_tokens || 0;
      const completionTokens = message.completion_tokens || 0;
      const modelPrices = MODEL_PRICES[modelId];

      const cost =
        promptTokens * modelPrices.input +
        completionTokens * modelPrices.output;

      priceByModel[modelId] = (priceByModel[modelId] || 0) + cost;
      if (message.user_id) {
        priceByUser[message.user_id] =
          (priceByUser[message.user_id] || 0) + cost;
      }
    } else if (modelId) {
      // Model used is not in our price list, still count usage but not cost
      modelUsage[modelId] = (modelUsage[modelId] || 0) + 1;
    }
  }

  const totalOverallTokens = totalPromptTokens + totalCompletionTokens;

  // Format for Recharts
  const modelUsageData = Object.entries(modelUsage).map(([name, value]) => ({
    name,
    value,
  }));
  const priceByModelData = Object.entries(priceByModel).map(
    ([name, value]) => ({ name, value: parseFloat(value.toFixed(6)) })
  ); // toFixed for currency precision
  const priceByUserData = Object.entries(priceByUser).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(6)),
  }));

  return NextResponse.json({
    totalPromptTokens,
    totalCompletionTokens,
    totalOverallTokens,
    modelUsageData,
    priceByModelData,
    priceByUserData,
    dateRange,
    startDate: startDate.toISOString(),
    fetchedMessagesCount: messages.length,
  });
}
