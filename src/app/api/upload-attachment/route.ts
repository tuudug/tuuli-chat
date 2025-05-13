import { createServer as createSupabaseUserContextClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "edge"; // Or 'nodejs' if Buffer manipulation is heavy or specific Node.js APIs are needed

const USER_ATTACHMENTS_BUCKET = "user-attachments";

function sanitizeFileName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

interface UploadRequestBody {
  fileContent: string; // base64 string
  fileName: string;
  fileType: string;
  chatId: string; // Important for path construction
}

export async function POST(req: Request) {
  const supabaseUserClient = await createSupabaseUserContextClient();
  const supabaseServiceAdmin = createSupabaseServiceRoleClient();

  const {
    data: { user },
    error: authError,
  } = await supabaseUserClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestBody: UploadRequestBody;
  try {
    requestBody = await req.json();
  } catch (_parseError) {
    return NextResponse.json(
      { error: "Invalid request body for upload" },
      { status: 400 }
    );
  }

  const { fileContent, fileName, fileType, chatId } = requestBody;

  if (!fileContent || !fileName || !fileType || !chatId) {
    return NextResponse.json(
      { error: "Missing file data for upload" },
      { status: 400 }
    );
  }

  if (!fileContent.includes(",")) {
    return NextResponse.json(
      { error: "Invalid base64 file content" },
      { status: 400 }
    );
  }

  try {
    const sanitizedFileName = sanitizeFileName(fileName);
    // Ensure chatId is valid; if it's a placeholder for a new chat, the client might need to send a temporary unique ID
    // or the backend generates one if it's truly the first action for a new chat.
    // For simplicity, assuming client sends a valid or temporary chatId that can be used in path.
    const filePathInBucket = `public/${
      user.id
    }/${chatId}/${Date.now()}_${sanitizedFileName}`;

    const base64Data = fileContent.split(",")[1];
    const fileBuffer = Buffer.from(base64Data, "base64");

    const { error: uploadError } = await supabaseServiceAdmin.storage
      .from(USER_ATTACHMENTS_BUCKET)
      .upload(filePathInBucket, fileBuffer, {
        contentType: fileType,
        upsert: true, // Consider if upsert is desired or if new uploads should always be unique
      });

    if (uploadError) {
      console.error("Storage Upload Error:", uploadError.message, uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseServiceAdmin.storage
      .from(USER_ATTACHMENTS_BUCKET)
      .getPublicUrl(filePathInBucket);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("Failed to get public URL for attachment after upload.");
      return NextResponse.json(
        { error: "File uploaded but failed to get public URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      publicUrl: publicUrlData.publicUrl,
      name: fileName, // Return original name
      type: fileType,
    });
  } catch (error: unknown) {
    console.error("Upload API Route Error:", error);
    let errorMessage = "Internal server error during upload.";
    if (error instanceof Error) errorMessage = error.message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
