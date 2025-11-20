export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          days_before: number
          error_message: string | null
          id: string
          reminder_date: string
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_before: number
          error_message?: string | null
          id?: string
          reminder_date: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_before?: number
          error_message?: string | null
          id?: string
          reminder_date?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_frequency: Database["public"]["Enums"]["billing_frequency"]
          category: string
          created_at: string
          currency: string
          custom_billing_interval_days: number | null
          icon: string | null
          id: string
          name: string
          next_renewal_date: string
          notes: string | null
          override_reminder_days: number | null
          override_reminder_enabled: boolean | null
          payment_method: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          tag: Database["public"]["Enums"]["subscription_tag"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"]
          category: string
          created_at?: string
          currency?: string
          custom_billing_interval_days?: number | null
          icon?: string | null
          id?: string
          name: string
          next_renewal_date: string
          notes?: string | null
          override_reminder_days?: number | null
          override_reminder_enabled?: boolean | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tag?: Database["public"]["Enums"]["subscription_tag"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"]
          category?: string
          created_at?: string
          currency?: string
          custom_billing_interval_days?: number | null
          icon?: string | null
          id?: string
          name?: string
          next_renewal_date?: string
          notes?: string | null
          override_reminder_days?: number | null
          override_reminder_enabled?: boolean | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tag?: Database["public"]["Enums"]["subscription_tag"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          default_currency: string
          email_notifications_enabled: boolean
          global_reminder_days_before: number
          global_reminder_enabled: boolean
          monthly_summary_enabled: boolean
          time_zone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          email_notifications_enabled?: boolean
          global_reminder_days_before?: number
          global_reminder_enabled?: boolean
          monthly_summary_enabled?: boolean
          time_zone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          email_notifications_enabled?: boolean
          global_reminder_days_before?: number
          global_reminder_enabled?: boolean
          monthly_summary_enabled?: boolean
          time_zone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_reminder_date: {
        Args: { p_days_before: number; p_next_renewal_date: string }
        Returns: string
      }
      get_upcoming_renewals: {
        Args: { p_days_ahead?: number; p_user_id: string }
        Returns: {
          amount: number
          billing_frequency: Database["public"]["Enums"]["billing_frequency"]
          category: string
          currency: string
          days_until_renewal: number
          id: string
          name: string
          next_renewal_date: string
          payment_method: string
          status: Database["public"]["Enums"]["subscription_status"]
          tag: Database["public"]["Enums"]["subscription_tag"]
        }[]
      }
    }
    Enums: {
      billing_frequency:
        | "Weekly"
        | "Monthly"
        | "Quarterly"
        | "Yearly"
        | "Custom"
      reminder_status: "planned" | "pending" | "sent" | "failed"
      subscription_status: "Active" | "Cancelled" | "Paused"
      subscription_tag: "Personal" | "Work" | "Family"
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
    Enums: {
      billing_frequency: ["Weekly", "Monthly", "Quarterly", "Yearly", "Custom"],
      reminder_status: ["planned", "pending", "sent", "failed"],
      subscription_status: ["Active", "Cancelled", "Paused"],
      subscription_tag: ["Personal", "Work", "Family"],
    },
  },
} as const
