-- Add registration settings to site_settings
INSERT INTO public.site_settings (setting_key, setting_value)
VALUES ('registration_settings', '{"allow_client_registration": false}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;