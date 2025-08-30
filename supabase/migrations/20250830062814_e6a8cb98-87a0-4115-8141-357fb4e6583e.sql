-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT NOT NULL, -- 'contract', 'deal', 'payment', 'todo', etc.
  entity_id UUID,
  notification_type TEXT NOT NULL, -- 'contract_updated', 'payment_due', 'todo_assigned', etc.
  read_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid() AND user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid() AND user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create RLS policies for notification preferences
CREATE POLICY "Users can manage their notification preferences" 
ON public.notification_preferences 
FOR ALL 
USING (user_id = auth.uid() AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_id = auth.uid() AND user_has_tenant_access(auth.uid(), tenant_id));

-- Create updated_at triggers
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  _tenant_id UUID,
  _user_id UUID,
  _title TEXT,
  _message TEXT,
  _entity_type TEXT,
  _entity_id UUID,
  _notification_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
  user_wants_notification BOOLEAN := true;
BEGIN
  -- Check if user wants this type of notification
  SELECT enabled INTO user_wants_notification
  FROM notification_preferences
  WHERE user_id = _user_id 
    AND tenant_id = _tenant_id 
    AND notification_type = _notification_type;
  
  -- If no preference found, default to enabled
  IF user_wants_notification IS NULL THEN
    user_wants_notification := true;
  END IF;
  
  -- Only create notification if user wants it
  IF user_wants_notification THEN
    INSERT INTO notifications (
      tenant_id, user_id, title, message, entity_type, 
      entity_id, notification_type
    ) VALUES (
      _tenant_id, _user_id, _title, _message, _entity_type,
      _entity_id, _notification_type
    ) RETURNING id INTO notification_id;
  END IF;
  
  RETURN notification_id;
END;
$$;