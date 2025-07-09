export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      chats: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exp_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      grounding_api_usage: {
        Row: {
          call_count: number
          date: string
          id: number
          is_disabled: boolean
        }
        Insert: {
          call_count?: number
          date: string
          id?: never
          is_disabled?: boolean
        }
        Update: {
          call_count?: number
          date?: string
          id?: never
          is_disabled?: boolean
        }
        Relationships: []
      }
      main_conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      main_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          completion_tokens: number | null
          content: string
          conversation_id: string
          created_at: string
          estimated_input_tokens: number | null
          estimated_output_tokens: number | null
          id: string
          model_used: string | null
          prompt_tokens: number | null
          role: string
          sparks_cost: number | null
          total_tokens: number | null
          usage_metadata: Json | null
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          completion_tokens?: number | null
          content: string
          conversation_id: string
          created_at?: string
          estimated_input_tokens?: number | null
          estimated_output_tokens?: number | null
          id?: string
          model_used?: string | null
          prompt_tokens?: number | null
          role: string
          sparks_cost?: number | null
          total_tokens?: number | null
          usage_metadata?: Json | null
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          completion_tokens?: number | null
          content?: string
          conversation_id?: string
          created_at?: string
          estimated_input_tokens?: number | null
          estimated_output_tokens?: number | null
          id?: string
          model_used?: string | null
          prompt_tokens?: number | null
          role?: string
          sparks_cost?: number | null
          total_tokens?: number | null
          usage_metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "main_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "main_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          chat_id: string
          completion_tokens: number | null
          content: string
          created_at: string
          estimated_input_tokens: number | null
          estimated_output_tokens: number | null
          id: string
          model_used: string | null
          prompt_tokens: number | null
          role: string
          search_references: Json | null
          sparks_cost: number | null
          total_tokens: number | null
          usage_metadata: Json | null
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          chat_id: string
          completion_tokens?: number | null
          content: string
          created_at?: string
          estimated_input_tokens?: number | null
          estimated_output_tokens?: number | null
          id?: string
          model_used?: string | null
          prompt_tokens?: number | null
          role: string
          search_references?: Json | null
          sparks_cost?: number | null
          total_tokens?: number | null
          usage_metadata?: Json | null
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          chat_id?: string
          completion_tokens?: number | null
          content?: string
          created_at?: string
          estimated_input_tokens?: number | null
          estimated_output_tokens?: number | null
          id?: string
          model_used?: string | null
          prompt_tokens?: number | null
          role?: string
          search_references?: Json | null
          sparks_cost?: number | null
          total_tokens?: number | null
          usage_metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      sparks_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          estimated_tokens: number | null
          id: string
          message_id: string | null
          metadata: Json | null
          model_used: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          estimated_tokens?: number | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          model_used?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          estimated_tokens?: number | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          model_used?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sparks_transactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          current_sparks: number | null
          daily_message_count: number
          daily_pro_message_count: number
          id: string
          is_verified: boolean
          last_message_reset_at: string
          last_sparks_claim_at: string | null
          pin_code: string | null
          total_sparks_earned: number | null
          total_sparks_spent: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_sparks?: number | null
          daily_message_count?: number
          daily_pro_message_count?: number
          id: string
          is_verified?: boolean
          last_message_reset_at?: string
          last_sparks_claim_at?: string | null
          pin_code?: string | null
          total_sparks_earned?: number | null
          total_sparks_spent?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_sparks?: number | null
          daily_message_count?: number
          daily_pro_message_count?: number
          id?: string
          is_verified?: boolean
          last_message_reset_at?: string
          last_sparks_claim_at?: string | null
          pin_code?: string | null
          total_sparks_earned?: number | null
          total_sparks_spent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_sparks_cost: {
        Args:
          | { model_id: string; input_tokens: number; output_tokens: number }
          | {
              model_id: string
              input_tokens: number
              output_tokens: number
              use_search: boolean
            }
        Returns: number
      }
      claim_daily_sparks: {
        Args: { user_uuid: string }
        Returns: Json
      }
      is_chat_owner: {
        Args: { chat_uuid: string }
        Returns: boolean
      }
      log_and_spend_sparks_for_assistant_message: {
        Args: {
          p_user_id: string
          p_assistant_message_id: string
          p_model_id: string
          p_prompt_tokens: number
          p_completion_tokens: number
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
