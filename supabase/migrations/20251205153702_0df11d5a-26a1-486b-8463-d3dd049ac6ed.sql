CREATE OR REPLACE FUNCTION public.check_and_issue_certificate(p_user_id uuid, p_course_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  total_quizzes INTEGER;
  passed_quizzes INTEGER;
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
  
  -- Count total quizzes in course (including lesson quizzes, module quizzes, and final exam)
  SELECT COUNT(*) INTO total_quizzes
  FROM public.quizzes q
  WHERE q.course_id = p_course_id
     OR q.lesson_id IN (SELECT id FROM public.lessons WHERE course_id = p_course_id)
     OR q.module_id IN (SELECT id FROM public.modules WHERE course_id = p_course_id);

  -- Count quizzes passed by user
  SELECT COUNT(DISTINCT q.id) INTO passed_quizzes
  FROM public.quizzes q
  JOIN public.user_quiz_attempts uqa ON uqa.quiz_id = q.id
  WHERE uqa.user_id = p_user_id
    AND uqa.passed = true
    AND (
      q.course_id = p_course_id
      OR q.lesson_id IN (SELECT id FROM public.lessons WHERE course_id = p_course_id)
      OR q.module_id IN (SELECT id FROM public.modules WHERE course_id = p_course_id)
    );
  
  -- Check if certificate already exists
  SELECT EXISTS(
    SELECT 1 FROM public.certificates 
    WHERE user_id = p_user_id AND course_id = p_course_id
  ) INTO cert_exists;
  
  -- Issue certificate if:
  -- 1. All lessons completed (100%)
  -- 2. All quizzes passed (or no quizzes exist)
  -- 3. Certificate doesn't exist yet
  IF total_lessons > 0 
     AND completed_lessons = total_lessons 
     AND (total_quizzes = 0 OR passed_quizzes = total_quizzes)
     AND NOT cert_exists THEN
    INSERT INTO public.certificates (user_id, course_id, certificate_number)
    VALUES (p_user_id, p_course_id, generate_certificate_number());
  END IF;
END;
$function$;