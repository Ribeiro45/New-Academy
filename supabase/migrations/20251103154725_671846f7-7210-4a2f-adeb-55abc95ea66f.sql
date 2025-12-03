-- Drop the old function
DROP FUNCTION IF EXISTS public.check_and_issue_certificate(uuid, uuid);

-- Create updated function that checks quiz average >= 70%
CREATE OR REPLACE FUNCTION public.check_and_issue_certificate(p_user_id uuid, p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  quiz_average NUMERIC;
  cert_exists BOOLEAN;
  total_duration INTEGER;
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
  
  -- Calculate average quiz score for this course
  SELECT COALESCE(AVG(uqa.score), 0) INTO quiz_average
  FROM public.user_quiz_attempts uqa
  JOIN public.quizzes q ON uqa.quiz_id = q.id
  JOIN public.lessons l ON q.lesson_id = l.id
  WHERE uqa.user_id = p_user_id 
    AND l.course_id = p_course_id;
  
  -- Check if certificate already exists
  SELECT EXISTS(
    SELECT 1 FROM public.certificates 
    WHERE user_id = p_user_id AND course_id = p_course_id
  ) INTO cert_exists;
  
  -- If all lessons completed, quiz average >= 70, and no certificate exists, create one
  IF total_lessons > 0 AND completed_lessons = total_lessons AND quiz_average >= 70 AND NOT cert_exists THEN
    INSERT INTO public.certificates (user_id, course_id, certificate_number)
    VALUES (p_user_id, p_course_id, generate_certificate_number());
  END IF;
END;
$$;