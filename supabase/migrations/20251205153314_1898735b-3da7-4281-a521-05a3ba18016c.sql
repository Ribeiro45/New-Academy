CREATE OR REPLACE FUNCTION public.check_and_issue_certificate(p_user_id uuid, p_course_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  has_final_exam BOOLEAN;
  passed_final_exam BOOLEAN;
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
  
  -- Check if course has a final exam
  SELECT EXISTS(
    SELECT 1 FROM public.quizzes 
    WHERE course_id = p_course_id AND is_final_exam = true
  ) INTO has_final_exam;

  -- If course has final exam, check if user passed it
  IF has_final_exam THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_quiz_attempts uqa
      JOIN public.quizzes q ON uqa.quiz_id = q.id
      WHERE uqa.user_id = p_user_id 
        AND q.course_id = p_course_id 
        AND q.is_final_exam = true
        AND uqa.passed = true
    ) INTO passed_final_exam;
  ELSE
    -- If no final exam, consider as passed
    passed_final_exam := TRUE;
  END IF;
  
  -- Check if certificate already exists
  SELECT EXISTS(
    SELECT 1 FROM public.certificates 
    WHERE user_id = p_user_id AND course_id = p_course_id
  ) INTO cert_exists;
  
  -- Issue certificate if:
  -- 1. All lessons completed (100%)
  -- 2. No final exam OR passed final exam
  -- 3. Certificate doesn't exist yet
  IF total_lessons > 0 AND completed_lessons = total_lessons AND passed_final_exam AND NOT cert_exists THEN
    INSERT INTO public.certificates (user_id, course_id, certificate_number)
    VALUES (p_user_id, p_course_id, generate_certificate_number());
  END IF;
END;
$function$;