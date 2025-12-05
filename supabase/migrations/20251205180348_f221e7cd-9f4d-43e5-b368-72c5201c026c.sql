-- Populate course_access for existing courses based on their course_target

-- Add access for 'colaborador' where course_target is 'colaborador' or 'both'
INSERT INTO public.course_access (course_id, user_type)
SELECT id, 'colaborador'
FROM public.courses
WHERE course_target IN ('colaborador', 'both')
ON CONFLICT DO NOTHING;

-- Add access for 'cliente' where course_target is 'cliente' or 'both'
INSERT INTO public.course_access (course_id, user_type)
SELECT id, 'cliente'
FROM public.courses
WHERE course_target IN ('cliente', 'both')
ON CONFLICT DO NOTHING;