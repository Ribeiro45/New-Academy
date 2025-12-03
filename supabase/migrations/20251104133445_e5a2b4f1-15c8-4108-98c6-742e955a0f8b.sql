-- Allow users to delete their own progress and quiz data so resets work

-- Users can delete their own progress
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_progress' AND policyname = 'Users can delete their own progress'
  ) THEN
    CREATE POLICY "Users can delete their own progress"
    ON public.user_progress
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own quiz attempts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_quiz_attempts' AND policyname = 'Users can delete their own attempts'
  ) THEN
    CREATE POLICY "Users can delete their own attempts"
    ON public.user_quiz_attempts
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own quiz responses (linked via attempt_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_quiz_responses' AND policyname = 'Users can delete their own responses'
  ) THEN
    CREATE POLICY "Users can delete their own responses"
    ON public.user_quiz_responses
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.user_quiz_attempts a
        WHERE a.id = user_quiz_responses.attempt_id
          AND a.user_id = auth.uid()
      )
    );
  END IF;
END $$;
