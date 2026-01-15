-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can read questions" ON public.question_bank;

-- Create a secure view that excludes sensitive fields
CREATE OR REPLACE VIEW public.question_bank_safe AS
SELECT id, topic, difficulty, question_type, question_text, question_data, options, usage_count, created_at
FROM public.question_bank;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.question_bank_safe TO authenticated;

-- Create a restrictive policy - only allow access through edge functions (service role)
-- No direct client access to the full table
CREATE POLICY "Service role only" 
ON public.question_bank 
FOR SELECT 
USING (auth.role() = 'service_role');