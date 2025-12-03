-- Drop existing restrictive policies and create permissive ones for admin full access

-- COURSES
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- MODULES
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- LESSONS
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- QUIZZES
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;
CREATE POLICY "Admins can manage quizzes" ON public.quizzes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- QUIZ_QUESTIONS
DROP POLICY IF EXISTS "Admins can manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins can manage quiz questions" ON public.quiz_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- QUIZ_ANSWERS
DROP POLICY IF EXISTS "Admins can manage quiz answers" ON public.quiz_answers;
CREATE POLICY "Admins can manage quiz answers" ON public.quiz_answers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ENROLLMENTS
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admins can insert enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admins can update enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admins can delete enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- CERTIFICATES
DROP POLICY IF EXISTS "Admins can view all certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admins can insert certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admins can update certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admins can delete certificates" ON public.certificates;
CREATE POLICY "Admins can manage certificates" ON public.certificates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- USER_PROGRESS
DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_progress;
DROP POLICY IF EXISTS "Admins can insert progress" ON public.user_progress;
DROP POLICY IF EXISTS "Admins can update all progress" ON public.user_progress;
DROP POLICY IF EXISTS "Admins can delete progress" ON public.user_progress;
CREATE POLICY "Admins can manage user progress" ON public.user_progress FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- USER_QUIZ_ATTEMPTS
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.user_quiz_attempts;
DROP POLICY IF EXISTS "Admins can update quiz attempts" ON public.user_quiz_attempts;
DROP POLICY IF EXISTS "Admins can delete quiz attempts" ON public.user_quiz_attempts;
DROP POLICY IF EXISTS "Admins can manage quiz attempts" ON public.user_quiz_attempts;
CREATE POLICY "Admins can manage quiz attempts" ON public.user_quiz_attempts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- USER_QUIZ_RESPONSES
DROP POLICY IF EXISTS "Admins can view all responses" ON public.user_quiz_responses;
DROP POLICY IF EXISTS "Admins can update quiz responses" ON public.user_quiz_responses;
DROP POLICY IF EXISTS "Admins can delete quiz responses" ON public.user_quiz_responses;
DROP POLICY IF EXISTS "Admins can manage quiz responses" ON public.user_quiz_responses;
CREATE POLICY "Admins can manage quiz responses" ON public.user_quiz_responses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- COURSE_ACCESS
DROP POLICY IF EXISTS "Admins can manage course access" ON public.course_access;
CREATE POLICY "Admins can manage course access" ON public.course_access FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));