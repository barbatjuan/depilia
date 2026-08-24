export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      appointments: {
        Row: {
          client_id: string
          client_package_id: string | null
          consumed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          scheduled_at: string
          status: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          client_id: string
          client_package_id?: string | null
          consumed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          client_id?: string
          client_package_id?: string | null
          consumed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: false
            referencedRelation: "client_package_remaining"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "body_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      body_zones: {
        Row: {
          archived: boolean
          id: string
          name: string
        }
        Insert: {
          archived?: boolean
          id?: string
          name: string
        }
        Update: {
          archived?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      client_packages: {
        Row: {
          client_id: string
          created_at: string
          id: string
          sessions_used: number
          template_id: string | null
          total_sessions: number
          zone_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          sessions_used?: number
          template_id?: string | null
          total_sessions: number
          zone_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          sessions_used?: number
          template_id?: string | null
          total_sessions?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "package_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "body_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          clinic_name: string | null
          id: boolean
          reminder_hours: number
          timezone: string
        }
        Insert: {
          clinic_name?: string | null
          id?: boolean
          reminder_hours?: number
          timezone?: string
        }
        Update: {
          clinic_name?: string | null
          id?: boolean
          reminder_hours?: number
          timezone?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          archived: boolean
          id: string
          name: string
        }
        Insert: {
          archived?: boolean
          id?: string
          name: string
        }
        Update: {
          archived?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          description: string | null
          id: string
          spent_on: string
        }
        Insert: {
          amount: number
          category_id: string
          description?: string | null
          id?: string
          spent_on: string
        }
        Update: {
          amount?: number
          category_id?: string
          description?: string | null
          id?: string
          spent_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      package_templates: {
        Row: {
          active: boolean
          default_sessions: number
          id: string
          name: string
          price: number
          zone_id: string
        }
        Insert: {
          active?: boolean
          default_sessions: number
          id?: string
          name: string
          price: number
          zone_id: string
        }
        Update: {
          active?: boolean
          default_sessions?: number
          id?: string
          name?: string
          price?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_templates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "body_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          id: string
          method: string
          note: string | null
          paid_at: string
          sale_id: string
        }
        Insert: {
          amount: number
          id?: string
          method: string
          note?: string | null
          paid_at?: string
          sale_id: string
        }
        Update: {
          amount?: number
          id?: string
          method?: string
          note?: string | null
          paid_at?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_balances"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_log: {
        Row: {
          appointment_id: string
          channel: string
          id: string
          provider_message_id: string | null
          send_date: string
          status: string
        }
        Insert: {
          appointment_id: string
          channel?: string
          id?: string
          provider_message_id?: string | null
          send_date: string
          status: string
        }
        Update: {
          appointment_id?: string
          channel?: string
          id?: string
          provider_message_id?: string | null
          send_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          appointment_id: string | null
          client_id: string
          client_package_id: string | null
          description: string
          id: string
          sold_at: string
          status: string
          total: number
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          client_package_id?: string | null
          description: string
          id?: string
          sold_at?: string
          status?: string
          total: number
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          client_package_id?: string | null
          description?: string
          id?: string
          sold_at?: string
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: true
            referencedRelation: "client_package_remaining"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: true
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      client_package_remaining: {
        Row: {
          client_id: string | null
          id: string | null
          remaining: number | null
          sessions_used: number | null
          total_sessions: number | null
          zone_id: string | null
        }
        Insert: {
          client_id?: string | null
          id?: string | null
          remaining?: never
          sessions_used?: number | null
          total_sessions?: number | null
          zone_id?: string | null
        }
        Update: {
          client_id?: string | null
          id?: string | null
          remaining?: never
          sessions_used?: number | null
          total_sessions?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "body_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_balances: {
        Row: {
          balance: number | null
          paid: number | null
          sale_id: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      appointment_end_at: {
        Args: { p_duration_minutes: number; p_scheduled_at: string }
        Returns: string
      }
      is_staff: { Args: never; Returns: boolean }
      set_appointment_status: {
        Args: { p_appointment_id: string; p_status: string }
        Returns: {
          client_id: string
          client_package_id: string | null
          consumed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          scheduled_at: string
          status: string
          updated_at: string
          zone_id: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      truncate_table: { Args: { table_name: string }; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

