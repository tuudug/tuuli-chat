import { NextResponse } from "next/server";
import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";

interface DeleteRequestBody {
  chatId: string;
}

export async function DELETE(req: Request) {
  const supabaseUserClient = await createSupabaseUserContextClient();

  const {
    data: { user },
    error: authError,
  } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    console.error("API Auth Error:", authError?.message, authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestBody: DeleteRequestBody;
  try {
    requestBody = await req.json();
  } catch (_parseError) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { chatId } = requestBody;

  if (!chatId) {
    return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
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

    // Delete all messages in the chat first (cascade should handle this, but being explicit)
    const { error: messagesDeleteError } = await supabaseUserClient
      .from("messages")
      .delete()
      .eq("chat_id", chatId);

    if (messagesDeleteError) {
      console.error("Error deleting messages:", messagesDeleteError.message);
      return NextResponse.json(
        { error: "Failed to delete chat messages" },
        { status: 500 }
      );
    }

    // Delete the chat
    const { error: chatDeleteError } = await supabaseUserClient
      .from("chats")
      .delete()
      .eq("id", chatId);

    if (chatDeleteError) {
      console.error("Error deleting chat:", chatDeleteError.message);
      return NextResponse.json(
        { error: "Failed to delete chat" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete API Route Error:", error);
    let errorMessage = "Internal server error.";
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
