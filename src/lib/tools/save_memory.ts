import { Type } from "@google/genai";
import { User } from "@supabase/supabase-js";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

interface SaveMemoryContext {
  supabase: SupabaseClient<Database>;
  user: User | null;
}

interface SaveMemoryInput {
  memory: string;
}

export const saveMemoryToolDeclaration = {
  name: "save_memory",
  description:
    "Saves a memory about the user. This can be used to remember important details about the user for future interactions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      memory: {
        type: Type.STRING,
        description: "Memory content to be saved.",
      },
    },
    required: ["memory"],
  },
};

export const saveMemoryProcedure = async (
  ctx: SaveMemoryContext,
  input: SaveMemoryInput
): Promise<void> => {
  const { user } = ctx;
  const { memory } = input;

  if (!user) {
    throw new Error("User must be authenticated to save memories.");
  }

  if (!memory || memory.trim() === "") {
    throw new Error("Memory content cannot be empty.");
  }

  const { supabase } = ctx;
  const { error } = await supabase.from("user_memories").insert({
    user_id: user.id,
    content: memory,
  });

  if (error) {
    throw new Error(`Failed to save memory: ${error.message}`);
  }
};
