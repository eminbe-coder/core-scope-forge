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
      companies: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          email: string | null
          headquarters: string | null
          id: string
          industry: string | null
          instagram_page: string | null
          is_lead: boolean | null
          linkedin_page: string | null
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          size: string | null
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          email?: string | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          instagram_page?: string | null
          is_lead?: boolean | null
          linkedin_page?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          size?: string | null
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          email?: string | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          instagram_page?: string | null
          is_lead?: boolean | null
          linkedin_page?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          size?: string | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
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
          created_at: string
          customer_id: string | null
          email: string | null
          first_name: string
          id: string
          is_lead: boolean
          last_name: string | null
          notes: string | null
          phone: string | null
          position: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_lead?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_lead?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
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
          notes: string | null
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
          notes?: string | null
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
          notes?: string | null
          stage_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      contracts: {
        Row: {
          assigned_to: string | null
          created_at: string
          currency_id: string | null
          customer_id: string | null
          customer_reference_number: string | null
          deal_id: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          signed_date: string | null
          site_id: string | null
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
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          signed_date?: string | null
          site_id?: string | null
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
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          signed_date?: string | null
          site_id?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: []
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
      deals: {
        Row: {
          assigned_to: string | null
          created_at: string
          currency_id: string | null
          customer_id: string | null
          customer_reference_number: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          name: string
          notes: string | null
          priority: Database["public"]["Enums"]["deal_priority"] | null
          probability: number | null
          site_id: string | null
          stage_id: string | null
          status: Database["public"]["Enums"]["deal_status"]
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
          description?: string | null
          expected_close_date?: string | null
          id?: string
          name: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"] | null
          probability?: number | null
          site_id?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
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
          description?: string | null
          expected_close_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["deal_priority"] | null
          probability?: number | null
          site_id?: string | null
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
        ]
      }
      devices: {
        Row: {
          active: boolean
          brand: string | null
          category: string
          created_at: string
          currency_id: string | null
          id: string
          model: string | null
          name: string
          specifications: Json | null
          tenant_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          category: string
          created_at?: string
          currency_id?: string | null
          id?: string
          model?: string | null
          name: string
          specifications?: Json | null
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          category?: string
          created_at?: string
          currency_id?: string | null
          id?: string
          model?: string | null
          name?: string
          specifications?: Json | null
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
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
          created_at: string
          customer_id: string | null
          id: string
          images: string[] | null
          is_lead: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          postal_code: string | null
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
          created_at?: string
          customer_id?: string | null
          id?: string
          images?: string[] | null
          is_lead?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          postal_code?: string | null
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
          created_at?: string
          customer_id?: string | null
          id?: string
          images?: string[] | null
          is_lead?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          postal_code?: string | null
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
          cr_number: string | null
          created_at: string
          default_currency_id: string | null
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
          cr_number?: string | null
          created_at?: string
          default_currency_id?: string | null
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
          cr_number?: string | null
          created_at?: string
          default_currency_id?: string | null
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
      user_dashboard_configs: {
        Row: {
          active: boolean
          created_at: string
          filters: Json | null
          height: number
          id: string
          position_x: number
          position_y: number
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
          position_x?: number
          position_y?: number
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
          position_x?: number
          position_y?: number
          settings?: Json | null
          updated_at?: string
          user_id?: string
          widget_id?: string
          width?: number
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      is_super_admin: {
        Args: { _user_id: string }
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
    },
  },
} as const
