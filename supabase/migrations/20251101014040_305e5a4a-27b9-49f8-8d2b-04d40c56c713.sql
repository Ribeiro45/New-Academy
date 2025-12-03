-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  USING (true);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons"
  ON public.lessons FOR SELECT
  USING (true);

-- Create user_progress table
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample courses
INSERT INTO public.courses (id, title, description, thumbnail_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Introdução ao Desenvolvimento Web', 'Aprenda os fundamentos do desenvolvimento web moderno', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800'),
  ('550e8400-e29b-41d4-a716-446655440002', 'JavaScript Avançado', 'Domine conceitos avançados de JavaScript', 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800'),
  ('550e8400-e29b-41d4-a716-446655440003', 'React do Zero', 'Construa aplicações modernas com React', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800');

-- Insert sample lessons
INSERT INTO public.lessons (course_id, title, youtube_url, order_index, duration_minutes) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'O que é Desenvolvimento Web?', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, 15),
  ('550e8400-e29b-41d4-a716-446655440001', 'HTML Básico', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2, 30),
  ('550e8400-e29b-41d4-a716-446655440001', 'CSS Fundamentos', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 3, 45),
  ('550e8400-e29b-41d4-a716-446655440002', 'Closures e Scope', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, 25),
  ('550e8400-e29b-41d4-a716-446655440002', 'Async/Await', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2, 35),
  ('550e8400-e29b-41d4-a716-446655440003', 'Instalação e Setup', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, 20),
  ('550e8400-e29b-41d4-a716-446655440003', 'Componentes', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2, 40);