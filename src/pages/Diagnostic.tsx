import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiagnosticFlow } from '@/hooks/useDiagnosticFlow';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useEnhancedVoiceCompanion } from '@/hooks/useEnhancedVoiceCompanion';
import { useImmersiveSounds } from '@/hooks/useImmersiveSounds';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CountingQuestion } from '@/components/diagnostic/CountingQuestion';
import { TapCountQuestion } from '@/components/diagnostic/TapCountQuestion';
import { DragDropQuestion } from '@/components/diagnostic/DragDropQuestion';
import { GroupedCountQuestion } from '@/components/diagnostic/GroupedCountQuestion';
import { RepairFlow } from '@/components/diagnostic/RepairFlow';
import { DiagnosticResults } from '@/components/diagnostic/DiagnosticResults';
import { LevelAssessment } from '@/components/diagnostic/LevelAssessment';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Volume2, VolumeX, Music, Music2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Level1TaskA, Level1TaskB, Level2TaskA, Level2TaskB } from '@/types/diagnostic';

type DiagnosticPhase = 'loading' | 'assessment' | 'diagnostic' | 'complete';

export default function Diagnostic() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<DiagnosticPhase>('loading');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentAge, setStudentAge] = useState<number>(6);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const {
    state,
    getCurrentTask,
    submitTaskResult,
    completeRepair,
    resetDiagnostic,
    getDiagnosticSummary,
    isInRepair,
    isComplete
  } = useDiagnosticFlow();

  // Audio hooks
  const bgMusic = useBackgroundMusic();
  const voice = useEnhancedVoiceCompanion({ enabled: voiceEnabled });
  const { readQuestion, celebrateCorrect, encourageIncorrect, celebrateLevelComplete, speak, stop } = voice;
  const sounds = useImmersiveSounds();

  

  const currentTask = getCurrentTask();

  // Check if user needs initial assessment
  useEffect(() => {
    const checkStudentStatus = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        // Get the student associated with this user
        const { data: students, error } = await supabase
          .from('students')
          .select('id, age, diagnostic_completed_at')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error fetching student:', error);
          // Fallback to diagnostic if we can't check
          setPhase('diagnostic');
          return;
        }

        if (students && students.length > 0) {
          const student = students[0];
          setStudentId(student.id);
          setStudentAge(student.age || 6);

          // Check if they've completed initial assessment
          if (student.diagnostic_completed_at) {
            setPhase('diagnostic');
          } else {
            // Check for existing level assessment
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: assessments } = await (supabase as any)
              .from('level_assessments')
              .select('id')
              .eq('student_id', student.id)
              .eq('assessment_type', 'initial')
              .not('completed_at', 'is', null)
              .limit(1);

            if (assessments && assessments.length > 0) {
              setPhase('diagnostic');
            } else {
              setPhase('assessment');
            }
          }
        } else {
          // No student record found, go straight to diagnostic
          setPhase('diagnostic');
        }
      } catch (err) {
        console.error('Error checking student status:', err);
        setPhase('diagnostic');
      }
    };

    checkStudentStatus();
  }, [user, navigate]);

  // Start background music on first interaction
  useEffect(() => {
    const startMusic = () => {
      if (!bgMusic.isPlaying) {
        bgMusic.play();
      }
      document.removeEventListener('click', startMusic);
    };
    document.addEventListener('click', startMusic);
    return () => document.removeEventListener('click', startMusic);
  }, [bgMusic]);

  // Reset timer when task changes
  useEffect(() => {
    setStartTime(Date.now());
    sounds.whoosh();
  }, [state.currentLevel, state.currentTask]);

  // Calculate progress
  const getProgress = () => {
    if (isComplete) return 100;
    const levelProgress = state.currentLevel === 'level_1' ? 0 : 50;
    const taskProgress = state.currentTask === 'A' ? 0 : 25;
    return levelProgress + taskProgress;
  };

  const handleVoicePrompt = useCallback((text: string) => {
    if (!voiceEnabled) return;
    // Read the on-screen instruction exactly (prevents "rephrasing" and avoids repeated prompts).
    readQuestion(text);
  }, [voiceEnabled, readQuestion]);

  const handleCorrectFeedback = useCallback(async (): Promise<void> => {
    if (!voiceEnabled) return;
    // Stop any question audio before feedback
    stop();
    await celebrateCorrect();
  }, [voiceEnabled, stop, celebrateCorrect]);

  const handleIncorrectFeedback = useCallback(async (detail: number | string): Promise<void> => {
    if (!voiceEnabled) return;
    // Stop any question audio before feedback
    stop();

    if (typeof detail === 'number') {
      await encourageIncorrect(detail);
    } else {
      await speak(`Good try! ${detail}. Let's take another look.`, { priority: true, allowDuplicate: true });
    }
  }, [voiceEnabled, stop, encourageIncorrect, speak]);

  const handleAnswer = useCallback((answer: unknown, isCorrect: boolean) => {
    // The question components now await feedback audio before calling this,
    // so we can immediately process the result.
    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    const getCorrectAnswer = () => {
      if (currentTask?.type === 'count_objects') return (currentTask as Level1TaskA).correctAnswer;
      if (currentTask?.type === 'tap_count') return (currentTask as Level1TaskB).targetCount;
      if (currentTask?.type === 'count_grouped') {
        const task = currentTask as Level2TaskB;
        return task.bundleCount * task.bundleSize + task.looseCount;
      }
      return 'matches';
    };

    submitTaskResult({
      taskId: currentTask?.taskId || '',
      isCorrect,
      studentAnswer: answer,
      correctAnswer: getCorrectAnswer(),
      timeTakenSeconds: timeTaken,
      attemptNumber,
    });

    setAttemptNumber(prev => prev + 1);
  }, [currentTask, startTime, attemptNumber, submitTaskResult]);

  const handleRepairComplete = useCallback(() => {
    sounds.celebration();
    completeRepair();
    setAttemptNumber(1);
  }, [completeRepair, sounds]);

  const handleContinue = useCallback(() => {
    bgMusic.pause();
    navigate('/');
  }, [navigate, bgMusic]);

  const handleRetry = useCallback(() => {
    resetDiagnostic();
    setAttemptNumber(1);
  }, [resetDiagnostic]);

  const handleAssessmentComplete = useCallback(async (level: 'level_1' | 'level_2', confidence: number) => {
    console.log(`Assessment complete: ${level} with ${confidence} confidence`);
    
    // Update student record
    if (studentId) {
      await supabase
        .from('students')
        .update({ 
          current_level: level,
          diagnostic_completed_at: new Date().toISOString()
        })
        .eq('id', studentId);
    }

    sounds.celebration();
    if (voiceEnabled) {
      await celebrateLevelComplete();
    }
    
    // Move to diagnostic phase
    setPhase('diagnostic');
  }, [studentId, sounds, voiceEnabled, voice]);

  // Render current task component
  const renderTask = () => {
    if (!currentTask) return null;

    const commonProps = {
      onVoicePrompt: handleVoicePrompt,
      onCorrectFeedback: handleCorrectFeedback,
      onIncorrectFeedback: handleIncorrectFeedback,
    };

    switch (currentTask.type) {
      case 'count_objects':
        return (
          <CountingQuestion
            task={currentTask as Level1TaskA}
            onAnswer={handleAnswer}
            {...commonProps}
          />
        );
      
      case 'tap_count':
        return (
          <TapCountQuestion
            task={currentTask as Level1TaskB}
            onAnswer={(ids, correct) => handleAnswer(ids, correct)}
            {...commonProps}
          />
        );
      
      case 'drag_drop_match':
        return (
          <DragDropQuestion
            task={currentTask as Level2TaskA}
            onAnswer={(matches, correct) => handleAnswer(matches, correct)}
            {...commonProps}
          />
        );
      
      case 'count_grouped':
        return (
          <GroupedCountQuestion
            task={currentTask as Level2TaskB}
            onAnswer={handleAnswer}
            {...commonProps}
          />
        );
      
      default:
        return null;
    }
  };

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Getting ready for your adventure...</p>
        </motion.div>
      </div>
    );
  }

  // Initial level assessment for new users
  if (phase === 'assessment' && studentId) {
    return (
      <LevelAssessment
        studentId={studentId}
        studentAge={studentAge}
        voiceEnabled={voiceEnabled}
        onComplete={handleAssessmentComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-child-base font-bold text-foreground">
              Math Check-up
            </h1>
            <p className="text-sm text-muted-foreground">
              Level {state.currentLevel === 'level_1' ? '1' : '2'} • 
              Task {state.currentTask === 'repair' ? 'Review' : state.currentTask}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Background music toggle with volume slider */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  title={bgMusic.isLoading ? 'Loading music...' : bgMusic.isPlaying ? 'Music playing' : 'Play music'}
                  disabled={bgMusic.isLoading}
                >
                  {bgMusic.isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : bgMusic.isPlaying ? (
                    <Music className="w-5 h-5 text-primary animate-pulse" />
                  ) : (
                    <Music2 className="w-5 h-5 text-muted-foreground" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Music</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={bgMusic.toggle}
                      className="h-7 px-2 text-xs"
                    >
                      {bgMusic.isPlaying ? 'Pause' : 'Play'}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Volume</label>
                    <Slider
                      value={[bgMusic.volume * 100]}
                      onValueChange={([value]) => bgMusic.setVolume(value / 100)}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  {bgMusic.error && (
                    <p className="text-xs text-destructive">{bgMusic.error}</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Voice toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="rounded-full"
              title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
            >
              {voiceEnabled ? (
                <Volume2 className={`w-5 h-5 ${voice.isSpeaking ? 'text-primary animate-pulse' : ''}`} />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Progress bar */}
        <Progress value={getProgress()} className="h-3" />
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DiagnosticResults
                summary={getDiagnosticSummary()}
                onContinue={handleContinue}
                onRetry={handleRetry}
              />
            </motion.div>
          ) : isInRepair ? (
            <motion.div
              key="repair"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RepairFlow
                level={state.currentLevel}
                onComplete={handleRepairComplete}
                onVoicePrompt={handleVoicePrompt}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`${state.currentLevel}-${state.currentTask}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              {renderTask()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer encouragement */}
      <footer className="max-w-4xl mx-auto mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          {isComplete 
            ? "You did it! 🎉" 
            : isInRepair 
            ? "Let's learn together! 📚"
            : "Take your time, you're doing great! ⭐"}
        </p>
      </footer>
    </div>
  );
}
