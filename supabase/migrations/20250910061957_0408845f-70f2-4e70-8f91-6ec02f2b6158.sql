-- Add missing foreign key relationships (if they don't exist) for contract payment system

-- Add foreign key from contract_todos to profiles for assigned_to (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_contract_todos_assigned_to'
    ) THEN
        ALTER TABLE contract_todos 
        ADD CONSTRAINT fk_contract_todos_assigned_to 
        FOREIGN KEY (assigned_to) REFERENCES profiles(id);
    END IF;
END $$;

-- Add foreign key from contract_todos to profiles for completed_by (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_contract_todos_completed_by'
    ) THEN
        ALTER TABLE contract_todos 
        ADD CONSTRAINT fk_contract_todos_completed_by 
        FOREIGN KEY (completed_by) REFERENCES profiles(id);
    END IF;
END $$;

-- Add foreign key from contract_todos to profiles for created_by (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_contract_todos_created_by'
    ) THEN
        ALTER TABLE contract_todos 
        ADD CONSTRAINT fk_contract_todos_created_by 
        FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;
END $$;

-- Add foreign key from contract_payment_terms to contracts (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_contract_payment_terms_contract'
    ) THEN
        ALTER TABLE contract_payment_terms 
        ADD CONSTRAINT fk_contract_payment_terms_contract 
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key from contract_payment_attachments to contract_payment_terms (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_contract_payment_attachments_payment_term'
    ) THEN
        ALTER TABLE contract_payment_attachments 
        ADD CONSTRAINT fk_contract_payment_attachments_payment_term 
        FOREIGN KEY (payment_term_id) REFERENCES contract_payment_terms(id) ON DELETE CASCADE;
    END IF;
END $$;