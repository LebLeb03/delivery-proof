export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
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
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
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
      deliveries: {
        Row: {
          created_at: string;
          delivered_at: string;
          id: string;
          notes: string | null;
          order_last_four: string | null;
          order_number: string;
          order_search: string | null;
          organization_id: string;
          status: string;
          store_id: string;
          updated_at: string;
          uploaded_by: string | null;
          vendor_id: string | null;
        };
        Insert: {
          created_at?: string;
          delivered_at?: string;
          id?: string;
          notes?: string | null;
          order_last_four?: string | null;
          order_number: string;
          order_search?: string | null;
          organization_id: string;
          status?: string;
          store_id: string;
          updated_at?: string;
          uploaded_by?: string | null;
          vendor_id?: string | null;
        };
        Update: {
          created_at?: string;
          delivered_at?: string;
          id?: string;
          notes?: string | null;
          order_last_four?: string | null;
          order_number?: string;
          order_search?: string | null;
          organization_id?: string;
          status?: string;
          store_id?: string;
          updated_at?: string;
          uploaded_by?: string | null;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_audit_log: {
        Row: {
          action: string;
          changed_by: string | null;
          created_at: string;
          delivery_id: string;
          id: string;
          new_values: Json | null;
          previous_values: Json | null;
        };
        Insert: {
          action: string;
          changed_by?: string | null;
          created_at?: string;
          delivery_id: string;
          id?: string;
          new_values?: Json | null;
          previous_values?: Json | null;
        };
        Update: {
          action?: string;
          changed_by?: string | null;
          created_at?: string;
          delivery_id?: string;
          id?: string;
          new_values?: Json | null;
          previous_values?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_audit_log_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_audit_log_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "deliveries";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_photos: {
        Row: {
          created_at: string;
          delivery_id: string;
          id: string;
          original_filename: string | null;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          delivery_id: string;
          id?: string;
          original_filename?: string | null;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          delivery_id?: string;
          id?: string;
          original_filename?: string | null;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_photos_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "deliveries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      markets: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "markets_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_audit_log: {
        Row: {
          action: string;
          changed_by: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          new_values: Json | null;
          organization_id: string;
          previous_values: Json | null;
        };
        Insert: {
          action: string;
          changed_by?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          new_values?: Json | null;
          organization_id: string;
          previous_values?: Json | null;
        };
        Update: {
          action?: string;
          changed_by?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          new_values?: Json | null;
          organization_id?: string;
          previous_values?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_audit_log_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_audit_log_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_join_codes: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          organization_id: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          organization_id: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_join_codes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      patches: {
        Row: {
          created_at: string;
          id: string;
          market_id: string;
          name: string;
          store_capacity: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          market_id: string;
          name: string;
          store_capacity: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          market_id?: string;
          name?: string;
          store_capacity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "patches_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          default_store_id: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          organization_id: string | null;
        };
        Insert: {
          created_at?: string;
          default_store_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          organization_id?: string | null;
        };
        Update: {
          created_at?: string;
          default_store_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_default_store_id_fkey";
            columns: ["default_store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      stores: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          patch_id: string | null;
          store_name: string | null;
          store_number: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          patch_id?: string | null;
          store_name?: string | null;
          store_number: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          patch_id?: string | null;
          store_name?: string | null;
          store_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stores_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stores_patch_id_fkey";
            columns: ["patch_id"];
            isOneToOne: false;
            referencedRelation: "patches";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_path_photos: {
        Row: {
          created_at: string;
          id: string;
          original_filename: string | null;
          run_item_id: string;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          original_filename?: string | null;
          run_item_id: string;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          original_filename?: string | null;
          run_item_id?: string;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "travel_path_photos_run_item_id_fkey";
            columns: ["run_item_id"];
            isOneToOne: false;
            referencedRelation: "travel_path_run_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_path_photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_path_run_items: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          completed_by: string | null;
          id: string;
          instructions: string | null;
          notes: string | null;
          photo_required: boolean;
          run_id: string;
          sort_order: number;
          template_item_id: string | null;
          title: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          id?: string;
          instructions?: string | null;
          notes?: string | null;
          photo_required?: boolean;
          run_id: string;
          sort_order?: number;
          template_item_id?: string | null;
          title: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
          id?: string;
          instructions?: string | null;
          notes?: string | null;
          photo_required?: boolean;
          run_id?: string;
          sort_order?: number;
          template_item_id?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "travel_path_run_items_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_path_run_items_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "travel_path_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_path_run_items_template_item_id_fkey";
            columns: ["template_item_id"];
            isOneToOne: false;
            referencedRelation: "travel_path_template_items";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_path_runs: {
        Row: {
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          id: string;
          organization_id: string;
          started_by: string | null;
          status: string;
          store_id: string;
          template_id: string | null;
          template_name: string;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          id?: string;
          organization_id: string;
          started_by?: string | null;
          status?: string;
          store_id: string;
          template_id?: string | null;
          template_name: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          id?: string;
          organization_id?: string;
          started_by?: string | null;
          status?: string;
          store_id?: string;
          template_id?: string | null;
          template_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "travel_path_runs_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_path_runs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_path_runs_started_by_fkey";
            columns: ["started_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_path_runs_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_path_runs_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "travel_path_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_path_template_items: {
        Row: {
          id: string;
          instructions: string | null;
          photo_required: boolean;
          sort_order: number;
          template_id: string;
          title: string;
        };
        Insert: {
          id?: string;
          instructions?: string | null;
          photo_required?: boolean;
          sort_order?: number;
          template_id: string;
          title: string;
        };
        Update: {
          id?: string;
          instructions?: string | null;
          photo_required?: boolean;
          sort_order?: number;
          template_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "travel_path_template_items_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "travel_path_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      travel_path_templates: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "travel_path_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "travel_path_templates_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_markets: {
        Row: {
          created_at: string;
          id: string;
          market_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          market_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          market_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_markets_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_stores: {
        Row: {
          created_at: string;
          id: string;
          store_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          store_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          store_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_stores_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          organization_id: string;
          vendor_name: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          organization_id: string;
          vendor_name: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          organization_id?: string;
          vendor_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_access_market: { Args: { _market_id: string }; Returns: boolean };
      can_admin_org: { Args: { _org_id: string }; Returns: boolean };
      can_manage_deliveries: { Args: { _store_id: string }; Returns: boolean };
      can_manage_market_structure: {
        Args: { _market_id: string };
        Returns: boolean;
      };
      can_manage_vendors: { Args: { _org_id: string }; Returns: boolean };
      can_view_profile: { Args: { _user_id: string }; Returns: boolean };
      can_view_store: { Args: { _store_id: string }; Returns: boolean };
      create_market_for_my_organization: {
        Args: { _name: string };
        Returns: string;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_company_admin: { Args: { _user_id?: string }; Returns: boolean };
      is_store_member: { Args: { _store_id: string }; Returns: boolean };
      join_organization_by_code: {
        Args: { _code: string; _full_name?: string };
        Returns: string;
      };
      my_org_id: { Args: never; Returns: string };
      onboard_my_organization: {
        Args: {
          _full_name?: string;
          _include_sample_data?: boolean;
          _organization_name: string;
          _store_name?: string;
          _store_number: string;
        };
        Returns: string;
      };
      set_user_access: {
        Args: {
          _market_ids?: string[];
          _role: Database["public"]["Enums"]["app_role"];
          _store_ids?: string[];
          _user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role:
        | "market_admin"
        | "store_manager"
        | "crew"
        | "company_admin"
        | "consultant"
        | "operations_manager"
        | "delivery_manager"
        | "general_manager";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "market_admin",
        "store_manager",
        "crew",
        "company_admin",
        "consultant",
        "operations_manager",
        "delivery_manager",
        "general_manager",
      ],
    },
  },
} as const;
