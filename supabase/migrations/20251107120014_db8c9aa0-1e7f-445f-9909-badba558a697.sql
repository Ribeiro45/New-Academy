-- Step 1: Add CPF field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text UNIQUE;

-- Step 2: Add course_target enum and field
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_target') THEN
        CREATE TYPE public.course_target AS ENUM ('colaborador', 'cliente', 'both');
    END IF;
END $$;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_target text DEFAULT 'both' NOT NULL;

-- Step 3: Create unique constraint for CNPJ + company_name combination
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_cnpj_company_name'
    ) THEN
        ALTER TABLE public.company_profiles 
        ADD CONSTRAINT unique_cnpj_company_name UNIQUE (cnpj, company_name);
    END IF;
END $$;