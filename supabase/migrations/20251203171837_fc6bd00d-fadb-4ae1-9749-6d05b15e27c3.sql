-- Add SELECT policy for quiz_answers (needed to read before delete)
CREATE POLICY "Anyone can view quiz answers" 
ON public.quiz_answers 
FOR SELECT 
USING (true);

-- Add admin policies for enrollments (full access)
CREATE POLICY "Admins can view all enrollments" 
ON public.enrollments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can update enrollments" 
ON public.enrollments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can insert enrollments" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Add admin update policy for user_quiz_attempts
CREATE POLICY "Admins can update quiz attempts" 
ON public.user_quiz_attempts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::text));

-- Add admin update policy for user_quiz_responses
CREATE POLICY "Admins can update quiz responses" 
ON public.user_quiz_responses 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::text));

-- Add leader view policy for group_members (to see member list)
CREATE POLICY "Users can view their own group membership"
ON public.group_members
FOR SELECT
USING (auth.uid() = user_id);