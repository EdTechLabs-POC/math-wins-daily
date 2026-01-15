// Diagnostic Flow Types based on the PDF specification

export type DiagnosticLevel = 'level_1' | 'level_2';
export type DiagnosticStatus = 'in_progress' | 'completed' | 'needs_repair';
export type QuestionType = 'multiple_choice' | 'tap_count' | 'drag_drop' | 'fill_blank' | 'word_problem';
export type DifficultyLevel = 'foundation' | 'core' | 'challenge';

// Level 1 Tasks
export interface Level1TaskA {
  type: 'count_objects';
  taskId: 'L1_A';
  instruction: string;
  voicePrompt: string;
  imageUrl: string;
  correctAnswer: number;
  options: { value: number; label: string }[];
}

export interface Level1TaskB {
  type: 'tap_count';
  taskId: 'L1_B';
  instruction: string;
  voicePrompt: string;
  objects: { id: string; x: number; y: number; imageUrl: string }[];
  targetCount: number;
}

// Level 2 Tasks
export interface Level2TaskA {
  type: 'drag_drop_match';
  taskId: 'L2_A';
  instruction: string;
  voicePrompt: string;
  numberSlots: { value: number; x: number; y: number }[];
  objectGroups: { id: string; count: number; imageUrl: string }[];
}

export interface Level2TaskB {
  type: 'count_grouped';
  taskId: 'L2_B';
  instruction: string;
  voicePrompt: string;
  bundleCount: number;
  looseCount: number;
  bundleSize: number;
  imageUrl: string;
  options: { value: number; label: string }[];
}

export type DiagnosticTask = Level1TaskA | Level1TaskB | Level2TaskA | Level2TaskB;

// Routing logic result
export interface TaskResult {
  taskId: string;
  isCorrect: boolean;
  studentAnswer: unknown;
  correctAnswer: unknown;
  timeTakenSeconds: number;
  attemptNumber: number;
}

export interface DiagnosticState {
  currentLevel: DiagnosticLevel;
  currentTask: 'A' | 'B' | 'repair';
  taskResults: TaskResult[];
  repairAttempts: number;
  needsExtraSupport: boolean;
  isComplete: boolean;
  passedLevel1: boolean;
  passedLevel2: boolean;
}

// Repair flow
export interface RepairStep {
  step: number;
  instruction: string;
  voicePrompt: string;
  visualContent: React.ReactNode;
  interactionType: 'watch' | 'practice';
}

// Voice companion messages
export interface VoiceMessage {
  text: string;
  emotion: 'encouraging' | 'celebrating' | 'guiding' | 'comforting' | 'neutral';
  priority: 'high' | 'normal' | 'low';
}

// Question schema for on-the-fly generation
export interface QuestionSchema {
  topic: string;
  difficulty: DifficultyLevel;
  questionType: QuestionType;
  template: string;
  constraints: {
    minValue?: number;
    maxValue?: number;
    allowedOperations?: string[];
    timesTableFocus?: number[];
  };
  validationRules: {
    answerType: 'number' | 'string' | 'array' | 'object';
    checkFunction?: string;
  };
}

// Generated question
export interface GeneratedQuestion {
  id: string;
  schema: QuestionSchema;
  questionText: string;
  questionData: Record<string, unknown>;
  options?: { value: unknown; label: string }[];
  correctAnswer: unknown;
  hint?: string;
  workedExample?: string;
  voicePrompt: string;
}

// Student state for practice sessions
export interface StudentProgress {
  studentId: string;
  studentName: string;
  currentDay: number;
  totalDays: 14;
  diagnosticCompleted: boolean;
  gaps: { topic: string; confidence: number }[];
  strengths: { topic: string; confidence: number }[];
  streakDays: number;
  independenceRate: number;
}
