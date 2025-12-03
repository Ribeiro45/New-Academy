-- Create table for course access control
CREATE TABLE IF NOT EXISTS public.course_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('colaborador', 'cliente', 'both')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(course_id, user_type)
);

-- Enable RLS
ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;

-- Policies for course_access
CREATE POLICY "Admins can manage course access"
  ON public.course_access
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view course access"
  ON public.course_access
  FOR SELECT
  USING (true);