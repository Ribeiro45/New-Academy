-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  description TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs" 
ON public.activity_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert logs (for manual logging from frontend)
CREATE POLICY "Admins can insert logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_table_name ON public.activity_logs(table_name);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);

-- Function to log changes
CREATE OR REPLACE FUNCTION public.log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_type TEXT;
  record_id UUID;
  old_data JSONB;
  new_data JSONB;
  description TEXT;
BEGIN
  action_type := TG_OP;
  
  IF TG_OP = 'DELETE' THEN
    record_id := OLD.id;
    old_data := to_jsonb(OLD);
    new_data := NULL;
    description := 'Registro excluído de ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'UPDATE' THEN
    record_id := NEW.id;
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    description := 'Registro atualizado em ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'INSERT' THEN
    record_id := NEW.id;
    old_data := NULL;
    new_data := to_jsonb(NEW);
    description := 'Novo registro criado em ' || TG_TABLE_NAME;
  END IF;

  INSERT INTO public.activity_logs (user_id, action, table_name, record_id, old_data, new_data, description)
  VALUES (auth.uid(), action_type, TG_TABLE_NAME, record_id, old_data, new_data, description);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for main tables
CREATE TRIGGER log_courses_changes
AFTER INSERT OR UPDATE OR DELETE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_modules_changes
AFTER INSERT OR UPDATE OR DELETE ON public.modules
FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_lessons_changes
AFTER INSERT OR UPDATE OR DELETE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_quizzes_changes
AFTER INSERT OR UPDATE OR DELETE ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_enrollments_changes
AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_certificates_changes
AFTER INSERT OR UPDATE OR DELETE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_groups_changes
AFTER INSERT OR UPDATE OR DELETE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_user_roles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_faqs_changes
AFTER INSERT OR UPDATE OR DELETE ON public.faqs
FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER log_site_settings_changes
AFTER INSERT OR UPDATE OR DELETE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();