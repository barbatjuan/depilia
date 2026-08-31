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
      cash_movements: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          direction: string
          id: string
          kind: string
          reason: string
          session_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string
          direction: string
          id?: string
          kind: string
          reason: string
          session_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          direction?: string
          id?: string
          kind?: string
          reason?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_session_theoretical"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "cash_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          business_date: string
          closed_at: string | null
          closed_by: string | null
          closing_note: string | null
          counted_amount: number | null
          difference: number | null
          id: string
          opened_at: string
          opened_by: string
          opening_amount: number
          status: string
          theoretical_amount: number | null
        }
        Insert: {
          business_date: string
          closed_at?: string | null
          closed_by?: string | null
          closing_note?: string | null
          counted_amount?: number | null
          difference?: number | null
          id?: string
          opened_at?: string
          opened_by?: string
          opening_amount: number
          status?: string
          theoretical_amount?: number | null
        }
        Update: {
          business_date?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_note?: string | null
          counted_amount?: number | null
          difference?: number | null
          id?: string
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          status?: string
          theoretical_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
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
          currency: string
          id: boolean
          locale: string
          reminder_hours: number
          timezone: string
        }
        Insert: {
          clinic_name?: string | null
          currency?: string
          id?: boolean
          locale?: string
          reminder_hours?: number
          timezone?: string
        }
        Update: {
          clinic_name?: string | null
          currency?: string
          id?: boolean
          locale?: string
          reminder_hours?: number
          timezone?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          kind: string
          max_uses: number | null
          updated_at: string
          used_count: number
          valid_from: string | null
          valid_to: string | null
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          kind: string
          max_uses?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_to?: string | null
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          kind?: string
          max_uses?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_to?: string | null
          value?: number
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
          method: string
          spent_on: string
        }
        Insert: {
          amount: number
          category_id: string
          description?: string | null
          id?: string
          method?: string
          spent_on: string
        }
        Update: {
          amount?: number
          category_id?: string
          description?: string | null
          id?: string
          method?: string
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
          bono_price: number
          default_sessions: number
          gender: string
          id: string
          name: string
          session_price: number
          size_category: string
          zone_id: string
        }
        Insert: {
          active?: boolean
          bono_price: number
          default_sessions?: number
          gender: string
          id?: string
          name: string
          session_price: number
          size_category: string
          zone_id: string
        }
        Update: {
          active?: boolean
          bono_price?: number
          default_sessions?: number
          gender?: string
          id?: string
          name?: string
          session_price?: number
          size_category?: string
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
      promotion_items: {
        Row: {
          bonus_sessions: number
          id: string
          override_price: number | null
          promotion_id: string
          tariff_id: string
        }
        Insert: {
          bonus_sessions?: number
          id?: string
          override_price?: number | null
          promotion_id: string
          tariff_id: string
        }
        Update: {
          bonus_sessions?: number
          id?: string
          override_price?: number | null
          promotion_id?: string
          tariff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_items_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_items_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "package_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          name: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind: string
          name: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
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
      sale_packages: {
        Row: {
          client_package_id: string
          created_at: string
          id: string
          sale_id: string
        }
        Insert: {
          client_package_id: string
          created_at?: string
          id?: string
          sale_id: string
        }
        Update: {
          client_package_id?: string
          created_at?: string
          id?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_packages_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: true
            referencedRelation: "client_package_remaining"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_packages_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: true
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_packages_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_balances"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_packages_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
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
          discount_amount: number
          discount_code_id: string | null
          discount_reason: string | null
          discounted_by: string | null
          id: string
          list_total: number | null
          promotion_id: string | null
          sold_at: string
          status: string
          total: number
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          client_package_id?: string | null
          description: string
          discount_amount?: number
          discount_code_id?: string | null
          discount_reason?: string | null
          discounted_by?: string | null
          id?: string
          list_total?: number | null
          promotion_id?: string | null
          sold_at?: string
          status?: string
          total: number
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          client_package_id?: string | null
          description?: string
          discount_amount?: number
          discount_code_id?: string | null
          discount_reason?: string | null
          discounted_by?: string | null
          id?: string
          list_total?: number | null
          promotion_id?: string | null
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
          {
            foreignKeyName: "sales_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_discounted_by_fkey"
            columns: ["discounted_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
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
      cash_session_theoretical: {
        Row: {
          business_date: string | null
          cash_expenses: number | null
          cash_payments: number | null
          movements_net: number | null
          opening_amount: number | null
          session_id: string | null
          theoretical_amount: number | null
        }
        Relationships: []
      }
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
      create_combo_sale: {
        Args: {
          p_client_id: string
          p_description: string
          p_discount_amount: number
          p_discount_code_id?: string
          p_discount_reason?: string
          p_discounted_by?: string
          p_lines?: Json
          p_list_total: number
          p_promotion_id: string
        }
        Returns: string
      }
      current_staff_id: { Args: never; Returns: string }
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

