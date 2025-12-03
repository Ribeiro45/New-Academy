-- Adicionar campos de informação do curso
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS total_modules INTEGER,
ADD COLUMN IF NOT EXISTS total_lessons INTEGER;

-- Criar tabela para dados de empresa (clientes)
CREATE TABLE IF NOT EXISTS public.company_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_profiles
CREATE POLICY "Users can view their own company profile"
ON public.company_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own company profile"
ON public.company_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company profile"
ON public.company_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all company profiles"
ON public.company_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all company profiles"
ON public.company_profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add user_type to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'colaborador' CHECK (user_type IN ('colaborador', 'cliente'));