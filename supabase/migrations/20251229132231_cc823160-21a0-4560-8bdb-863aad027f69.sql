-- Drop existing incomplete policy
DROP POLICY IF EXISTS "Editors can manage quiz answers" ON quiz_answers;

-- Create corrected policy with WITH CHECK clause
CREATE POLICY "Editors can manage quiz answers" 
ON quiz_answers 
FOR ALL 
TO public
USING (has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'editor'::app_role));