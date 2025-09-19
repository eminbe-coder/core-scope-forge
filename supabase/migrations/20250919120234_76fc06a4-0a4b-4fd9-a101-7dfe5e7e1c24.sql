-- Add todo permissions to the permissions table
INSERT INTO permissions (name, description, module) VALUES 
('todos.create', 'Create new todos', 'todos'),
('todos.edit', 'Edit existing todos', 'todos'),
('todos.view', 'View todos', 'todos'),
('todos.delete', 'Delete todos', 'todos');