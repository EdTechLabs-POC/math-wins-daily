import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Level1TaskB } from '@/types/diagnostic';
import { useImmersiveSounds } from '@/hooks/useImmersiveSounds';
import { useInputFocusGuard } from '@/hooks/useInputFocusGuard';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw } from 'lucide-react';
import { AnimatedApples, Confetti } from './AnimatedVisuals';

interface TapCountQuestionProps {
  task: Level1TaskB;
  onAnswer: (tappedIds: string[], isCorrect: boolean) => void;
  onVoicePrompt?: (text: string) => void;
  onCorrectFeedback?: () => Promise<void> | void;
  onIncorrectFeedback?: (correctAnswer: number) => Promise<void> | void;
  disabled?: boolean;
}

export function TapCountQuestion({ 
  task, 
  onAnswer, 
  onVoicePrompt,
  onCorrectFeedback,
  onIncorrectFeedback,
  disabled = false 
}: TapCountQuestionProps) {
  const [tappedIds, setTappedIds] = useState<Set<string>>(new Set());
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const sounds = useImmersiveSounds();
  const { guardedHandler, lockInteractions } = useInputFocusGuard({ debounceMs: 150 });

  // Trigger voice prompt on mount
  useEffect(() => {
    onVoicePrompt?.(task.instruction);
  }, [task.instruction, onVoicePrompt]);

  const handleObjectTap = useCallback((objectId: string) => {
    if (disabled || showResult) return;

    sounds.bubble();
    
    setTappedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectId)) {
        newSet.delete(objectId);
        sounds.sticky();
      } else {
        if (newSet.size < task.targetCount + 3) {
          newSet.add(objectId);
        }
      }
      return newSet;
    });
  }, [disabled, showResult, sounds, task.targetCount]);

  const handleReset = useCallback(() => {
    if (disabled || showResult) return;
    sounds.whoosh();
    setTappedIds(new Set());
  }, [disabled, showResult, sounds]);

  const handleSubmit = guardedHandler(async () => {
    if (disabled || showResult) return;
    
    setShowResult(true);
    lockInteractions(5000);

    const correct = tappedIds.size === task.targetCount;
    setIsCorrect(correct);
    
    if (correct) {
      sounds.celebration();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      sounds.oops();
    }

    // Wait for feedback audio to complete before advancing
    try {
      if (correct) {
        await onCorrectFeedback?.();
      } else {
        await onIncorrectFeedback?.(task.targetCount);
      }
    } catch {
      // Audio may fail; continue anyway
    }

    await new Promise(r => setTimeout(r, 400));
    onAnswer(Array.from(tappedIds), correct);
  });

  const currentCount = tappedIds.size;
  const targetReached = currentCount === task.targetCount;

  return (
    <>
      {showConfetti && <Confetti />}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="question-card max-w-3xl mx-auto"
      >
        {/* Question */}
        <motion.h2 
          className="text-child-lg text-center font-bold text-foreground mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {task.instruction}
        </motion.h2>

        {/* Counter Display */}
        <motion.div 
          className="flex items-center justify-center gap-4 mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <motion.div
            animate={{
              scale: targetReached ? [1, 1.2, 1] : 1,
              color: targetReached ? 'hsl(var(--success))' : 'hsl(var(--foreground))'
            }}
            transition={{ duration: 0.3 }}
            className="text-child-2xl font-bold"
          >
            {currentCount}
          </motion.div>
          <span className="text-child-lg text-muted-foreground">/</span>
          <span className="text-child-2xl font-bold text-muted-foreground">
            {task.targetCount}
          </span>
          
          {targetReached && (
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-4xl"
            >
              ✨
            </motion.span>
          )}
        </motion.div>

        {/* Animated Tappable Objects */}
        <motion.div 
          className="relative bg-gradient-to-b from-green-200 to-green-100 dark:from-green-900 dark:to-green-800 rounded-3xl p-4 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatedApples 
            count={task.objects.length}
            tappedIds={tappedIds}
            onTap={handleObjectTap}
            disabled={disabled || showResult}
          />
        </motion.div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleReset}
            disabled={disabled || showResult || tappedIds.size === 0}
            className="btn-child"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Start Over
          </Button>
          
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={disabled || showResult || tappedIds.size === 0}
            className={cn(
              'btn-child bg-primary text-primary-foreground',
              targetReached && 'bg-success hover:bg-success/90 animate-pulse'
            )}
          >
            <Check className="w-5 h-5 mr-2" />
            I'm Done!
          </Button>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'mt-6 p-4 rounded-2xl text-center',
                isCorrect ? 'bg-success/20' : 'bg-warning/20'
              )}
            >
              {isCorrect ? (
                <div className="flex items-center justify-center gap-3">
                  <motion.span 
                    className="text-5xl"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    🎉
                  </motion.span>
                  <span className="text-child-base font-bold text-success">
                    Perfect! You tapped exactly {task.targetCount}!
                  </span>
                  <motion.span 
                    className="text-5xl"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2, delay: 0.2 }}
                  >
                    🍎
                  </motion.span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">🤔</span>
                  <span className="text-child-base font-bold text-warning">
                    You tapped {currentCount}, but we needed {task.targetCount}!
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
