-- Allow authenticated users to insert activity logs (for view tracking)
CREATE POLICY "Authenticated users can insert logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);