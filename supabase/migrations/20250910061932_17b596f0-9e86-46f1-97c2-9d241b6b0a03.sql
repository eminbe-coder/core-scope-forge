-- Add missing foreign key relationships for contract payment system

-- Add foreign key from contract_payment_terms to contract_payment_stages
ALTER TABLE contract_payment_terms 
ADD CONSTRAINT fk_contract_payment_terms_stage 
FOREIGN KEY (stage_id) REFERENCES contract_payment_stages(id);

-- Add foreign key from contract_todos to profiles for assigned_to
ALTER TABLE contract_todos 
ADD CONSTRAINT fk_contract_todos_assigned_to 
FOREIGN KEY (assigned_to) REFERENCES profiles(id);

-- Add foreign key from contract_todos to profiles for completed_by
ALTER TABLE contract_todos 
ADD CONSTRAINT fk_contract_todos_completed_by 
FOREIGN KEY (completed_by) REFERENCES profiles(id);

-- Add foreign key from contract_todos to profiles for created_by
ALTER TABLE contract_todos 
ADD CONSTRAINT fk_contract_todos_created_by 
FOREIGN KEY (created_by) REFERENCES profiles(id);

-- Add foreign key from contract_payment_terms to contracts
ALTER TABLE contract_payment_terms 
ADD CONSTRAINT fk_contract_payment_terms_contract 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Add foreign key from contract_payment_attachments to contract_payment_terms
ALTER TABLE contract_payment_attachments 
ADD CONSTRAINT fk_contract_payment_attachments_payment_term 
FOREIGN KEY (payment_term_id) REFERENCES contract_payment_terms(id) ON DELETE CASCADE;