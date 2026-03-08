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
      community_posts: {
        Row: {
          author_initials: string
          author_name: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          author_initials?: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          author_initials?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          category: string
          city: string | null
          created_at: string
          date: string
          description: string
          end_time: string | null
          id: string
          location: string
          max_volunteers: number | null
          org_id: string
          skills_needed: string[] | null
          start_time: string | null
          status: string
          time_commitment: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          city?: string | null
          created_at?: string
          date?: string
          description?: string
          end_time?: string | null
          id?: string
          location?: string
          max_volunteers?: number | null
          org_id: string
          skills_needed?: string[] | null
          start_time?: string | null
          status?: string
          time_commitment?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          city?: string | null
          created_at?: string
          date?: string
          description?: string
          end_time?: string | null
          id?: string
          location?: string
          max_volunteers?: number | null
          org_id?: string
          skills_needed?: string[] | null
          start_time?: string | null
          status?: string
          time_commitment?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          description: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          user_id: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          description?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          user_id: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          description?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
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
      squad_activity_logs: {
        Row: {
          challenge_id: string
          created_at: string
          description: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          squad_id: string
          status: string
          user_id: string
          value: number
        }
        Insert: {
          challenge_id: string
          created_at?: string
          description?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          squad_id: string
          status?: string
          user_id: string
          value?: number
        }
        Update: {
          challenge_id?: string
          created_at?: string
          description?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          squad_id?: string
          status?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "squad_activity_logs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "squad_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_activity_logs_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_challenges: {
        Row: {
          category: string
          created_at: string
          created_by: string
          current_value: number
          description: string
          ends_at: string | null
          id: string
          squad_id: string
          status: string
          target_value: number
          title: string
          unit: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          current_value?: number
          description?: string
          ends_at?: string | null
          id?: string
          squad_id: string
          status?: string
          target_value?: number
          title: string
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          current_value?: number
          description?: string
          ends_at?: string | null
          id?: string
          squad_id?: string
          status?: string
          target_value?: number
          title?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_challenges_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          squad_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          squad_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          squad_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          avatar_emoji: string
          created_at: string
          created_by: string
          description: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          avatar_emoji?: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          avatar_emoji?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          action: string
          created_at: string
          id: string
          target: string
          user_id: string
          xp: number
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          target: string
          user_id: string
          xp?: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          target?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_events: {
        Row: {
          badge: string | null
          bg: string
          border: string
          category: string
          color: string
          created_at: string
          description: string
          end_time: string
          icon_name: string
          id: string
          registered: boolean
          start_time: string
          title: string
          user_id: string
        }
        Insert: {
          badge?: string | null
          bg?: string
          border?: string
          category?: string
          color?: string
          created_at?: string
          description?: string
          end_time?: string
          icon_name?: string
          id?: string
          registered?: boolean
          start_time?: string
          title: string
          user_id: string
        }
        Update: {
          badge?: string | null
          bg?: string
          border?: string
          category?: string
          color?: string
          created_at?: string
          description?: string
          end_time?: string
          icon_name?: string
          id?: string
          registered?: boolean
          start_time?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          created_at: string
          day_streak: number
          id: string
          impact_score: number
          level: number
          tasks_completed: number
          total_hours: number
          updated_at: string
          user_id: string
          xp: number
          xp_max: number
        }
        Insert: {
          created_at?: string
          day_streak?: number
          id?: string
          impact_score?: number
          level?: number
          tasks_completed?: number
          total_hours?: number
          updated_at?: string
          user_id: string
          xp?: number
          xp_max?: number
        }
        Update: {
          created_at?: string
          day_streak?: number
          id?: string
          impact_score?: number
          level?: number
          tasks_completed?: number
          total_hours?: number
          updated_at?: string
          user_id?: string
          xp?: number
          xp_max?: number
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          period: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          period?: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          period?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      volunteer_registrations: {
        Row: {
          attended: boolean | null
          created_at: string
          hours_credited: number | null
          id: string
          opportunity_id: string
          status: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          attended?: boolean | null
          created_at?: string
          hours_credited?: number | null
          id?: string
          opportunity_id: string
          status?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          attended?: boolean | null
          created_at?: string
          hours_credited?: number | null
          id?: string
          opportunity_id?: string
          status?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_registrations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_challenge_progress: {
        Args: { challenge_id: string }
        Returns: number
      }
      get_member_contributions: {
        Args: { p_since?: string; p_squad_id: string; p_unit: string }
        Returns: {
          contribution: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_squad_leader: {
        Args: { p_squad_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "volunteer" | "organization"
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
      app_role: ["volunteer", "organization"],
    },
  },
} as const
