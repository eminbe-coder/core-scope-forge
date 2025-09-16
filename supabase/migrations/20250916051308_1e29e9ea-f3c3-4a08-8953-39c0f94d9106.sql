-- Add contact_id field to todos table to link todos to contacts
ALTER TABLE public.todos ADD COLUMN contact_id uuid;

-- Add foreign key constraint (but allow null since not all todos need to be linked to contacts)
ALTER TABLE public.todos ADD CONSTRAINT todos_contact_id_fkey 
FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_todos_contact_id ON public.todos(contact_id) WHERE contact_id IS NOT NULL;