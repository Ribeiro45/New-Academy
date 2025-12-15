-- Create table for FAQ notes
CREATE TABLE public.faq_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faq_id UUID NOT NULL REFERENCES public.faqs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faq_notes ENABLE ROW LEVEL SECURITY;

-- Users can view all notes
CREATE POLICY "Anyone can view faq notes"
ON public.faq_notes
FOR SELECT
USING (true);

-- Users can insert their own notes
CREATE POLICY "Authenticated users can insert notes"
ON public.faq_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update their own notes"
ON public.faq_notes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
ON public.faq_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all notes
CREATE POLICY "Admins can manage all notes"
ON public.faq_notes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_faq_notes_updated_at
  BEFORE UPDATE ON public.faq_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();