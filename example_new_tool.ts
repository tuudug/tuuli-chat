// Example of how to add a new tool to the registry
// This shows how easy it is to extend the system

// 1. Create a new tool file (e.g., /src/lib/tools/send_email.ts):

import { Type } from "@google/genai";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

interface SendEmailContext {
  supabase: SupabaseClient<Database>;
  user: { id: string };
}

interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export const sendEmailToolDeclaration = {
  name: "send_email",
  description: "Sends an email to the specified recipient.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      to: {
        type: Type.STRING,
        description: "Email address of the recipient",
      },
      subject: {
        type: Type.STRING,
        description: "Subject line of the email",
      },
      body: {
        type: Type.STRING,
        description: "Body content of the email",
      },
    },
    required: ["to", "subject", "body"],
  },
};

export const sendEmailProcedure = async (
  ctx: SendEmailContext,
  input: SendEmailInput
): Promise<void> => {
  // Implementation for sending email
  console.log("Sending email:", input);
  // Your email sending logic here
};

// 2. Then in exp.ts, just add it to the registry:

// import { sendEmailToolDeclaration, sendEmailProcedure } from "@/lib/tools/send_email";

// const TOOL_REGISTRY: Record<string, ToolProcedure> = {
//   save_memory: saveMemoryProcedure as ToolProcedure,
//   send_email: sendEmailProcedure as ToolProcedure,  // <-- Add this line
// };

// const getAllToolDeclarations = () => {
//   return [
//     saveMemoryToolDeclaration,
//     sendEmailToolDeclaration,  // <-- Add this line
//   ];
// };

// That's it! No need to modify the executeToolCall function or add switch cases.
// The system will automatically handle the new tool.
