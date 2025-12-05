-- Criar bucket para thumbnails de cursos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir leitura pública das thumbnails
CREATE POLICY "Public read access for course thumbnails"
ON storage.objects
FOR SELECT
USING (bucket_id = 'course-thumbnails');

-- Política para admins e editores fazerem upload
CREATE POLICY "Admins and editors can upload course thumbnails"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-thumbnails' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'editor'::app_role)
  )
);

-- Política para admins e editores deletarem
CREATE POLICY "Admins and editors can delete course thumbnails"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'course-thumbnails' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'editor'::app_role)
  )
);