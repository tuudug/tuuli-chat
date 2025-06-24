export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      chats: {
        Row: {
          created_at: string;
          id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          attachment_name: string | null;
          attachment_type: string | null;
          attachment_url: string | null;
          chat_id: string;
          completion_tokens: number | null;
          content: string;
          created_at: string;
          estimated_input_tokens: number | null;
          estimated_output_tokens: number | null;
          id: string;
          model_used: string | null;
          prompt_tokens: number | null;
          role: string;
          sparks_cost: number | null;
          total_tokens: number | null;
          usage_metadata: Json | null;
          user_id: string;
        };
        Insert: {
          attachment_name?: string | null;
          attachment_type?: string | null;
          attachment_url?: string | null;
          chat_id: string;
          completion_tokens?: number | null;
          content: string;
          created_at?: string;
          estimated_input_tokens?: number | null;
          estimated_output_tokens?: number | null;
          id?: string;
          model_used?: string | null;
          prompt_tokens?: number | null;
          role: string;
          sparks_cost?: number | null;
          total_tokens?: number | null;
          usage_metadata?: Json | null;
          user_id: string;
        };
        Update: {
          attachment_name?: string | null;
          attachment_type?: string | null;
          attachment_url?: string | null;
          chat_id?: string;
          completion_tokens?: number | null;
          content?: string;
          created_at?: string;
          estimated_input_tokens?: number | null;
          estimated_output_tokens?: number | null;
          id?: string;
          model_used?: string | null;
          prompt_tokens?: number | null;
          role?: string;
          sparks_cost?: number | null;
          total_tokens?: number | null;
          usage_metadata?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          }
        ];
      };
      sparks_transactions: {
        Row: {
          amount: number;
          balance_after: number;
          created_at: string | null;
          estimated_tokens: number | null;
          id: string;
          message_id: string | null;
          metadata: Json | null;
          model_used: string | null;
          transaction_type: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          created_at?: string | null;
          estimated_tokens?: number | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          model_used?: string | null;
          transaction_type: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          created_at?: string | null;
          estimated_tokens?: number | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          model_used?: string | null;
          transaction_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sparks_transactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          }
        ];
      };
      user_profiles: {
        Row: {
          created_at: string;
          current_sparks: number | null;
          daily_message_count: number;
          daily_pro_message_count: number;
          id: string;
          is_verified: boolean;
          last_message_reset_at: string;
          last_sparks_claim_at: string | null;
          total_sparks_earned: number | null;
          total_sparks_spent: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          current_sparks?: number | null;
          daily_message_count?: number;
          daily_pro_message_count?: number;
          id: string;
          is_verified?: boolean;
          last_message_reset_at?: string;
          last_sparks_claim_at?: string | null;
          total_sparks_earned?: number | null;
          total_sparks_spent?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          current_sparks?: number | null;
          daily_message_count?: number;
          daily_pro_message_count?: number;
          id?: string;
          is_verified?: boolean;
          last_message_reset_at?: string;
          last_sparks_claim_at?: string | null;
          total_sparks_earned?: number | null;
          total_sparks_spent?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_sparks_cost: {
        Args: { model_id: string; input_tokens: number; output_tokens: number };
        Returns: number;
      };
      claim_daily_sparks: {
        Args: { user_uuid: string };
        Returns: Json;
      };
      is_chat_owner: {
        Args: { chat_uuid: string };
        Returns: boolean;
      };
      log_and_spend_sparks_for_assistant_message: {
        Args: {
          p_user_id: string;
          p_assistant_message_id: string;
          p_model_id: string;
          p_prompt_tokens: number;
          p_completion_tokens: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
