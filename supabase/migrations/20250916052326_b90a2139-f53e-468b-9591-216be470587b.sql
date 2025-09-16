-- Add due_time field to todos table
ALTER TABLE todos ADD COLUMN due_time TIME DEFAULT NULL;