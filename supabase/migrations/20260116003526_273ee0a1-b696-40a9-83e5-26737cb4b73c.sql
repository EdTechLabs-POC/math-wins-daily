-- Add INSERT policy for daily_reports table
-- This allows users to create reports for students they own
CREATE POLICY "Users can insert reports for their students"
ON public.daily_reports FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = daily_reports.student_id
    AND students.user_id = auth.uid()
  )
);