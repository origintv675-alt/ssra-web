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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          created_at: string
          guest_id: string | null
          id: string
          label: string
          last_seen_at: string
          revoked: boolean
          token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_id?: string | null
          id?: string
          label?: string
          last_seen_at?: string
          revoked?: boolean
          token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_id?: string | null
          id?: string
          label?: string
          last_seen_at?: string
          revoked?: boolean
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
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
      banned_ips: {
        Row: {
          created_at: string
          expires_at: string | null
          ip: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          ip: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          location: string | null
          redirect_url: string | null
          starts_at: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          location?: string | null
          redirect_url?: string | null
          starts_at?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          location?: string | null
          redirect_url?: string | null
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      guest_promo_redemptions: {
        Row: {
          code: string
          created_at: string
          guest_id: string
          id: string
          tokens_awarded: number
        }
        Insert: {
          code: string
          created_at?: string
          guest_id: string
          id?: string
          tokens_awarded?: number
        }
        Update: {
          code?: string
          created_at?: string
          guest_id?: string
          id?: string
          tokens_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "guest_promo_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "guest_promo_redemptions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_task_completions: {
        Row: {
          created_at: string
          day: string
          guest_id: string
          id: string
          task_id: string
          tokens: number
        }
        Insert: {
          created_at?: string
          day?: string
          guest_id: string
          id?: string
          task_id: string
          tokens?: number
        }
        Update: {
          created_at?: string
          day?: string
          guest_id?: string
          id?: string
          task_id?: string
          tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "guest_task_completions_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          badge: string | null
          ban_reason: string | null
          banned: boolean
          banned_until: string | null
          created_at: string
          id: string
          is_pro: boolean
          kicked_at: string | null
          last_ip: string | null
          last_seen_at: string
          lifetime_pro: boolean
          name: string
          space_tokens: number
        }
        Insert: {
          badge?: string | null
          ban_reason?: string | null
          banned?: boolean
          banned_until?: string | null
          created_at?: string
          id?: string
          is_pro?: boolean
          kicked_at?: string | null
          last_ip?: string | null
          last_seen_at?: string
          lifetime_pro?: boolean
          name: string
          space_tokens?: number
        }
        Update: {
          badge?: string | null
          ban_reason?: string | null
          banned?: boolean
          banned_until?: string | null
          created_at?: string
          id?: string
          is_pro?: boolean
          kicked_at?: string | null
          last_ip?: string | null
          last_seen_at?: string
          lifetime_pro?: boolean
          name?: string
          space_tokens?: number
        }
        Relationships: []
      }
      haunt_confessions: {
        Row: {
          created_at: string
          email: string | null
          haunt_id: string | null
          id: string
          ip: string | null
          label: string | null
          latitude: number | null
          longitude: number | null
          words: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          haunt_id?: string | null
          id?: string
          ip?: string | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          words: string
        }
        Update: {
          created_at?: string
          email?: string | null
          haunt_id?: string | null
          id?: string
          ip?: string | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          words?: string
        }
        Relationships: []
      }
      haunts: {
        Row: {
          ban_type: string
          banned: boolean
          created_at: string
          created_by: string
          id: string
          left_origin: boolean
          mode: string
          origin_path: string | null
          ruined: boolean
          stage: string
          target_guest_id: string | null
          target_ip: string | null
          target_session_id: string | null
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          ban_type?: string
          banned?: boolean
          created_at?: string
          created_by?: string
          id?: string
          left_origin?: boolean
          mode?: string
          origin_path?: string | null
          ruined?: boolean
          stage?: string
          target_guest_id?: string | null
          target_ip?: string | null
          target_session_id?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          ban_type?: string
          banned?: boolean
          created_at?: string
          created_by?: string
          id?: string
          left_origin?: boolean
          mode?: string
          origin_path?: string | null
          ruined?: boolean
          stage?: string
          target_guest_id?: string | null
          target_ip?: string | null
          target_session_id?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      live_visitors: {
        Row: {
          created_at: string
          guest_id: string | null
          ip: string | null
          kind: string
          label: string
          last_seen_at: string
          path: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_id?: string | null
          ip?: string | null
          kind?: string
          label?: string
          last_seen_at?: string
          path?: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_id?: string | null
          ip?: string | null
          kind?: string
          label?: string
          last_seen_at?: string
          path?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lobby_messages: {
        Row: {
          author_name: string
          content: string
          created_at: string
          guest_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          guest_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          guest_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lobby_messages_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      page_locks: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          locked_by: string | null
          message: string | null
          path: string
          target_guest_id: string | null
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          locked_by?: string | null
          message?: string | null
          path: string
          target_guest_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          locked_by?: string | null
          message?: string | null
          path?: string
          target_guest_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      pets: {
        Row: {
          accent_color: string
          accessory: string
          aura: string
          body_color: string
          created_at: string
          enabled: boolean
          eyes: string
          guest_id: string | null
          happiness: number
          id: string
          name: string
          owner_name: string
          pattern: string
          personality: string
          size: number
          sparkle_color: string
          species: string
          times_petted: number
          trail: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accent_color?: string
          accessory?: string
          aura?: string
          body_color?: string
          created_at?: string
          enabled?: boolean
          eyes?: string
          guest_id?: string | null
          happiness?: number
          id?: string
          name: string
          owner_name?: string
          pattern?: string
          personality?: string
          size?: number
          sparkle_color?: string
          species?: string
          times_petted?: number
          trail?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accent_color?: string
          accessory?: string
          aura?: string
          body_color?: string
          created_at?: string
          enabled?: boolean
          eyes?: string
          guest_id?: string | null
          happiness?: number
          id?: string
          name?: string
          owner_name?: string
          pattern?: string
          personality?: string
          size?: number
          sparkle_color?: string
          species?: string
          times_petted?: number
          trail?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badge: string | null
          ban_reason: string | null
          banned: boolean
          banned_until: string | null
          bio: string | null
          created_at: string
          id: string
          is_pro: boolean
          kicked_at: string | null
          lifetime_pro: boolean
          muted_until: string | null
          pro_since: string | null
          space_tokens: number
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          badge?: string | null
          ban_reason?: string | null
          banned?: boolean
          banned_until?: string | null
          bio?: string | null
          created_at?: string
          id: string
          is_pro?: boolean
          kicked_at?: string | null
          lifetime_pro?: boolean
          muted_until?: string | null
          pro_since?: string | null
          space_tokens?: number
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          badge?: string | null
          ban_reason?: string | null
          banned?: boolean
          banned_until?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_pro?: boolean
          kicked_at?: string | null
          lifetime_pro?: boolean
          muted_until?: string | null
          pro_since?: string | null
          space_tokens?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          badge: string | null
          code: string
          created_at: string
          grants_pro: boolean
          lifetime: boolean
          tokens: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge?: string | null
          code: string
          created_at?: string
          grants_pro?: boolean
          lifetime?: boolean
          tokens?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge?: string | null
          code?: string
          created_at?: string
          grants_pro?: boolean
          lifetime?: boolean
          tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          code: string
          created_at: string
          id: string
          tokens_awarded: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          tokens_awarded?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          tokens_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      push_digests: {
        Row: {
          body: string
          created_at: string
          day: string
          sent_count: number
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          day: string
          sent_count?: number
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          day?: string
          sent_count?: number
          title?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_counters: {
        Row: {
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          updated_at?: string
          value?: number
        }
        Update: {
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      site_effects: {
        Row: {
          created_at: string
          duration_seconds: number
          effect: string
          id: string
          intensity: number
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          effect: string
          id?: string
          intensity?: number
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          effect?: string
          id?: string
          intensity?: number
        }
        Relationships: []
      }
      site_popups: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          expires_at: string | null
          id: string
          link_label: string | null
          link_url: string | null
          target_guest_id: string | null
          target_session_id: string | null
          target_user_id: string | null
          title: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          target_guest_id?: string | null
          target_session_id?: string | null
          target_user_id?: string | null
          title: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          target_guest_id?: string | null
          target_session_id?: string | null
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          animations_enabled: boolean
          id: boolean
          shutdown_message: string | null
          shutdown_until: string | null
          sky_override: string | null
          updated_at: string
        }
        Insert: {
          animations_enabled?: boolean
          id?: boolean
          shutdown_message?: string | null
          shutdown_until?: string | null
          sky_override?: string | null
          updated_at?: string
        }
        Update: {
          animations_enabled?: boolean
          id?: boolean
          shutdown_message?: string | null
          shutdown_until?: string | null
          sky_override?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          created_at: string
          day: string
          id: string
          task_id: string
          tokens: number
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          task_id: string
          tokens?: number
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          task_id?: string
          tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_daily_task: {
        Args: { _task_id: string; _tokens: number }
        Returns: number
      }
      delete_pet: {
        Args: { _guest_id?: string; _id: string }
        Returns: undefined
      }
      guest_complete_task: {
        Args: { _guest_id: string; _task_id: string; _tokens: number }
        Returns: Json
      }
      guest_pets: {
        Args: { _guest_id: string }
        Returns: {
          accent_color: string
          accessory: string
          aura: string
          body_color: string
          enabled: boolean
          eyes: string
          happiness: number
          id: string
          name: string
          owner_name: string
          pattern: string
          personality: string
          size: number
          sparkle_color: string
          species: string
          times_petted: number
          trail: string
        }[]
      }
      guest_redeem_promo: {
        Args: { _code: string; _guest_id: string }
        Returns: Json
      }
      guest_register: { Args: { _name: string }; Returns: Json }
      guest_rename: {
        Args: { _guest_id: string; _name: string }
        Returns: Json
      }
      guest_state: { Args: { _guest_id: string }; Returns: Json }
      guest_task_ids: {
        Args: { _day?: string; _guest_id: string }
        Returns: {
          task_id: string
        }[]
      }
      guest_unlock_pro: { Args: { _guest_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_counter: { Args: { _key: string }; Returns: number }
      lobby_feed: {
        Args: { _limit?: number }
        Returns: {
          author_name: string
          content: string
          created_at: string
          id: string
        }[]
      }
      member_directory: {
        Args: never
        Returns: {
          avatar_url: string
          badge: string
          bio: string
          created_at: string
          id: string
          is_pro: boolean
          username: string
        }[]
      }
      pet_the_pet: { Args: { _guest_id?: string; _id: string }; Returns: Json }
      post_lobby_message: {
        Args: { _content: string; _guest_id?: string }
        Returns: Json
      }
      redeem_promo_code: { Args: { _code: string }; Returns: Json }
      save_pet: { Args: { _guest_id?: string; _pet: Json }; Returns: Json }
      track_visitor: {
        Args: {
          _guest_id?: string
          _kind: string
          _label: string
          _path: string
          _session_id: string
        }
        Returns: undefined
      }
      unlock_pro_with_tokens: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
