-- Add foreign key constraint for assigned_to field in contracts table
ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_assigned_to 
FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);