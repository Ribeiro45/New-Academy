-- Allow groups without an assigned leader initially
ALTER TABLE public.groups
ALTER COLUMN leader_id DROP NOT NULL;