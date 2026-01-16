import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Level1TaskA } from '@/types/diagnostic';
import { useImmersiveSounds } from '@/hooks/useImmersiveSounds';
import { useInputFocusGuard } from '@/hooks/useInputFocusGuard';
import { AnimatedBirds, Confetti } from './AnimatedVisuals';

interface CountingQuestionProps {
  task: Level1TaskA;
  onAnswer: (answer: number, isCorrect: boolean) => void;
  onVoicePrompt?: (text: string) => void;
  onCorrectFeedback?: () => void;
  onIncorrectFeedback?: (correctAnswer: number) => void;
  disabled?: boolean;
}

export function CountingQuestion({ 
  task, 
  onAnswer, 
  onVoicePrompt,
  onCorrectFeedback,
  onIncorrectFeedback,
  disabled = false 
}: CountingQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const sounds = useImmersiveSounds();
  const { guardedHandler, lockInteractions } = useInputFocusGuard();

  // Trigger voice prompt on mount
  useEffect(() => {
    onVoicePrompt?.(task.instruction);
  }, [task.instruction, onVoicePrompt]);

  const handleOptionClick = guardedHandler((value: number) => {
    if (disabled || showResult) return;

    sounds.bubble();
    setSelectedAnswer(value);
    setShowResult(true);
    lockInteractions(2500);

    const isCorrect = value === task.correctAnswer;
    
    if (isCorrect) {
      sounds.celebration();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      onCorrectFeedback?.();
    } else {
      sounds.oops();
      onIncorrectFeedback?.(task.correctAnswer);
    }

    // Wait for animation then submit
    setTimeout(() => {
      onAnswer(value, isCorrect);
    }, 2500);
  });

  return (
    <>
      {showConfetti && <Confetti />}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="question-card max-w-2xl mx-auto"
      >
        {/* Question */}
        <motion.h2 
          className="text-child-lg text-center font-bold text-foreground mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {task.instruction}
        </motion.h2>

        {/* Animated Image */}
        <motion.div 
          className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-b from-sky-200 to-sky-100 dark:from-sky-900 dark:to-sky-800 mb-8"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatedBirds count={task.correctAnswer} />
        </motion.div>

        {/* Answer Options */}
        <div className="grid grid-cols-3 gap-4">
          <AnimatePresence mode="wait">
            {task.options.map((option, index) => {
              const isSelected = selectedAnswer === option.value;
              const isCorrect = option.value === task.correctAnswer;
              
              let state: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';
              if (showResult) {
                if (isCorrect) state = 'correct';
                else if (isSelected) state = 'incorrect';
              } else if (isSelected) {
                state = 'selected';
              }

              return (
                <motion.button
                  key={option.value}
                  onClick={() => handleOptionClick(option.value)}
                  disabled={disabled || showResult}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: state === 'correct' ? [1, 1.1, 1.05] : 1
                  }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={!showResult ? { scale: 1.05, y: -4 } : {}}
                  whileTap={!showResult ? { scale: 0.95 } : {}}
                  className={cn(
                    'answer-option relative overflow-hidden',
                    state === 'selected' && 'selected',
                    state === 'correct' && 'correct glow-success',
                    state === 'incorrect' && 'incorrect'
                  )}
                >
                  <span className="text-child-xl font-bold">{option.label}</span>
                  
                  {/* Ripple effect for selection */}
                  {state === 'correct' && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0.5 }}
                      animate={{ scale: 4, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 bg-success rounded-full"
                      style={{ transformOrigin: 'center' }}
                    />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Feedback Animation */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'mt-6 p-4 rounded-2xl text-center',
                selectedAnswer === task.correctAnswer 
                  ? 'bg-success/20' 
                  : 'bg-warning/20'
              )}
            >
              {selectedAnswer === task.correctAnswer ? (
                <div className="flex items-center justify-center gap-3">
                  <motion.span 
                    className="text-6xl"
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    🎉
                  </motion.span>
                  <span className="text-child-base font-bold text-success">
                    That's right!
                  </span>
                  <motion.span 
                    className="text-6xl"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    🌟
                  </motion.span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">💪</span>
                  <span className="text-child-base font-bold text-warning">
                    Good try! The answer is {task.correctAnswer}
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
