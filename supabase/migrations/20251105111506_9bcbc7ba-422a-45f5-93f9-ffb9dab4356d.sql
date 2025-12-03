-- Remove sexual_orientation column and add birth_date
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS sexual_orientation;

ALTER TABLE public.profiles 
ADD COLUMN birth_date DATE;

-- Review and ensure RLS policies are properly configured
-- The existing policies already restrict access appropriately:
-- 1. Users can only view/update their own profile
-- 2. Admins can view/update all profiles
-- These policies are secure and prevent unauthorized access