-- Create a table to track TTS API usage for rate limiting
CREATE TABLE public.tts_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  character_count INTEGER NOT NULL DEFAULT 0
);

-- Create index for efficient rate limit queries
CREATE INDEX idx_tts_usage_user_created ON public.tts_usage (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.tts_usage ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own usage records
CREATE POLICY "Users can insert their own TTS usage"
ON public.tts_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own usage (for displaying remaining quota if needed)
CREATE POLICY "Users can view their own TTS usage"
ON public.tts_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Create a function to check rate limit (returns count of requests in last hour)
CREATE OR REPLACE FUNCTION public.check_tts_rate_limit(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.tts_usage
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Create a function to log TTS usage
CREATE OR REPLACE FUNCTION public.log_tts_usage(p_user_id UUID, p_character_count INTEGER)
RETURNS VOID AS $$
  INSERT INTO public.tts_usage (user_id, character_count)
  VALUES (p_user_id, p_character_count);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Cleanup old records (optional - keeps table size manageable)
-- Records older than 24 hours can be deleted as they're no longer needed for rate limiting
CREATE OR REPLACE FUNCTION public.cleanup_old_tts_usage()
RETURNS VOID AS $$
  DELETE FROM public.tts_usage
  WHERE created_at < NOW() - INTERVAL '24 hours';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;