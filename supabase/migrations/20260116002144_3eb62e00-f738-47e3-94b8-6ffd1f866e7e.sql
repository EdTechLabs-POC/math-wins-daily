-- Fix 1: Revoke SELECT on question_bank_safe from authenticated to prevent direct client access
-- Questions should only be served via edge functions
REVOKE SELECT ON public.question_bank_safe FROM authenticated;

-- Fix 2: Add UPDATE policy for daily_reports so users can update reports for their students
-- This enables marking reports as opened/clicked from the client
CREATE POLICY "Users can update reports for their students"
ON public.daily_reports FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = daily_reports.student_id
    AND students.user_id = auth.uid()
  )
);

-- Fix 3: Replace TTS rate limit functions with authorization checks
-- This adds defense-in-depth by validating the caller matches the user_id parameter

CREATE OR REPLACE FUNCTION public.check_tts_rate_limit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Authorization check: caller must be the user or service_role
  IF auth.uid() IS DISTINCT FROM p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Cannot check rate limit for other users';
  END IF;
  
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.tts_usage
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '1 hour'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_tts_usage(p_user_id uuid, p_character_count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Authorization check: caller must be the user or service_role
  IF auth.uid() IS DISTINCT FROM p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Cannot log usage for other users';
  END IF;
  
  INSERT INTO public.tts_usage (user_id, character_count)
  VALUES (p_user_id, p_character_count);
END;
$$;