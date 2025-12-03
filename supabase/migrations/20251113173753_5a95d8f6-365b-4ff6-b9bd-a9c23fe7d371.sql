-- Create FAQ table
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('cliente', 'colaborador', 'ambos')),
  pdf_url TEXT,
  pdf_pages JSONB DEFAULT '[]'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view FAQs"
  ON public.faqs
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage FAQs"
  ON public.faqs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for FAQ PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('faq-pdfs', 'faq-pdfs', true);

-- Storage policies for FAQ PDFs
CREATE POLICY "Public can view FAQ PDFs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'faq-pdfs');

CREATE POLICY "Admins can upload FAQ PDFs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'faq-pdfs' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update FAQ PDFs"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'faq-pdfs' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete FAQ PDFs"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'faq-pdfs' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_faqs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_faqs_updated_at();