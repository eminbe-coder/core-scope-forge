-- Add foreign key constraint for todos.assigned_to -> profiles.id
ALTER TABLE public.todos 
ADD CONSTRAINT todos_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);

-- Add foreign key constraint for todos.created_by -> profiles.id  
ALTER TABLE public.todos 
ADD CONSTRAINT todos_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- Add foreign key constraint for todos.completed_by -> profiles.id
ALTER TABLE public.todos 
ADD CONSTRAINT todos_completed_by_fkey 
FOREIGN KEY (completed_by) REFERENCES public.profiles(id);