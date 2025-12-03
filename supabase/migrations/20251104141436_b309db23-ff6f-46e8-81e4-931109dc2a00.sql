-- Add policies for editors to manage quizzes
CREATE POLICY "Editors can manage quizzes"
ON public.quizzes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'editor'));

-- Add policies for editors to manage quiz questions
CREATE POLICY "Editors can manage quiz questions"
ON public.quiz_questions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'editor'));

-- Add policies for editors to manage quiz answers
CREATE POLICY "Editors can manage quiz answers"
ON public.quiz_answers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'editor'));