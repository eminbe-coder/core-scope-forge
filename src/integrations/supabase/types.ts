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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          completed: boolean
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          deal_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string | null
          id: string
          project_id: string | null
          site_id: string | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          completed?: boolean
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string | null
          site_id?: string | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          completed?: boolean
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string | null
          site_id?: string | null
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by: string
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          active: boolean
          address: string
          city: string
          country: string
          country_code: string | null
          created_at: string
          id: string
          name: string
          phone_number: string | null
          telephone: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          city: string
          country: string
          country_code?: string | null
          created_at?: string
          id?: string
          name: string
          phone_number?: string | null
          telephone: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          city?: string
          country?: string
          country_code?: string | null
          created_at?: string
          id?: string
          name?: string
          phone_number?: string | null
          telephone?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_configurations: {
        Row: {
          active: boolean
          calculation_method: string
          created_at: string
          description: string | null
          earning_rules: Json
          fixed_amount: number | null
          id: string
          name: string
          percentage_rate: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          calculation_method: string
          created_at?: string
          description?: string | null
          earning_rules?: Json
          fixed_amount?: number | null
          id?: string
          name: string
          percentage_rate?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          calculation_method?: string
          created_at?: string
          description?: string | null
          earning_rules?: Json
          fixed_amount?: number | null
          id?: string
          name?: string
          percentage_rate?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      commission_stages: {
        Row: {
          commission_configuration_id: string
          commission_rate: number
          created_at: string
          id: string
          max_threshold: number | null
          min_threshold: number
          sort_order: number
          stage_name: string
          tenant_id: string
          threshold_type: string
          updated_at: string
        }
        Insert: {
          commission_configuration_id: string
          commission_rate: number
          created_at?: string
          id?: string
          max_threshold?: number | null
          min_threshold: number
          sort_order?: number
          stage_name: string
          tenant_id: string
          threshold_type: string
          updated_at?: string
        }
        Update: {
          commission_configuration_id?: string
          commission_rate?: number
          created_at?: string
          id?: string
          max_threshold?: number | null
          min_threshold?: number
          sort_order?: number
          stage_name?: string
          tenant_id?: string
          threshold_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_stages_commission_configuration_id_fkey"
            columns: ["commission_configuration_id"]
            isOneToOne: false
            referencedRelation: "commission_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          country_code: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          email: string | null
          headquarters: string | null
          high_value: boolean
          id: string
          industry: string | null
          instagram_page: string | null
          is_lead: boolean | null
          linkedin_page: string | null
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          phone_number: string | null
          quality_id: string | null
          size: string | null
          solution_category_ids: string[] | null
          source_company_id: string | null
          source_contact_id: string | null
          source_id: string | null
          source_user_id: string | null
          stage_id: string | null
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          email?: string | null
          headquarters?: string | null
          high_value?: boolean
          id?: string
          industry?: string | null
          instagram_page?: string | null
          is_lead?: boolean | null
          linkedin_page?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          phone_number?: string | null
          quality_id?: string | null
          size?: string | null
          solution_category_ids?: string[] | null
          source_company_id?: string | null
          source_contact_id?: string | null
          source_id?: string | null
          source_user_id?: string | null
          stage_id?: string | null
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          email?: string | null
          headquarters?: string | null
          high_value?: boolean
          id?: string
          industry?: string | null
          instagram_page?: string | null
          is_lead?: boolean | null
          linkedin_page?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          phone_number?: string | null
          quality_id?: string | null
          size?: string | null
          solution_category_ids?: string[] | null
          source_company_id?: string | null
          source_contact_id?: string | null
          source_id?: string | null
          source_user_id?: string | null
          stage_id?: string | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_source_company_id_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_source_contact_id_fkey"
            columns: ["source_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "deal_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          department: string | null
          id: string
          is_primary: boolean | null
          notes: string | null
          position: string | null
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          department?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          position?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          department?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_customers: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          relationship_type: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      company_deals: {
        Row: {
          company_id: string
          created_at: string
          deal_id: string
          id: string
          notes: string | null
          relationship_type: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          deal_id: string
          id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          deal_id?: string
          id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_deals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      company_industries: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_sites: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notes: string | null
          site_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          site_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      company_types: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_sites: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          notes: string | null
          site_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          notes?: string | null
          site_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_sites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          active: boolean
          address: string | null
          country_code: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          first_name: string
          high_value: boolean
          id: string
          is_lead: boolean
          last_name: string | null
          notes: string | null
          phone: string | null
          phone_number: string | null
          position: string | null
          quality_id: string | null
          solution_category_ids: string[] | null
          source_company_id: string | null
          source_contact_id: string | null
          source_id: string | null
          source_user_id: string | null
          stage_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name: string
          high_value?: boolean
          id?: string
          is_lead?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          phone_number?: string | null
          position?: string | null
          quality_id?: string | null
          solution_category_ids?: string[] | null
          source_company_id?: string | null
          source_contact_id?: string | null
          source_id?: string | null
          source_user_id?: string | null
          stage_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string
          high_value?: boolean
          id?: string
          is_lead?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          phone_number?: string | null
          position?: string | null
          quality_id?: string | null
          solution_category_ids?: string[] | null
          source_company_id?: string | null
          source_contact_id?: string | null
          source_id?: string | null
          source_user_id?: string | null
          stage_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_source_company_id_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_source_contact_id_fkey"
            columns: ["source_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "deal_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_audit_logs: {
        Row: {
          action: string
          contract_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          field_name: string | null
          id: string
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          tenant_id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          contract_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          field_name?: string | null
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          tenant_id: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          contract_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          field_name?: string | null
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          tenant_id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      contract_companies: {
        Row: {
          company_id: string
          contract_id: string
          created_at: string
          id: string
          notes: string | null
          relationship_type: string | null
        }
        Insert: {
          company_id: string
          contract_id: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Update: {
          company_id?: string
          contract_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Relationships: []
      }
      contract_contacts: {
        Row: {
          contact_id: string
          contract_id: string
          created_at: string
          id: string
          notes: string | null
          role: string | null
        }
        Insert: {
          contact_id: string
          contract_id: string
          created_at?: string
          id?: string
          notes?: string | null
          role?: string | null
        }
        Update: {
          contact_id?: string
          contract_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          role?: string | null
        }
        Relationships: []
      }
      contract_payment_attachments: {
        Row: {
          attachment_type: string
          created_at: string
          created_by: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          name: string
          notes: string | null
          payment_term_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attachment_type: string
          created_at?: string
          created_by: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          name: string
          notes?: string | null
          payment_term_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attachment_type?: string
          created_at?: string
          created_by?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          name?: string
          notes?: string | null
          payment_term_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contract_payment_attachments_payment_term"
            columns: ["payment_term_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_payment_records: {
        Row: {
          amount_received: number
          created_at: string
          id: string
          notes: string | null
          payment_term_id: string
          received_date: string
          registered_by: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_received: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_term_id: string
          received_date: string
          registered_by?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_received?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_term_id?: string
          received_date?: string
          registered_by?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_payment_stages: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_payment_terms: {
        Row: {
          amount_type: string
          amount_value: number
          calculated_amount: number | null
          contract_id: string
          created_at: string
          due_date: string | null
          id: string
          installment_number: number
          name: string | null
          notes: string | null
          payment_status: string | null
          received_amount: number | null
          received_date: string | null
          stage_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_type: string
          amount_value: number
          calculated_amount?: number | null
          contract_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          installment_number: number
          name?: string | null
          notes?: string | null
          payment_status?: string | null
          received_amount?: number | null
          received_date?: string | null
          stage_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_type?: string
          amount_value?: number
          calculated_amount?: number | null
          contract_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          installment_number?: number
          name?: string | null
          notes?: string | null
          payment_status?: string | null
          received_amount?: number | null
          received_date?: string | null
          stage_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contract_payment_terms_contract"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contract_payment_terms_stage"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "contract_payment_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_todos: {
        Row: {
          assigned_to: string | null
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          contract_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          payment_term_id: string | null
          priority: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          contract_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          payment_term_id?: string | null
          priority?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          payment_term_id?: string | null
          priority?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_contract_todos_assigned_to"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contract_todos_completed_by"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contract_todos_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          assigned_to: string | null
          created_at: string
          currency_id: string | null
          customer_id: string | null
          customer_reference_number: string | null
          deal_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          sign_date: string | null
          signed_date: string | null
          site_id: string | null
          solution_category_ids: string[] | null
          start_date: string | null
          status: string
          tenant_id: string
          updated_at: string
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          currency_id?: string | null
          customer_id?: string | null
          customer_reference_number?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          sign_date?: string | null
          signed_date?: string | null
          site_id?: string | null
          solution_category_ids?: string[] | null
          start_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          currency_id?: string | null
          customer_id?: string | null
          customer_reference_number?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          sign_date?: string | null
          signed_date?: string | null
          site_id?: string | null
          solution_category_ids?: string[] | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_contracts_assigned_to"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_currency_id"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_customer_id"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_deal_id"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contracts_site_id"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          symbol: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          symbol: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      currency_settings: {
        Row: {
          conversion_rate: number
          created_at: string
          from_currency_id: string
          id: string
          tenant_id: string
          to_currency_id: string
          updated_at: string
        }
        Insert: {
          conversion_rate: number
          created_at?: string
          from_currency_id: string
          id?: string
          tenant_id: string
          to_currency_id: string
          updated_at?: string
        }
        Update: {
          conversion_rate?: number
          created_at?: string
          from_currency_id?: string
          id?: string
          tenant_id?: string
          to_currency_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_currency_settings_from_currency"
            columns: ["from_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_currency_settings_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_currency_settings_to_currency"
            columns: ["to_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          currency_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["customer_type"]
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id: string
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_companies: {
        Row: {
          company_id: string
          created_at: string
          deal_id: string
          id: string
          notes: string | null
          relationship_type: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          deal_id: string
          id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          deal_id?: string
          id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_companies_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_contacts: {
        Row: {
          contact_id: string
          created_at: string
          deal_id: string
          id: string
          notes: string | null
          role: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          deal_id: string
          id?: string
          notes?: string | null
          role?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          deal_id?: string
          id?: string
          notes?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_contacts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_files: {
        Row: {
          created_at: string
          created_by: string
          deal_id: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          name: string
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deal_id: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          name: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deal_id?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_files_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_payment_terms: {
        Row: {
          amount_type: string
          amount_value: number
          calculated_amount: number | null
          created_at: string
          deal_id: string
          due_date: string | null
          id: string
          installment_number: number
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_type: string
          amount_value: number
          calculated_amount?: number | null
          created_at?: string
          deal_id: string
          due_date?: string | null
          id?: string
          installment_number: number
          notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_type?: string
          amount_value?: number
          calculated_amount?: number | null
          created_at?: string
          deal_id?: string
          due_date?: string | null
          id?: string
          installment_number?: number
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_payment_terms_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_sources: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      deal_stages: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
          win_percentage: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          win_percentage?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          win_percentage?: number
        }
        Relationships: []
      }
      deal_statuses: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          assigned_to: string | null
          converted_to_contract_id: string | null
          created_at: string
          currency_id: string | null
          customer_id: string | null
          customer_reference_number: string | null
          deal_status_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          expected_close_date: string | null
          high_value: boolean
          id: string
          is_converted: boolean
          name: string
          notes: string | null
          priority: Database["public"]["Enums"]["deal_priority"] | null
          probability: number | null
          site_id: string | null
          solution_category_ids: string[] | null
          source_company_id: string | null
          source_contact_id: string | null
          source_id: string | null
          source_user_id: string | null
          stage_id: string | null
          status: Database["public"]["Enums"]["deal_status"]
          tenant_id: string
          updated_at: string
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          converted_to_contract_id?: string | null
          created_at?: string
          currency_id?: string | null
          customer_id?: string | null
          customer_reference_number?: string | null
          deal_status_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          expected_close_date?: string | null
          high_value?: boolean
          id?: string
          is_converted?: boolean
          name: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"] | null
          probability?: number | null
          site_id?: string | null
          solution_category_ids?: string[] | null
          source_company_id?: string | null
          source_contact_id?: string | null
          source_id?: string | null
          source_user_id?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          tenant_id: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          converted_to_contract_id?: string | null
          created_at?: string
          currency_id?: string | null
          customer_id?: string | null
          customer_reference_number?: string | null
          deal_status_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          expected_close_date?: string | null
          high_value?: boolean
          id?: string
          is_converted?: boolean
          name?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"] | null
          probability?: number | null
          site_id?: string | null
          solution_category_ids?: string[] | null
          source_company_id?: string | null
          source_contact_id?: string | null
          source_id?: string | null
          source_user_id?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          tenant_id?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_source_company_id_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_source_contact_id_fkey"
            columns: ["source_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "deal_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deals_converted_contract"
            columns: ["converted_to_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deals_deal_status"
            columns: ["deal_status_id"]
            isOneToOne: false
            referencedRelation: "deal_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_items: {
        Row: {
          created_at: string
          deleted_at: string
          deleted_by: string | null
          entity_data: Json
          entity_id: string
          entity_type: string
          id: string
          original_table: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          entity_data: Json
          entity_id: string
          entity_type: string
          id?: string
          original_table: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          entity_data?: Json
          entity_id?: string
          entity_type?: string
          id?: string
          original_table?: string
          tenant_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          active: boolean
          branch_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      device_template_drafts: {
        Row: {
          created_at: string
          id: string
          template_data: Json
          template_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_data?: Json
          template_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          template_data?: Json
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_template_options: {
        Row: {
          active: boolean
          code: string
          created_at: string
          data_type: string
          id: string
          label_ar: string | null
          label_en: string
          sort_order: number
          template_id: string
          tenant_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          data_type?: string
          id?: string
          label_ar?: string | null
          label_en: string
          sort_order?: number
          template_id: string
          tenant_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          data_type?: string
          id?: string
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          template_id?: string
          tenant_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_template_options_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "device_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      device_template_properties: {
        Row: {
          created_at: string
          id: string
          is_identifier: boolean | null
          is_required: boolean
          label_ar: string | null
          label_en: string
          property_name: string
          property_options: Json | null
          property_type: string
          property_unit: string | null
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_identifier?: boolean | null
          is_required?: boolean
          label_ar?: string | null
          label_en: string
          property_name: string
          property_options?: Json | null
          property_type: string
          property_unit?: string | null
          sort_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_identifier?: boolean | null
          is_required?: boolean
          label_ar?: string | null
          label_en?: string
          property_name?: string
          property_options?: Json | null
          property_type?: string
          property_unit?: string | null
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_template_properties_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "device_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      device_templates: {
        Row: {
          active: boolean
          brand_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          description_formula: string | null
          description_generation_type: string
          device_type_id: string | null
          id: string
          image_url: string | null
          is_global: boolean
          label_ar: string | null
          name: string
          properties_schema: Json
          sku_formula: string | null
          sku_generation_type: string
          supports_multilang: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_formula?: string | null
          description_generation_type?: string
          device_type_id?: string | null
          id?: string
          image_url?: string | null
          is_global?: boolean
          label_ar?: string | null
          name: string
          properties_schema?: Json
          sku_formula?: string | null
          sku_generation_type?: string
          supports_multilang?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_formula?: string | null
          description_generation_type?: string
          device_type_id?: string | null
          id?: string
          image_url?: string | null
          is_global?: boolean
          label_ar?: string | null
          name?: string
          properties_schema?: Json
          sku_formula?: string | null
          sku_generation_type?: string
          supports_multilang?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_templates_device_type_id_fkey"
            columns: ["device_type_id"]
            isOneToOne: false
            referencedRelation: "device_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_types: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          is_global: boolean
          name: string
          sort_order: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          active: boolean
          brand: string | null
          category: string
          cost_currency_id: string | null
          cost_price: number | null
          created_at: string
          currency_id: string | null
          id: string
          image_url: string | null
          is_global: boolean
          model: string | null
          msrp: number | null
          msrp_currency_id: string | null
          name: string
          pricing_formula: string | null
          pricing_type: string | null
          specifications: Json | null
          template_id: string | null
          template_properties: Json | null
          tenant_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          category: string
          cost_currency_id?: string | null
          cost_price?: number | null
          created_at?: string
          currency_id?: string | null
          id?: string
          image_url?: string | null
          is_global?: boolean
          model?: string | null
          msrp?: number | null
          msrp_currency_id?: string | null
          name: string
          pricing_formula?: string | null
          pricing_type?: string | null
          specifications?: Json | null
          template_id?: string | null
          template_properties?: Json | null
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          category?: string
          cost_currency_id?: string | null
          cost_price?: number | null
          created_at?: string
          currency_id?: string | null
          id?: string
          image_url?: string | null
          is_global?: boolean
          model?: string | null
          msrp?: number | null
          msrp_currency_id?: string | null
          name?: string
          pricing_formula?: string | null
          pricing_type?: string | null
          specifications?: Json | null
          template_id?: string | null
          template_properties?: Json | null
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_cost_currency_id_fkey"
            columns: ["cost_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_msrp_currency_id_fkey"
            columns: ["msrp_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "device_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_relationships: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          relationship_role_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          relationship_role_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          relationship_role_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_relationships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relationships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relationships_relationship_role_id_fkey"
            columns: ["relationship_role_id"]
            isOneToOne: false
            referencedRelation: "relationship_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_user_tenant_relationships: {
        Row: {
          created_at: string
          global_user_id: string
          id: string
          relationship_type: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          global_user_id: string
          id?: string
          relationship_type: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          global_user_id?: string
          id?: string
          relationship_type?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_user_tenant_relationships_global_user_id_fkey"
            columns: ["global_user_id"]
            isOneToOne: false
            referencedRelation: "global_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_user_tenant_relationships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      global_users: {
        Row: {
          company_name: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          status: string
          updated_at: string
          user_type: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          company_name?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_type: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_type?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      lead_files: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          name: string
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          name: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_quality: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_stages: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          notification_type: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          notification_type: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          notification_type?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          message: string | null
          notes: string | null
          notification_type: string
          read_at: string | null
          tenant_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          message?: string | null
          notes?: string | null
          notification_type: string
          read_at?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          message?: string | null
          notes?: string | null
          notification_type?: string
          read_at?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_devices: {
        Row: {
          created_at: string
          device_id: string
          floor_id: string | null
          id: string
          notes: string | null
          project_id: string
          quantity: number
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          floor_id?: string | null
          id?: string
          notes?: string | null
          project_id: string
          quantity?: number
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          floor_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          quantity?: number
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_devices_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_devices_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "project_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_devices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_floors: {
        Row: {
          area: number | null
          created_at: string
          description: string | null
          id: string
          level: number | null
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          area?: number | null
          created_at?: string
          description?: string | null
          id?: string
          level?: number | null
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          area?: number | null
          created_at?: string
          description?: string | null
          id?: string
          level?: number | null
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_floors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sites: {
        Row: {
          created_at: string
          id: string
          project_id: string
          site_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          site_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assigned_to: string | null
          budget: number | null
          created_at: string
          currency_id: string | null
          deal_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          tenant_id: string
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget?: number | null
          created_at?: string
          currency_id?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tenant_id: string
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget?: number | null
          created_at?: string
          currency_id?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          tenant_id?: string
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_roles: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          export_type: string
          file_path: string | null
          id: string
          report_id: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          export_type: string
          file_path?: string | null
          id?: string
          report_id: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          export_type?: string
          file_path?: string | null
          id?: string
          report_id?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_widgets: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_global: boolean
          name: string
          report_id: string
          tenant_id: string
          updated_at: string
          widget_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
          report_id: string
          tenant_id: string
          updated_at?: string
          widget_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
          report_id?: string
          tenant_id?: string
          updated_at?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_report_widgets_reports"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          data_source: string
          description: string | null
          id: string
          name: string
          query_config: Json
          tenant_id: string
          updated_at: string
          visibility: string
          visualization_type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          data_source: string
          description?: string | null
          id?: string
          name: string
          query_config?: Json
          tenant_id: string
          updated_at?: string
          visibility?: string
          visualization_type?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          data_source?: string
          description?: string | null
          id?: string
          name?: string
          query_config?: Json
          tenant_id?: string
          updated_at?: string
          visibility?: string
          visualization_type?: string
        }
        Relationships: []
      }
      reward_configurations: {
        Row: {
          action_description: string | null
          action_name: string
          active: boolean
          created_at: string
          id: string
          points_value: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action_description?: string | null
          action_name: string
          active?: boolean
          created_at?: string
          id?: string
          points_value?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action_description?: string | null
          action_name?: string
          active?: boolean
          created_at?: string
          id?: string
          points_value?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reward_period_cycles: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_current: boolean
          period_type: string
          start_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean
          period_type: string
          start_date: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean
          period_type?: string
          start_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_period_cycles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_periods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          period_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          period_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          period_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_point_transactions: {
        Row: {
          action_name: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          notes: string | null
          points_earned: number
          tenant_id: string
          user_id: string
        }
        Insert: {
          action_name: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          notes?: string | null
          points_earned?: number
          tenant_id: string
          user_id: string
        }
        Update: {
          action_name?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          notes?: string | null
          points_earned?: number
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          created_at: string
          id: string
          name: string
          parameters: Json | null
          report_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parameters?: Json | null
          report_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parameters?: Json | null
          report_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string
          email_recipients: Json
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          report_id: string
          schedule_config: Json
          schedule_type: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_recipients?: Json
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          report_id: string
          schedule_config?: Json
          schedule_type: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_recipients?: Json
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          report_id?: string
          schedule_config?: Json
          schedule_type?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          active: boolean
          address: string
          city: string | null
          company_id: string | null
          contact_id: string | null
          country: string
          country_code: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          high_value: boolean
          id: string
          images: string[] | null
          is_lead: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          phone_number: string | null
          postal_code: string | null
          quality_id: string | null
          solution_category_ids: string[] | null
          source_company_id: string | null
          source_contact_id: string | null
          source_id: string | null
          source_user_id: string | null
          stage_id: string | null
          state: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          city?: string | null
          company_id?: string | null
          contact_id?: string | null
          country: string
          country_code?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          high_value?: boolean
          id?: string
          images?: string[] | null
          is_lead?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          phone_number?: string | null
          postal_code?: string | null
          quality_id?: string | null
          solution_category_ids?: string[] | null
          source_company_id?: string | null
          source_contact_id?: string | null
          source_id?: string | null
          source_user_id?: string | null
          stage_id?: string | null
          state?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          city?: string | null
          company_id?: string | null
          contact_id?: string | null
          country?: string
          country_code?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          high_value?: boolean
          id?: string
          images?: string[] | null
          is_lead?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          phone_number?: string | null
          postal_code?: string | null
          quality_id?: string | null
          solution_category_ids?: string[] | null
          source_company_id?: string | null
          source_contact_id?: string | null
          source_id?: string | null
          source_user_id?: string | null
          stage_id?: string | null
          state?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_categories: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      targets: {
        Row: {
          active: boolean
          created_at: string
          entity_id: string | null
          id: string
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["period_type"]
          target_level: Database["public"]["Enums"]["target_level"]
          target_type: Database["public"]["Enums"]["target_type"]
          target_value: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          entity_id?: string | null
          id?: string
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["period_type"]
          target_level: Database["public"]["Enums"]["target_level"]
          target_type: Database["public"]["Enums"]["target_type"]
          target_value: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          entity_id?: string | null
          id?: string
          period_end?: string
          period_start?: string
          period_type?: Database["public"]["Enums"]["period_type"]
          target_level?: Database["public"]["Enums"]["target_level"]
          target_type?: Database["public"]["Enums"]["target_type"]
          target_value?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_types: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          custom_role_id: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          custom_role_id?: string | null
          email: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          custom_role_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_onedrive_settings: {
        Row: {
          access_token: string | null
          client_id: string | null
          client_secret: string | null
          code_verifier: string | null
          created_at: string
          enabled: boolean
          folder_structure: Json | null
          id: string
          refresh_token: string | null
          root_folder_id: string | null
          selected_library_id: string | null
          selected_library_name: string | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          code_verifier?: string | null
          created_at?: string
          enabled?: boolean
          folder_structure?: Json | null
          id?: string
          refresh_token?: string | null
          root_folder_id?: string | null
          selected_library_id?: string | null
          selected_library_name?: string | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          code_verifier?: string | null
          created_at?: string
          enabled?: boolean
          folder_structure?: Json | null
          id?: string
          refresh_token?: string | null
          root_folder_id?: string | null
          selected_library_id?: string | null
          selected_library_name?: string | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant_onedrive_tenant"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_pricing_settings: {
        Row: {
          created_at: string
          custom_conversion_rates: Json | null
          default_currency_id: string | null
          id: string
          pricing_tiers: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_conversion_rates?: Json | null
          default_currency_id?: string | null
          id?: string
          pricing_tiers?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_conversion_rates?: Json | null
          default_currency_id?: string | null
          id?: string
          pricing_tiers?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_pricing_settings_default_currency_id_fkey"
            columns: ["default_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean
          company_location: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_phone_country_code: string | null
          contact_phone_number: string | null
          country: string | null
          cr_number: string | null
          created_at: string
          default_currency_id: string | null
          default_lead_quality_id: string | null
          default_solution_category_id: string | null
          domain: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_location?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_phone_country_code?: string | null
          contact_phone_number?: string | null
          country?: string | null
          cr_number?: string | null
          created_at?: string
          default_currency_id?: string | null
          default_lead_quality_id?: string | null
          default_solution_category_id?: string | null
          domain?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_location?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_phone_country_code?: string | null
          contact_phone_number?: string | null
          country?: string | null
          cr_number?: string | null
          created_at?: string
          default_currency_id?: string | null
          default_lead_quality_id?: string | null
          default_solution_category_id?: string | null
          domain?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_default_currency_id_fkey"
            columns: ["default_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_default_lead_quality_id_fkey"
            columns: ["default_lead_quality_id"]
            isOneToOne: false
            referencedRelation: "lead_quality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_default_solution_category_fk"
            columns: ["default_solution_category_id"]
            isOneToOne: false
            referencedRelation: "solution_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_assignees: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          tenant_id: string
          todo_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          tenant_id: string
          todo_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          tenant_id?: string
          todo_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_assignees_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          todo_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          todo_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          todo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_assignments_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_audit_logs: {
        Row: {
          action: string
          created_at: string
          field_name: string | null
          id: string
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          tenant_id: string
          todo_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          tenant_id: string
          todo_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          tenant_id?: string
          todo_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todo_audit_logs_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_types: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          duration: number | null
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          parent_todo_id: string | null
          payment_term_id: string | null
          priority: Database["public"]["Enums"]["todo_priority"]
          start_time: string | null
          status: Database["public"]["Enums"]["todo_status"]
          tenant_id: string
          title: string
          type_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          duration?: number | null
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          parent_todo_id?: string | null
          payment_term_id?: string | null
          priority?: Database["public"]["Enums"]["todo_priority"]
          start_time?: string | null
          status?: Database["public"]["Enums"]["todo_status"]
          tenant_id: string
          title: string
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          duration?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          parent_todo_id?: string | null
          payment_term_id?: string | null
          priority?: Database["public"]["Enums"]["todo_priority"]
          start_time?: string | null
          status?: Database["public"]["Enums"]["todo_status"]
          tenant_id?: string
          title?: string
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_parent_todo_id_fkey"
            columns: ["parent_todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "todo_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_action_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_action_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_action_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_assignment_permissions: {
        Row: {
          assignment_scope: string
          created_at: string
          entity_type: string
          id: string
          selected_user_ids: string[] | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_scope: string
          created_at?: string
          entity_type: string
          id?: string
          selected_user_ids?: string[] | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_scope?: string
          created_at?: string
          entity_type?: string
          id?: string
          selected_user_ids?: string[] | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_branch_assignments: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dashboard_configs: {
        Row: {
          active: boolean
          created_at: string
          filters: Json | null
          height: number
          id: string
          is_global: boolean | null
          position_x: number
          position_y: number
          report_widget_id: string | null
          settings: Json | null
          updated_at: string
          user_id: string
          widget_id: string
          width: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          filters?: Json | null
          height?: number
          id?: string
          is_global?: boolean | null
          position_x?: number
          position_y?: number
          report_widget_id?: string | null
          settings?: Json | null
          updated_at?: string
          user_id: string
          widget_id: string
          width?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          filters?: Json | null
          height?: number
          id?: string
          is_global?: boolean | null
          position_x?: number
          position_y?: number
          report_widget_id?: string | null
          settings?: Json | null
          updated_at?: string
          user_id?: string
          widget_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_dashboard_configs_report_widget_id_fkey"
            columns: ["report_widget_id"]
            isOneToOne: false
            referencedRelation: "report_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dashboard_settings: {
        Row: {
          created_at: string
          id: string
          layout_locked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout_locked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout_locked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_department_assignments: {
        Row: {
          created_at: string
          department_id: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_department_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reward_participation: {
        Row: {
          active: boolean
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reward_points: {
        Row: {
          created_at: string
          id: string
          tenant_id: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tenant_id?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reward_targets: {
        Row: {
          achieved: boolean
          created_at: string
          current_points: number
          id: string
          period_cycle_id: string
          target_points: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved?: boolean
          created_at?: string
          current_points?: number
          id?: string
          period_cycle_id: string
          target_points?: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved?: boolean
          created_at?: string
          current_points?: number
          id?: string
          period_cycle_id?: string
          target_points?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reward_targets_period_cycle_id_fkey"
            columns: ["period_cycle_id"]
            isOneToOne: false
            referencedRelation: "reward_period_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reward_targets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tenant_memberships: {
        Row: {
          active: boolean
          created_at: string
          custom_role_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_memberships_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenant_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_todo_preferences: {
        Row: {
          calendar_date: string | null
          calendar_height: number | null
          calendar_view: string | null
          column_widths: Json | null
          created_at: string
          filter_assigned: string | null
          filter_category: string | null
          filter_due_date: string | null
          filter_priority: string | null
          filter_status: string | null
          filter_type: string | null
          id: string
          sort_by: string | null
          sort_order: string | null
          tenant_id: string
          time_slot_height: number | null
          updated_at: string
          user_id: string
          view_type: string
        }
        Insert: {
          calendar_date?: string | null
          calendar_height?: number | null
          calendar_view?: string | null
          column_widths?: Json | null
          created_at?: string
          filter_assigned?: string | null
          filter_category?: string | null
          filter_due_date?: string | null
          filter_priority?: string | null
          filter_status?: string | null
          filter_type?: string | null
          id?: string
          sort_by?: string | null
          sort_order?: string | null
          tenant_id: string
          time_slot_height?: number | null
          updated_at?: string
          user_id: string
          view_type?: string
        }
        Update: {
          calendar_date?: string | null
          calendar_height?: number | null
          calendar_view?: string | null
          column_widths?: Json | null
          created_at?: string
          filter_assigned?: string | null
          filter_category?: string | null
          filter_due_date?: string | null
          filter_priority?: string | null
          filter_status?: string | null
          filter_type?: string | null
          id?: string
          sort_by?: string | null
          sort_order?: string | null
          tenant_id?: string
          time_slot_height?: number | null
          updated_at?: string
          user_id?: string
          view_type?: string
        }
        Relationships: []
      }
      user_visibility_permissions: {
        Row: {
          allowed_user_ids: string[] | null
          created_at: string | null
          entity_type: string
          id: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed_user_ids?: string[] | null
          created_at?: string | null
          entity_type: string
          id?: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed_user_ids?: string[] | null
          created_at?: string | null
          entity_type?: string
          id?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_working_hours: {
        Row: {
          created_at: string
          custom_holidays: string[] | null
          end_time: string
          id: string
          start_time: string
          tenant_id: string
          timezone: string
          updated_at: string
          user_id: string
          working_days: number[]
        }
        Insert: {
          created_at?: string
          custom_holidays?: string[] | null
          end_time?: string
          id?: string
          start_time?: string
          tenant_id: string
          timezone?: string
          updated_at?: string
          user_id: string
          working_days?: number[]
        }
        Update: {
          created_at?: string
          custom_holidays?: string[] | null
          end_time?: string
          id?: string
          start_time?: string
          tenant_id?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          working_days?: number[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: {
          _action_name: string
          _entity_id?: string
          _entity_type?: string
          _notes?: string
          _tenant_id: string
          _user_id: string
        }
        Returns: undefined
      }
      can_user_assign_to: {
        Args: {
          _assignee_id: string
          _assigner_id: string
          _entity_type: string
          _tenant_id: string
        }
        Returns: boolean
      }
      create_notification: {
        Args: {
          _entity_id: string
          _entity_type: string
          _message: string
          _notification_type: string
          _tenant_id: string
          _title: string
          _user_id: string
        }
        Returns: string
      }
      get_all_tenant_memberships_for_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant: Json
          tenant_id: string
          updated_at: string
          user_id: string
          user_profile: Json
        }[]
      }
      get_all_tenants_for_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          created_at: string
          default_currency_id: string
          domain: string
          id: string
          name: string
          settings: Json
          slug: string
          updated_at: string
        }[]
      }
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_effective_currency: {
        Args: {
          entity_id: string
          entity_type: string
          input_tenant_id: string
        }
        Returns: string
      }
      get_user_assignment_scope: {
        Args: { _entity_type: string; _tenant_id: string; _user_id: string }
        Returns: string
      }
      get_user_tenant_memberships: {
        Args: { _user_id: string }
        Returns: {
          active: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant: Json
          tenant_id: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role_in_tenant: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_super_admin: {
        Args: { _tenant_id?: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_tenant_admin_for: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      permanently_delete_entity: {
        Args: { _deleted_item_id: string }
        Returns: undefined
      }
      restore_deleted_entity: {
        Args: { _deleted_item_id: string }
        Returns: undefined
      }
      soft_delete_entity: {
        Args: { _entity_id: string; _table_name: string; _tenant_id: string }
        Returns: undefined
      }
      user_can_modify_contract: {
        Args: { _contract_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_tenant_access: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "call"
        | "email"
        | "meeting"
        | "task"
        | "note"
        | "deal_updated"
        | "customer_updated"
        | "project_updated"
        | "task_completed"
        | "follow_up"
      app_role: "owner" | "admin" | "member" | "super_admin"
      customer_type: "individual" | "company"
      deal_priority: "low" | "medium" | "high"
      deal_status:
        | "lead"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      period_type: "monthly" | "quarterly" | "yearly"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
      project_type:
        | "BOQ"
        | "lighting_calculation"
        | "general"
        | "lighting_control"
        | "elv"
        | "home_automation"
      target_level: "company" | "branch" | "department" | "user"
      target_type:
        | "leads_count"
        | "deals_count"
        | "deals_value"
        | "payments_value"
      todo_priority: "low" | "medium" | "high" | "urgent"
      todo_status: "pending" | "in_progress" | "completed"
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
      activity_type: [
        "call",
        "email",
        "meeting",
        "task",
        "note",
        "deal_updated",
        "customer_updated",
        "project_updated",
        "task_completed",
        "follow_up",
      ],
      app_role: ["owner", "admin", "member", "super_admin"],
      customer_type: ["individual", "company"],
      deal_priority: ["low", "medium", "high"],
      deal_status: [
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      period_type: ["monthly", "quarterly", "yearly"],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      project_type: [
        "BOQ",
        "lighting_calculation",
        "general",
        "lighting_control",
        "elv",
        "home_automation",
      ],
      target_level: ["company", "branch", "department", "user"],
      target_type: [
        "leads_count",
        "deals_count",
        "deals_value",
        "payments_value",
      ],
      todo_priority: ["low", "medium", "high", "urgent"],
      todo_status: ["pending", "in_progress", "completed"],
    },
  },
} as const
