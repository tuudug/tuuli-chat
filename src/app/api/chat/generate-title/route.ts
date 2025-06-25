import { NextResponse } from "next/server";
import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "edge";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});

interface GenerateTitleRequestBody {
  chatId: string;
  userPrompt: string;
  assistantResponse: string;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseUserContextClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestBody: GenerateTitleRequestBody;
  try {
    requestBody = await req.json();
  } catch (parseError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { chatId, userPrompt, assistantResponse } = requestBody;

  if (!chatId || !userPrompt || !assistantResponse) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: chatId, userPrompt, or assistantResponse",
      },
      { status: 400 }
    );
  }

  try {
    // Verify that the chat exists and belongs to the user
    const { data: chat, error: fetchError } = await supabase
      .from("chats")
      .select("id, user_id")
      .eq("id", chatId)
      .single();

    if (fetchError || !chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized access to chat" },
        { status: 403 }
      );
    }

    // Generate title using Gemini
    const modelId = "gemini-2.0-flash-lite";
    const titlePrompt = `Based on the following conversation, create a concise and relevant title with a maximum of 48 characters.
ONLY RESPOND WITH THE TITLE, NOTHING ELSE.

User: "${userPrompt}"

Assistant: "${assistantResponse}"

Title:`;

    const resultStream = await genAI.models.generateContentStream({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: titlePrompt }] }],
    });

    let newTitle = "";
    for await (const chunk of resultStream) {
      const text = chunk.text;
      if (typeof text === "string") {
        newTitle += text;
      }
    }

    newTitle = newTitle.trim().replace(/"/g, "");

    if (!newTitle) {
      throw new Error("Title generation failed.");
    }

    // Update the chat title in the database
    const { data: updatedChat, error: updateError } = await supabase
      .from("chats")
      .update({ title: newTitle })
      .eq("id", chatId)
      .select("id, title")
      .single();

    if (updateError) {
      console.error("Error updating chat title:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update chat title in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newTitle: updatedChat.title,
    });
  } catch (error: unknown) {
    console.error("Generate Title API Route Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
