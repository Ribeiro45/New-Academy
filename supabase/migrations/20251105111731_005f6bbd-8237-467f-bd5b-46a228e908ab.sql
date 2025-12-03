-- Remove public access to is_correct field in quiz_answers
DROP POLICY IF EXISTS "Users can view quiz answers" ON public.quiz_answers;

-- Create a view that exposes only safe fields (without is_correct)
CREATE OR REPLACE VIEW public.quiz_answer_options AS
SELECT 
  id,
  question_id,
  answer,
  created_at
FROM public.quiz_answers;

-- Grant access to the view
GRANT SELECT ON public.quiz_answer_options TO authenticated, anon;

-- Add comment for documentation
COMMENT ON VIEW public.quiz_answer_options IS 'Public view of quiz answers without the is_correct field to prevent cheating';