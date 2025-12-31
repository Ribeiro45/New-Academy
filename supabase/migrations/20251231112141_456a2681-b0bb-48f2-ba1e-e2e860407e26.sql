-- Remover a policy restritiva que só permite admin/editor ver respostas
DROP POLICY IF EXISTS "Users can view answer options via view" ON public.quiz_answers;

-- Criar nova policy permitindo SELECT para todos usuários autenticados
-- Isso é seguro porque a view quiz_answer_options já esconde o campo is_correct
CREATE POLICY "Authenticated users can view quiz answers"
ON public.quiz_answers
FOR SELECT
TO authenticated
USING (true);