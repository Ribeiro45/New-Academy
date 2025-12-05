-- Atualizar a função handle_new_user para sempre definir user_type como 'cliente'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, user_type)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.email,
    'cliente'  -- Todos os novos usuários começam como cliente
  );
  RETURN new;
EXCEPTION 
  WHEN unique_violation THEN
    RAISE NOTICE 'Profile already exists for user: %', new.id;
    RETURN new;
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating profile: %', SQLERRM;
    RETURN new;
END;
$function$;