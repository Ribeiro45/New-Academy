-- Create enrollments table to track user course enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Users can view their own enrollments
CREATE POLICY "Users can view their own enrollments"
ON public.enrollments FOR SELECT
USING (auth.uid() = user_id);

-- Users can enroll in courses
CREATE POLICY "Users can enroll in courses"
ON public.enrollments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments"
ON public.enrollments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all enrollments
CREATE POLICY "Admins can manage enrollments"
ON public.enrollments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));