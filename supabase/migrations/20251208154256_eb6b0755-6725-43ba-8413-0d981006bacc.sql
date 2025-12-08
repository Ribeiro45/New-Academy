-- Fix the SECURITY DEFINER view issue by recreating it as SECURITY INVOKER
DROP VIEW IF EXISTS public.quiz_answer_options;

CREATE VIEW public.quiz_answer_options 
WITH (security_invoker = true) AS
SELECT 
  id,
  question_id,
  answer,
  created_at
FROM public.quiz_answers;

-- Grant select on the view
GRANT SELECT ON public.quiz_answer_options TO anon, authenticated;