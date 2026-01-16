-- First create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create student_progress table to track daily progress
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 14),
  questions_completed JSONB DEFAULT '[]'::jsonb,
  questions_correct INTEGER DEFAULT 0,
  questions_total INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, day_number)
);

-- Create level_assessments table to track initial AI-generated assessments
CREATE TABLE IF NOT EXISTS public.level_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL DEFAULT 'initial',
  questions_asked JSONB NOT NULL DEFAULT '[]'::jsonb,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  determined_level TEXT,
  confidence_score DECIMAL(3,2),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voice_feedback_log to track voice interactions
CREATE TABLE IF NOT EXISTS public.voice_feedback_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID,
  feedback_type TEXT NOT NULL,
  message_text TEXT NOT NULL,
  emotion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_feedback_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_progress
CREATE POLICY "Users can view their students progress" ON public.student_progress
FOR SELECT USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert progress for their students" ON public.student_progress
FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their students progress" ON public.student_progress
FOR UPDATE USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

-- RLS policies for level_assessments
CREATE POLICY "Users can view their students assessments" ON public.level_assessments
FOR SELECT USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert assessments for their students" ON public.level_assessments
FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their students assessments" ON public.level_assessments
FOR UPDATE USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

-- RLS policies for voice_feedback_log
CREATE POLICY "Users can view their students voice logs" ON public.voice_feedback_log
FOR SELECT USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert voice logs for their students" ON public.voice_feedback_log
FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

-- Add trigger for updated_at on student_progress
CREATE TRIGGER update_student_progress_updated_at
BEFORE UPDATE ON public.student_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();