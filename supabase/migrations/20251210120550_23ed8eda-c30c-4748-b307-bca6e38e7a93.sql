-- Add RLS policy to allow users to delete their own enrollments (for incomplete courses)
CREATE POLICY "Users can delete their own enrollments"
ON public.enrollments
FOR DELETE
USING (auth.uid() = user_id);