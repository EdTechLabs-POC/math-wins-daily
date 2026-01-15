-- Create enum types
CREATE TYPE public.difficulty_level AS ENUM ('foundation', 'core', 'challenge');
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'tap_count', 'drag_drop', 'fill_blank', 'word_problem');
CREATE TYPE public.diagnostic_status AS ENUM ('in_progress', 'completed', 'needs_repair');
CREATE TYPE public.diagnostic_level AS ENUM ('level_1', 'level_2');

-- Table 1: Students
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    age INT CHECK (age BETWEEN 6 AND 10),
    parent_email VARCHAR(255) NOT NULL,
    parent_name VARCHAR(100),
    cohort VARCHAR(50) DEFAULT 'POC_Jan2026',
    diagnostic_completed_at TIMESTAMPTZ,
    current_level diagnostic_level DEFAULT 'level_1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students
CREATE POLICY "Users can view their own students"
ON public.students FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own students"
ON public.students FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own students"
ON public.students FOR UPDATE
USING (auth.uid() = user_id);

-- Table 2: Diagnostics
CREATE TABLE public.diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    level diagnostic_level NOT NULL,
    status diagnostic_status DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_questions INT DEFAULT 0,
    total_correct INT DEFAULT 0,
    time_taken_seconds INT,
    gaps_identified JSONB DEFAULT '[]'::jsonb,
    strengths JSONB DEFAULT '[]'::jsonb,
    repair_attempts INT DEFAULT 0,
    needs_extra_support BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnostics (via student ownership)
CREATE POLICY "Users can view diagnostics for their students"
ON public.diagnostics FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = diagnostics.student_id
        AND students.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert diagnostics for their students"
ON public.diagnostics FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = diagnostics.student_id
        AND students.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update diagnostics for their students"
ON public.diagnostics FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = diagnostics.student_id
        AND students.user_id = auth.uid()
    )
);

-- Table 3: Diagnostic Attempts (individual question attempts during diagnostic)
CREATE TABLE public.diagnostic_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_id UUID REFERENCES public.diagnostics(id) ON DELETE CASCADE NOT NULL,
    task_id VARCHAR(50) NOT NULL,
    question_data JSONB NOT NULL,
    student_answer JSONB,
    correct_answer JSONB NOT NULL,
    is_correct BOOLEAN,
    attempt_number INT DEFAULT 1,
    time_taken_seconds INT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.diagnostic_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnostic_attempts
CREATE POLICY "Users can view diagnostic attempts for their students"
ON public.diagnostic_attempts FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.diagnostics d
        JOIN public.students s ON s.id = d.student_id
        WHERE d.id = diagnostic_attempts.diagnostic_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert diagnostic attempts for their students"
ON public.diagnostic_attempts FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.diagnostics d
        JOIN public.students s ON s.id = d.student_id
        WHERE d.id = diagnostic_attempts.diagnostic_id
        AND s.user_id = auth.uid()
    )
);

-- Table 4: Practice Sessions (for the 14-day practice loop)
CREATE TABLE public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    session_number INT CHECK (session_number BETWEEN 1 AND 14),
    session_date DATE DEFAULT CURRENT_DATE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INT,
    warmup_questions JSONB DEFAULT '[]'::jsonb,
    stretch_questions JSONB DEFAULT '[]'::jsonb,
    reflection_text TEXT,
    reflection_emoji VARCHAR(10),
    confidence_scores JSONB DEFAULT '{}'::jsonb,
    completion_rate FLOAT,
    hints_requested INT DEFAULT 0,
    total_attempts INT DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for practice_sessions
CREATE POLICY "Users can view practice sessions for their students"
ON public.practice_sessions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = practice_sessions.student_id
        AND students.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert practice sessions for their students"
ON public.practice_sessions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = practice_sessions.student_id
        AND students.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update practice sessions for their students"
ON public.practice_sessions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = practice_sessions.student_id
        AND students.user_id = auth.uid()
    )
);

-- Table 5: Question Bank (cached/pre-built questions)
CREATE TABLE public.question_bank (
    id VARCHAR(100) PRIMARY KEY,
    topic VARCHAR(100) NOT NULL,
    difficulty difficulty_level NOT NULL,
    question_type question_type NOT NULL,
    question_text TEXT NOT NULL,
    question_data JSONB NOT NULL,
    options JSONB,
    correct_answer JSONB NOT NULL,
    hint TEXT,
    worked_example TEXT,
    common_mistake TEXT,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (public read for questions)
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions"
ON public.question_bank FOR SELECT
TO authenticated
USING (true);

-- Table 6: Daily Reports
CREATE TABLE public.daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.practice_sessions(id),
    report_date DATE DEFAULT CURRENT_DATE,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_dashboard BOOLEAN DEFAULT FALSE,
    report_html TEXT,
    improvements JSONB,
    shaky_areas JSONB,
    next_focus JSONB,
    needs_help BOOLEAN,
    days_to_close_gaps INT
);

-- Enable RLS
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports for their students"
ON public.daily_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = daily_reports.student_id
        AND students.user_id = auth.uid()
    )
);

-- Create indexes for performance
CREATE INDEX idx_students_user ON public.students(user_id);
CREATE INDEX idx_diagnostics_student ON public.diagnostics(student_id);
CREATE INDEX idx_diagnostic_attempts_diagnostic ON public.diagnostic_attempts(diagnostic_id);
CREATE INDEX idx_sessions_student ON public.practice_sessions(student_id);
CREATE INDEX idx_sessions_date ON public.practice_sessions(session_date);
CREATE INDEX idx_reports_student ON public.daily_reports(student_id);
CREATE INDEX idx_question_bank_topic ON public.question_bank(topic);
CREATE INDEX idx_question_bank_difficulty ON public.question_bank(difficulty);