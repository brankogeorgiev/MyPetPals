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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          family_id: string
          id: string
          invited_by: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          family_id: string
          id?: string
          invited_by: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          invited_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          family_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          family_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          family_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_events: {
        Row: {
          created_at: string
          custom_type: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          is_reminder: boolean
          location: string | null
          parent_event_id: string | null
          pet_id: string
          photo_url: string | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          reminder_completed: boolean
          reminder_hours_before: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_type?: string | null
          description?: string | null
          event_date: string
          event_type: string
          id?: string
          is_reminder?: boolean
          location?: string | null
          parent_event_id?: string | null
          pet_id: string
          photo_url?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          reminder_completed?: boolean
          reminder_hours_before?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_type?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_reminder?: boolean
          location?: string | null
          parent_event_id?: string | null
          pet_id?: string
          photo_url?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          reminder_completed?: boolean
          reminder_hours_before?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "pet_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age_months: number | null
          age_years: number | null
          breed: string | null
          created_at: string
          family_id: string | null
          id: string
          name: string
          notes: string | null
          pet_type: string
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_months?: number | null
          age_years?: number | null
          breed?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          name: string
          notes?: string | null
          pet_type: string
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_months?: number | null
          age_years?: number | null
          breed?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          pet_type?: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pets_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_family_by_invite_code: {
        Args: { _invite_code: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
        }[]
      }
      get_family_member_count: { Args: { _family_id: string }; Returns: number }
      get_family_members: {
        Args: { _family_id: string }
        Returns: {
          avatar_url: string
          family_id: string
          full_name: string
          id: string
          joined_at: string
          user_id: string
        }[]
      }
      get_user_family_ids: { Args: { _user_id: string }; Returns: string[] }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
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
