-- Create site_settings table to store homepage and demo page configurations
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view settings
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage site settings"
ON public.site_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.site_settings (setting_key, setting_value) VALUES
('homepage_hero', jsonb_build_object(
  'badge_text', 'New Academy - Plataforma de Aprendizado',
  'title_line1', 'Transforme seu',
  'title_line2', 'Conhecimento',
  'description', 'Acesse cursos de alta qualidade, acompanhe seu progresso e obtenha certificados reconhecidos.',
  'video_url', 'https://www.youtube.com/embed/dQw4w9WgXcQ'
)),
('homepage_features', jsonb_build_object(
  'section_title', 'Por que escolher nossa plataforma?',
  'section_subtitle', 'Recursos poderosos para acelerar seu aprendizado'
)),
('homepage_cta', jsonb_build_object(
  'title', 'Pronto para começar?',
  'description', 'Junte-se a centenas de colaboradores que já estão transformando suas carreiras'
)),
('demo_page', jsonb_build_object(
  'title', 'Como Funciona a Plataforma',
  'subtitle', 'Um overview completo da New Academy e seus recursos',
  'video_url', 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'video_title', 'Tutorial Completo da Plataforma'
))
ON CONFLICT (setting_key) DO NOTHING;

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_site_settings_updated_at();