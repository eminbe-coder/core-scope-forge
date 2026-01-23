-- =============================================
-- MULTI-TENANCY USER ARCHITECTURE - FK CONSTRAINTS FIX
-- Previous migration added employment fields, this adds remaining FK constraints
-- =============================================

-- Quotes: assigned_to and created_by should reference profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quotes_assigned_to_profiles_fkey' AND table_name = 'quotes'
  ) THEN
    ALTER TABLE public.quotes 
    ADD CONSTRAINT quotes_assigned_to_profiles_fkey 
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quotes_created_by_profiles_fkey' AND table_name = 'quotes'
  ) THEN
    ALTER TABLE public.quotes 
    ADD CONSTRAINT quotes_created_by_profiles_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Projects: assigned_to should reference profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_assigned_to_profiles_fkey' AND table_name = 'projects'
  ) THEN
    ALTER TABLE public.projects 
    ADD CONSTRAINT projects_assigned_to_profiles_fkey 
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Contracts: assigned_to only (no created_by column exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contracts_assigned_to_profiles_fkey' AND table_name = 'contracts'
  ) THEN
    ALTER TABLE public.contracts 
    ADD CONSTRAINT contracts_assigned_to_profiles_fkey 
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Document the multi-tenant user model (only for columns that exist)
COMMENT ON COLUMN public.deals.assigned_to IS 'Global user ID (profiles.id → auth.users.id). NOT a tenant-specific employee.';
COMMENT ON COLUMN public.todos.assigned_to IS 'Global user ID (profiles.id → auth.users.id). NOT a tenant-specific employee.';
COMMENT ON COLUMN public.todos.created_by IS 'Global user ID (profiles.id → auth.users.id). NOT a tenant-specific employee.';
COMMENT ON COLUMN public.activities.assigned_to IS 'Global user ID (profiles.id → auth.users.id). NOT a tenant-specific employee.';
COMMENT ON COLUMN public.activities.created_by IS 'Global user ID (profiles.id → auth.users.id). NOT a tenant-specific employee.';
COMMENT ON COLUMN public.quotes.assigned_to IS 'Global user ID (profiles.id → auth.users.id). NOT a tenant-specific employee.';
COMMENT ON COLUMN public.quotes.created_by IS 'Global user ID (profiles.id → auth.users.id). NOT a tenant-specific employee.';
COMMENT ON COLUMN public.projects.assigned_to IS 'Global user ID (profiles.id → auth.users.id). NOT a tenant-specific employee.';
COMMENT ON COLUMN public.contracts.assigned_to IS 'Global user ID (profiles.id → auth.users.id). NOT a tenant-specific employee.';