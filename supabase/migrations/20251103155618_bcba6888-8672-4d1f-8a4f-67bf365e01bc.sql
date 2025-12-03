-- Create modules table
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Create policies for modules
CREATE POLICY "Anyone can view modules"
  ON public.modules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage modules"
  ON public.modules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add module_id to lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE;

-- Update lessons to make course_id nullable (since lessons now belong to modules which belong to courses)
-- But we'll keep course_id for backward compatibility and easier queries
ALTER TABLE public.lessons ALTER COLUMN course_id DROP NOT NULL;

-- Add module_id to quizzes table for module-level quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE;

-- Add constraint to ensure quiz belongs to either a lesson, module, or course (but not multiple)
-- A quiz can be: lesson quiz (lesson_id), module quiz (module_id), or final exam (course_id + is_final_exam)

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module_id ON public.quizzes(module_id);

-- Create trigger to update updated_at on modules
CREATE OR REPLACE FUNCTION public.update_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modules_updated_at();