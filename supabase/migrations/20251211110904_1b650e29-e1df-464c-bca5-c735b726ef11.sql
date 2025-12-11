-- Criar tabela de acesso FAQ por grupo
CREATE TABLE public.faq_section_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_section_id uuid NOT NULL REFERENCES public.faqs(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(faq_section_id, group_id)
);

-- Habilitar RLS
ALTER TABLE public.faq_section_access ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage FAQ section access"
ON public.faq_section_access FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view FAQ section access"
ON public.faq_section_access FOR SELECT
USING (true);