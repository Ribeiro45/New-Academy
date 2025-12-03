-- Add admin delete policy for enrollments
CREATE POLICY "Admins can delete enrollments" 
ON public.enrollments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::text));

-- Add admin delete policy for user_quiz_attempts
CREATE POLICY "Admins can delete quiz attempts" 
ON public.user_quiz_attempts 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::text));

-- Add admin delete policy for user_quiz_responses
CREATE POLICY "Admins can delete quiz responses" 
ON public.user_quiz_responses 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::text));