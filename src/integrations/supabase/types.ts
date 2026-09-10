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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          corridor: string | null
          id: string
          lat: number
          lng: number
          name: string
          sort_order: number
        }
        Insert: {
          corridor?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          sort_order?: number
        }
        Update: {
          corridor?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      campus_settings: {
        Row: {
          address: string
          campus_name: string
          campus_short: string
          city: string
          co2_kg_per_km: number
          demo_mode_enabled: boolean
          endorsement_note: string
          id: boolean
          lat: number
          lng: number
          updated_at: string
        }
        Insert: {
          address: string
          campus_name: string
          campus_short: string
          city: string
          co2_kg_per_km?: number
          demo_mode_enabled?: boolean
          endorsement_note: string
          id?: boolean
          lat: number
          lng: number
          updated_at?: string
        }
        Update: {
          address?: string
          campus_name?: string
          campus_short?: string
          city?: string
          co2_kg_per_km?: number
          demo_mode_enabled?: boolean
          endorsement_note?: string
          id?: boolean
          lat?: number
          lng?: number
          updated_at?: string
        }
        Relationships: []
      }
      impact_events: {
        Row: {
          co2_saved_kg: number
          id: string
          is_demo: boolean
          km_shared: number
          occurred_at: string
          ride_id: string | null
          seats_filled: number
          user_id: string
        }
        Insert: {
          co2_saved_kg?: number
          id?: string
          is_demo?: boolean
          km_shared?: number
          occurred_at?: string
          ride_id?: string | null
          seats_filled?: number
          user_id: string
        }
        Update: {
          co2_saved_kg?: number
          id?: string
          is_demo?: boolean
          km_shared?: number
          occurred_at?: string
          ride_id?: string | null
          seats_filled?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_events_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_demo: boolean
          ride_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_demo?: boolean
          ride_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          ride_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          department: string | null
          full_name: string
          home_area: string | null
          id: string
          is_demo: boolean
          is_driver: boolean
          phone: string | null
          rating: number
          rides_count: number
          study_year: number | null
          vehicle_color: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          home_area?: string | null
          id: string
          is_demo?: boolean
          is_driver?: boolean
          phone?: string | null
          rating?: number
          rides_count?: number
          study_year?: number | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          home_area?: string | null
          id?: string
          is_demo?: boolean
          is_driver?: boolean
          phone?: string | null
          rating?: number
          rides_count?: number
          study_year?: number | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      ride_requests: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          match_score: number
          message: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_name: string
          ride_id: string
          rider_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          match_score?: number
          message?: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_name: string
          ride_id: string
          rider_id: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          match_score?: number
          message?: string | null
          pickup_lat?: number
          pickup_lng?: number
          pickup_name?: string
          ride_id?: string
          rider_id?: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ride_requests_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_stops: {
        Row: {
          eta_offset_min: number
          id: string
          lat: number
          lng: number
          name: string
          ride_id: string
          seq: number
        }
        Insert: {
          eta_offset_min?: number
          id?: string
          lat: number
          lng: number
          name: string
          ride_id: string
          seq?: number
        }
        Update: {
          eta_offset_min?: number
          id?: string
          lat?: number
          lng?: number
          name?: string
          ride_id?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "ride_stops_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          created_at: string
          departure_time: string
          dest_lat: number
          dest_lng: number
          dest_name: string
          direction: Database["public"]["Enums"]["ride_direction"]
          distance_km: number
          driver_id: string
          duration_min: number
          id: string
          is_demo: boolean
          is_recurring: boolean
          notes: string | null
          origin_lat: number
          origin_lng: number
          origin_name: string
          recurrence_days: number[]
          ride_date: string | null
          route_polyline: string | null
          seats_available: number
          seats_total: number
          status: Database["public"]["Enums"]["ride_status"]
        }
        Insert: {
          created_at?: string
          departure_time: string
          dest_lat: number
          dest_lng: number
          dest_name: string
          direction?: Database["public"]["Enums"]["ride_direction"]
          distance_km?: number
          driver_id: string
          duration_min?: number
          id?: string
          is_demo?: boolean
          is_recurring?: boolean
          notes?: string | null
          origin_lat: number
          origin_lng: number
          origin_name: string
          recurrence_days?: number[]
          ride_date?: string | null
          route_polyline?: string | null
          seats_available?: number
          seats_total?: number
          status?: Database["public"]["Enums"]["ride_status"]
        }
        Update: {
          created_at?: string
          departure_time?: string
          dest_lat?: number
          dest_lng?: number
          dest_name?: string
          direction?: Database["public"]["Enums"]["ride_direction"]
          distance_km?: number
          driver_id?: string
          duration_min?: number
          id?: string
          is_demo?: boolean
          is_recurring?: boolean
          notes?: string | null
          origin_lat?: number
          origin_lng?: number
          origin_name?: string
          recurrence_days?: number[]
          ride_date?: string | null
          route_polyline?: string | null
          seats_available?: number
          seats_total?: number
          status?: Database["public"]["Enums"]["ride_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ride_participant: {
        Args: { _ride_id: string; _user_id: string }
        Returns: boolean
      }
      reset_demo_data: { Args: never; Returns: string }
      seed_demo_data: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "student"
      request_status: "pending" | "accepted" | "declined" | "cancelled"
      ride_direction: "to_campus" | "from_campus"
      ride_status: "open" | "full" | "completed" | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "student"],
      request_status: ["pending", "accepted", "declined", "cancelled"],
      ride_direction: ["to_campus", "from_campus"],
      ride_status: ["open", "full", "completed", "cancelled"],
    },
  },
} as const
