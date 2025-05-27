import { NextResponse } from "next/server";
import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";

interface EditTitleRequestBody {
  chatId: string;
  title: string;
}

export async function PUT(req: Request) {
  const supabaseUserClient = await createSupabaseUserContextClient();

  const {
    data: { user },
    error: authError,
  } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    console.error("API Auth Error:", authError?.message, authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestBody: EditTitleRequestBody;
  try {
    requestBody = await req.json();
  } catch (_parseError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { chatId, title } = requestBody;

  if (!chatId || !title || title.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing chatId or title" },
      { status: 400 }
    );
  }

  if (title.length > 100) {
    return NextResponse.json(
      { error: "Title too long (max 100 characters)" },
      { status: 400 }
    );
  }

  try {
    // Verify chat exists and belongs to the user
    const { data: chat, error: fetchError } = await supabaseUserClient
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

    // Update the chat title
    const { data: updatedChat, error: updateError } = await supabaseUserClient
      .from("chats")
      .update({ title: title.trim() })
      .eq("id", chatId)
      .select("id, title")
      .single();

    if (updateError) {
      console.error("Error updating chat title:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update chat title" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      chat: updatedChat,
    });
  } catch (error: unknown) {
    console.error("Edit Title API Route Error:", error);
    let errorMessage = "Internal server error.";
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
