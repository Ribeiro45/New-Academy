-- Add hierarchical structure to FAQs
ALTER TABLE public.faqs 
ADD COLUMN parent_id uuid REFERENCES public.faqs(id) ON DELETE CASCADE,
ADD COLUMN is_section boolean NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_faqs_parent_id ON public.faqs(parent_id);

-- Update existing FAQs to be items (not sections)
UPDATE public.faqs SET is_section = false WHERE is_section IS NULL;