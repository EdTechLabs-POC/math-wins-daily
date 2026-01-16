import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedVoiceCompanion } from '@/hooks/useEnhancedVoiceCompanion';
import { Loader2, Star, Volume2, VolumeX } from 'lucide-react';

interface AssessmentQuestion {
  type: 'count_objects' | 'multiple_choice' | 'comparison';
  instruction: string;
  voicePrompt: string;
  imageDescription: string;
  options?: { value: number; label: string }[];
  correctAnswer: number;
  objectCount?: number;
  objectType?: string;
}

interface AssessmentResponse {
  question: AssessmentQuestion;
  difficulty: 'easy' | 'medium' | 'hard';
  assessmentComplete: boolean;
  determinedLevel: 'level_1' | 'level_2' | null;
  confidence: number;
  reasoning: string;
}

interface PreviousResponse {
  question: string;
  answer: string;
  correct: boolean;
}

interface LevelAssessmentProps {
  studentId: string;
  studentAge?: number;
  onComplete: (level: 'level_1' | 'level_2', confidence: number) => void;
  voiceEnabled?: boolean;
}

const EMOJI_OBJECTS: Record<string, string> = {
  apples: '🍎',
  stars: '⭐',
  hearts: '❤️',
  balls: '⚽',
  flowers: '🌸',
  fish: '🐟',
  birds: '🐦',
  cookies: '🍪',
  cats: '🐱',
  dogs: '🐕',
};

