import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { TablesInsert } from "@/types/supabase"; // Ensure this path is correct

export const runtime = "edge";

interface CreateChatRequestBody {
  clientChatId: string;
  title: string;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseUserContextClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("API /api/chat/create Auth Error:", authError?.message);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestBody: CreateChatRequestBody;
  try {
    requestBody = await req.json();
  } catch (parseError) {
    console.error("API /api/chat/create Parse Error:", parseError);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { clientChatId, title } = requestBody;

  if (!clientChatId || typeof clientChatId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid clientChatId" },
      { status: 400 }
    );
  }

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing or invalid title" },
      { status: 400 }
    );
  }

  const newChatData: TablesInsert<"chats"> = {
    id: clientChatId,
    user_id: user.id,
    title: title.trim(),
    // created_at will be set by default by Postgres
  };

  try {
    const { error: insertError } = await supabase
      .from("chats")
      .insert(newChatData);

    if (insertError) {
      console.error(
        "API /api/chat/create DB Insert Error:",
        insertError.message
      );
      // Check for unique constraint violation (e.g., chat ID already exists)
      if (insertError.code === "23505") {
        // PostgreSQL unique violation code
        return NextResponse.json(
          { error: "Chat ID already exists." },
          { status: 409 } // Conflict
        );
      }
      return NextResponse.json(
        { error: "Could not create new chat shell" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Chat shell created successfully", chatId: clientChatId },
      { status: 201 }
    );
  } catch (e) {
    const error = e as Error;
    console.error("API /api/chat/create Unexpected Error:", error.message);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
