-- Fix 1: Drop the permissive "Anyone can view quiz answers" policy and create a restricted one
DROP POLICY IF EXISTS "Anyone can view quiz answers" ON public.quiz_answers;

-- Create a view that only exposes non-sensitive answer fields
CREATE OR REPLACE VIEW public.quiz_answer_options AS
SELECT 
  id,
  question_id,
  answer,
  created_at
  -- is_correct is intentionally NOT included
FROM public.quiz_answers;

-- Grant select on the view
GRANT SELECT ON public.quiz_answer_options TO anon, authenticated;

-- Create policy to allow users to view answer options (without is_correct)
-- The quiz_answers table now requires admin/editor access for full data
CREATE POLICY "Users can view answer options via view" 
ON public.quiz_answers 
FOR SELECT 
USING (
  -- Only allow direct quiz_answers access to admins/editors
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role)
);

-- Fix 2: Add INSERT policy for certificates table
-- Users can generate their own certificate (limited to one per course)
CREATE POLICY "Users can generate their own certificates"
ON public.certificates
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.certificates c 
    WHERE c.user_id = auth.uid() AND c.course_id = certificates.course_id
  )
);