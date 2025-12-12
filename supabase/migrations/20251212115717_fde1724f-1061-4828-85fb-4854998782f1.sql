-- Allow admins to delete activity logs
CREATE POLICY "Admins can delete logs"
ON public.activity_logs FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));