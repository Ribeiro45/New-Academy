-- Add course_id to quizzes table to support course-level final exams
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;

-- Add is_final_exam flag to distinguish final exams from lesson quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_final_exam boolean DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_final_exam ON public.quizzes(is_final_exam);

-- Make lesson_id nullable since final exams are course-level
ALTER TABLE public.quizzes ALTER COLUMN lesson_id DROP NOT NULL;