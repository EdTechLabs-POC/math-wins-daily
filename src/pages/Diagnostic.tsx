import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiagnosticFlow } from '@/hooks/useDiagnosticFlow';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useTutorFeedback } from '@/hooks/useTutorFeedback';
import { useImmersiveSounds } from '@/hooks/useImmersiveSounds';
import { CountingQuestion } from '@/components/diagnostic/CountingQuestion';
import { TapCountQuestion } from '@/components/diagnostic/TapCountQuestion';
import { DragDropQuestion } from '@/components/diagnostic/DragDropQuestion';
import { GroupedCountQuestion } from '@/components/diagnostic/GroupedCountQuestion';
import { RepairFlow } from '@/components/diagnostic/RepairFlow';
import { DiagnosticResults } from '@/components/diagnostic/DiagnosticResults';
import { Progress } from '@/components/ui/progress';
import { Volume2, VolumeX, Music, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Level1TaskA, Level1TaskB, Level2TaskA, Level2TaskB } from '@/types/diagnostic';

export default function Diagnostic() {
  const navigate = useNavigate();
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
  const tutor = useTutorFeedback({ enabled: voiceEnabled });
  const sounds = useImmersiveSounds();

  const currentTask = getCurrentTask();

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
    if (voiceEnabled) {
      tutor.introduceTask(text);
    }
  }, [voiceEnabled, tutor]);

  const handleCorrectFeedback = useCallback(() => {
    if (voiceEnabled) {
      tutor.celebrateCorrect();
    }
  }, [voiceEnabled, tutor]);

  const handleIncorrectFeedback = useCallback((correctAnswer: number | string) => {
    if (voiceEnabled) {
      tutor.encourageIncorrect(correctAnswer);
    }
  }, [voiceEnabled, tutor]);

  const handleAnswer = useCallback((answer: unknown, isCorrect: boolean) => {
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
      attemptNumber
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
            {/* Background music toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={bgMusic.toggle}
              className="rounded-full"
              title={bgMusic.isPlaying ? 'Pause music' : 'Play music'}
            >
              {bgMusic.isPlaying ? (
                <Music className="w-5 h-5 text-primary" />
              ) : (
                <Music2 className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>
            
            {/* Voice toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="rounded-full"
              title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
            >
              {voiceEnabled ? (
                <Volume2 className={`w-5 h-5 ${tutor.isSpeaking ? 'text-primary animate-pulse' : ''}`} />
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
