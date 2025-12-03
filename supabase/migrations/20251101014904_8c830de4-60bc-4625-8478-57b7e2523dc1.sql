-- Create certificates table
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  certificate_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  cert_number TEXT;
BEGIN
  cert_number := 'CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN cert_number;
END;
$$;

-- Function to check if user completed all lessons and issue certificate
CREATE OR REPLACE FUNCTION check_and_issue_certificate(p_user_id UUID, p_course_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  cert_exists BOOLEAN;
BEGIN
  -- Count total lessons in course
  SELECT COUNT(*) INTO total_lessons
  FROM public.lessons
  WHERE course_id = p_course_id;
  
  -- Count completed lessons by user
  SELECT COUNT(*) INTO completed_lessons
  FROM public.user_progress up
  JOIN public.lessons l ON up.lesson_id = l.id
  WHERE up.user_id = p_user_id 
    AND l.course_id = p_course_id 
    AND up.completed = true;
  
  -- Check if certificate already exists
  SELECT EXISTS(
    SELECT 1 FROM public.certificates 
    WHERE user_id = p_user_id AND course_id = p_course_id
  ) INTO cert_exists;
  
  -- If all lessons completed and no certificate exists, create one
  IF total_lessons > 0 AND completed_lessons = total_lessons AND NOT cert_exists THEN
    INSERT INTO public.certificates (user_id, course_id, certificate_number)
    VALUES (p_user_id, p_course_id, generate_certificate_number());
  END IF;
END;
$$;