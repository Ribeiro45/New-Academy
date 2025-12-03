-- Fix the security definer view issue by recreating with security_invoker
DROP VIEW IF EXISTS public.quiz_answer_options;

CREATE VIEW public.quiz_answer_options 
WITH (security_invoker = true) AS
SELECT 
  id,
  question_id,
  answer,
  created_at
FROM public.quiz_answers;

-- Grant access to the view
GRANT SELECT ON public.quiz_answer_options TO authenticated, anon;

-- Add comment for documentation
COMMENT ON VIEW public.quiz_answer_options IS 'Public view of quiz answers without the is_correct field to prevent cheating. Uses security_invoker to enforce caller permissions.';