export function LevelAssessment({ 
  studentId, 
  studentAge = 6, 
  onComplete,
  voiceEnabled = true 
}: LevelAssessmentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<AssessmentQuestion | null>(null);
  const [previousResponses, setPreviousResponses] = useState<PreviousResponse[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(voiceEnabled);
  const [canContinue, setCanContinue] = useState(false);
  
  // Refs to prevent duplicate fetches + manage scheduled question-read
  const hasInitializedRef = useRef(false);
  const hasFetchedQuestionRef = useRef<Record<number, boolean>>({});
  const latestQuestionIndexRef = useRef(0);
  const questionReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestQuestionIndexRef.current = questionIndex;
  }, [questionIndex]);

  const clearPendingQuestionRead = useCallback(() => {
    if (questionReadTimeoutRef.current) {
      clearTimeout(questionReadTimeoutRef.current);
      questionReadTimeoutRef.current = null;
    }
  }, []);

  const voice = useEnhancedVoiceCompanion({ enabled: voiceOn });

  const saveAssessment = async (level: string, confidence: number, responses: PreviousResponse[]) => {
    try {
      // The generated DB types for this project can lag behind the live schema.
      // Cast the table name to avoid blocking runtime behavior.
      await supabase.from('level_assessments' as any).insert([{
        student_id: studentId,
        assessment_type: 'initial',
        questions_asked: JSON.parse(JSON.stringify(responses)),
        responses: JSON.parse(JSON.stringify(responses)),
        determined_level: level,
        confidence_score: confidence,
        completed_at: new Date().toISOString(),
      }]);
    } catch (err) {
      console.error('Failed to save assessment:', err);
    }
  };

  const fetchNextQuestion = useCallback(async (currentResponses: PreviousResponse[]) => {
    // Prevent duplicate fetches for the same question index
    if (hasFetchedQuestionRef.current[questionIndex]) {
      console.log('Skipping duplicate fetch for question', questionIndex);
      return;
    }
    hasFetchedQuestionRef.current[questionIndex] = true;

    setIsLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setShowFeedback(false);

    // Cancel any scheduled question read and stop any current speech before loading new question
    clearPendingQuestionRead();
    voice.stop();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-assessment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            studentAge,
            previousResponses: currentResponses,
            questionIndex,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate question');
      }

      const data: AssessmentResponse = await response.json();

      if (data.assessmentComplete && data.determinedLevel) {
        // Assessment is complete
        await saveAssessment(data.determinedLevel, data.confidence, currentResponses);
        onComplete(data.determinedLevel, data.confidence);
        return;
      }

      setCurrentQuestion(data.question);
      setIsLoading(false);
      setCanContinue(false);

      // Read the exact question instruction aloud after a short delay for animation.
      // Guard against late timers speaking the *previous* question after the UI advances.
      if (voiceOn && data.question.instruction) {
        const scheduledForIndex = questionIndex;
        clearPendingQuestionRead();
        questionReadTimeoutRef.current = setTimeout(() => {
          if (latestQuestionIndexRef.current !== scheduledForIndex) return;
          voice.readQuestion(data.question.instruction);
        }, 600);
      }
    } catch (err) {
      console.error('Assessment error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
      // Allow retry on error
      hasFetchedQuestionRef.current[questionIndex] = false;
    }
  }, [studentAge, questionIndex, voiceOn, voice, onComplete, studentId, clearPendingQuestionRead]);

  // Initial mount effect - welcome and fetch first question
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (voiceOn) {
      voice.welcome();
    }

    const timer = setTimeout(() => {
      fetchNextQuestion([]);
    }, voiceOn ? 2500 : 500);

    return () => clearTimeout(timer);
  }, []); // Empty deps - only run once on mount

  // Cleanup any pending question-read timer on unmount
  useEffect(() => {
    return () => clearPendingQuestionRead();
  }, [clearPendingQuestionRead]);

  const handleAnswer = async (answer: number) => {
    if (showFeedback || !currentQuestion) return;

    // Stop any scheduled/playing audio (like question reading) before feedback
    clearPendingQuestionRead();
    voice.stop();

    setSelectedAnswer(answer);
    setShowFeedback(true);
    setCanContinue(false); // Disable continue until feedback audio finishes

    const correct = answer === currentQuestion.correctAnswer;
    setIsCorrect(correct);

    // Update previous responses first
    const newResponse: PreviousResponse = {
      question: currentQuestion.instruction,
      answer: String(answer),
      correct,
    };
    setPreviousResponses(prev => [...prev, newResponse]);

    // Voice feedback - await completion before allowing continue
    if (voiceOn) {
      if (correct) {
        await voice.celebrateCorrect();
      } else {
        await voice.encourageIncorrect(currentQuestion.correctAnswer);
      }
    }

    // Now allow user to continue
    setCanContinue(true);
  };

  const handleContinue = () => {
    // Immediately stop/cancel any lingering audio/timers so the next screen can't replay old text
    clearPendingQuestionRead();
    voice.stop();

    setQuestionIndex(prev => prev + 1);
    // This will trigger the useEffect to fetch the next question
  };

  // Fetch next question when questionIndex changes (after the first question)
  useEffect(() => {
    if (questionIndex > 0) {
      fetchNextQuestion(previousResponses);
    }
  }, [questionIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderObjectGrid = () => {
    if (!currentQuestion?.objectCount || !currentQuestion?.objectType) return null;

    const emoji = EMOJI_OBJECTS[currentQuestion.objectType] || '🔵';
    const count = currentQuestion.objectCount;

    return (
      <div className="flex flex-wrap justify-center gap-4 p-6 bg-white/50 rounded-2xl">
        {Array.from({ length: count }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: i * 0.1, type: 'spring', bounce: 0.5 }}
            className="text-5xl"
          >
            {emoji}
          </motion.span>
        ))}
      </div>
    );
  };

  const renderOptions = () => {
    if (!currentQuestion?.options) {
      // Generate number options for counting questions
      const options = Array.from({ length: 4 }).map((_, i) => {
        const value = Math.max(1, (currentQuestion?.correctAnswer || 3) - 1 + i);
        return { value, label: String(value) };
      });
      
      // Shuffle options
      options.sort(() => Math.random() - 0.5);
      
      return options;
    }
    
    return currentQuestion.options;
  };

  const handleRetry = () => {
    hasFetchedQuestionRef.current[questionIndex] = false;
    fetchNextQuestion(previousResponses);
  };

  if (error) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-destructive mb-4">Oops!</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={handleRetry}>Try Again</Button>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          <span className="font-semibold text-lg">Math Check-up</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVoiceOn(!voiceOn)}
        >
          {voiceOn ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Progress */}
      <Progress 
        value={(questionIndex / 5) * 100} 
        className="h-3 mb-8"
      />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                {questionIndex === 0 ? "Getting ready..." : "Loading next question..."}
              </p>
            </motion.div>
          ) : currentQuestion ? (
            <motion.div
              key={`question-${questionIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-lg"
            >
              <Card className="p-6 shadow-xl">
                {/* Question */}
                <h2 className="text-xl font-bold text-center mb-6 text-primary">
                  {currentQuestion.instruction}
                </h2>

                {/* Visual content */}
                <div className="mb-8">
                  {renderObjectGrid()}
                </div>

                {/* Answer options */}
                <div className="grid grid-cols-2 gap-4">
                  {renderOptions().map((option) => (
                    <Button
                      key={option.value}
                      variant={
                        showFeedback
                          ? option.value === currentQuestion.correctAnswer
                            ? 'default'
                            : selectedAnswer === option.value
                            ? 'destructive'
                            : 'outline'
                          : selectedAnswer === option.value
                          ? 'default'
                          : 'outline'
                      }
                      className={`h-16 text-2xl font-bold transition-all ${
                        showFeedback && option.value === currentQuestion.correctAnswer
                          ? 'ring-4 ring-green-400 bg-green-500 hover:bg-green-500'
                          : ''
                      }`}
                      onClick={() => handleAnswer(option.value)}
                      disabled={showFeedback}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                {/* Feedback */}
                <AnimatePresence>
                  {showFeedback && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`mt-6 p-4 rounded-xl text-center ${
                        isCorrect
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      <p className="text-lg font-semibold">
                        {isCorrect ? '🎉 Great job!' : '💪 Keep trying!'}
                      </p>
                      <Button
                        className="mt-4"
                        onClick={handleContinue}
                        disabled={!canContinue && voiceOn}
                      >
                        {!canContinue && voiceOn ? 'Listening...' : 'Next Question →'}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Question counter */}
      <div className="text-center text-muted-foreground mt-4">
        Question {questionIndex + 1} of ~5
      </div>
    </div>
  );
}
