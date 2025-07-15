export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenant: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          settings: Json
          subscription_status: string
          subscription_plan: string
          privacy_mode: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          settings?: Json
          subscription_status?: string
          subscription_plan?: string
          privacy_mode?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          settings?: Json
          subscription_status?: string
          subscription_plan?: string
          privacy_mode?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      user: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          timezone: string
          locale: string
          metadata: Json
          last_login_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          timezone?: string
          locale?: string
          metadata?: Json
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          timezone?: string
          locale?: string
          metadata?: Json
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      membership: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: string
          permissions: Json
          invited_by: string | null
          invited_at: string | null
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role: string
          permissions?: Json
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role?: string
          permissions?: Json
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      receipt: {
        Row: {
          id: string
          tenant_id: string
          vendor_id: string | null
          receipt_number: string | null
          receipt_date: string
          receipt_time: string | null
          total_amount: number
          tax_amount: number
          subtotal_amount: number | null
          currency: string
          payment_method: string | null
          category: string | null
          tags: string[] | null
          notes: string | null
          original_file_url: string
          original_file_name: string | null
          file_size_bytes: number | null
          mime_type: string | null
          ocr_status: string
          ocr_processed_at: string | null
          ocr_confidence: number | null
          ocr_provider: string | null
          ocr_raw_data: Json | null
          source: string
          source_metadata: Json
          is_duplicate: boolean
          duplicate_of: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          vendor_id?: string | null
          receipt_number?: string | null
          receipt_date: string
          receipt_time?: string | null
          total_amount: number
          tax_amount?: number
          subtotal_amount?: number | null
          currency?: string
          payment_method?: string | null
          category?: string | null
          tags?: string[] | null
          notes?: string | null
          original_file_url: string
          original_file_name?: string | null
          file_size_bytes?: number | null
          mime_type?: string | null
          ocr_status?: string
          ocr_processed_at?: string | null
          ocr_confidence?: number | null
          ocr_provider?: string | null
          ocr_raw_data?: Json | null
          source?: string
          source_metadata?: Json
          is_duplicate?: boolean
          duplicate_of?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          vendor_id?: string | null
          receipt_number?: string | null
          receipt_date?: string
          receipt_time?: string | null
          total_amount?: number
          tax_amount?: number
          subtotal_amount?: number | null
          currency?: string
          payment_method?: string | null
          category?: string | null
          tags?: string[] | null
          notes?: string | null
          original_file_url?: string
          original_file_name?: string | null
          file_size_bytes?: number | null
          mime_type?: string | null
          ocr_status?: string
          ocr_processed_at?: string | null
          ocr_confidence?: number | null
          ocr_provider?: string | null
          ocr_raw_data?: Json | null
          source?: string
          source_metadata?: Json
          is_duplicate?: boolean
          duplicate_of?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      // Add more table types as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
        Database['public']['Views'])
    ? (Database['public']['Tables'] &
        Database['public']['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
    ? Database['public']['Enums'][PublicEnumNameOrOptions]
    : never