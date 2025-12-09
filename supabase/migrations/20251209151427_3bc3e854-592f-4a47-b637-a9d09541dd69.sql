-- Drop ALL policies that depend on has_role(uuid, text)
DROP POLICY IF EXISTS "Editors can manage quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Editors can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Editors can manage quiz answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Now drop the problematic function
DROP FUNCTION IF EXISTS public.has_role(uuid, text);

-- Recreate editor policies with correct signature
CREATE POLICY "Editors can manage quizzes" ON public.quizzes
  FOR ALL USING (public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Editors can manage quiz questions" ON public.quiz_questions
  FOR ALL USING (public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Editors can manage quiz answers" ON public.quiz_answers
  FOR ALL USING (public.has_role(auth.uid(), 'editor'::app_role));

-- Recreate user_roles policies with correct signature
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));