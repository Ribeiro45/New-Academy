-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for topic cards
CREATE TABLE public.topic_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'FileText',
  color TEXT NOT NULL DEFAULT 'orange',
  order_index INTEGER NOT NULL DEFAULT 0,
  link_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topic_cards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view topic cards" 
ON public.topic_cards 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage topic cards" 
ON public.topic_cards 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_topic_cards_updated_at
BEFORE UPDATE ON public.topic_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default topic cards
INSERT INTO public.topic_cards (title, description, icon, color, order_index, link_url) VALUES
('Primeiros Passos', 'Comece sua jornada de aprendizado', 'Lightbulb', 'orange', 1, '/courses'),
('Guias de Funcionamento', 'Aprenda como funciona o sistema', 'BookOpen', 'orange', 2, '/faq'),
('Solução de Problemas', 'Encontre respostas rápidas', 'AlertCircle', 'orange', 3, '/faq'),
('APIs e Desenvolvimento', 'Documentação técnica', 'Code', 'orange', 4, '/faq');