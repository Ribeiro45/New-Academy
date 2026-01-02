-- Permitir que editores gerenciem FAQs
CREATE POLICY "Editors can manage FAQs"
ON public.faqs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'editor'::app_role));

-- Permitir que editores gerenciem storage de faq-pdfs
CREATE POLICY "Editors can upload faq pdfs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'faq-pdfs' AND has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Editors can update faq pdfs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'faq-pdfs' AND has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Editors can delete faq pdfs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'faq-pdfs' AND has_role(auth.uid(), 'editor'::app_role));