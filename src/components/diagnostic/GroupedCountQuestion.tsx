import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Level2TaskB } from '@/types/diagnostic';
import { useImmersiveSounds } from '@/hooks/useImmersiveSounds';
import { useInputFocusGuard } from '@/hooks/useInputFocusGuard';
import { AnimatedSticks, Confetti } from './AnimatedVisuals';

interface GroupedCountQuestionProps {
  task: Level2TaskB;
  onAnswer: (answer: number, isCorrect: boolean) => void;
  onVoicePrompt?: (text: string) => void;
  onCorrectFeedback?: () => void;
  onIncorrectFeedback?: (correctAnswer: number) => void;
  disabled?: boolean;
}

export function GroupedCountQuestion({ 
  task, 
  onAnswer, 
  onVoicePrompt,
  onCorrectFeedback,
  onIncorrectFeedback,
  disabled = false 
}: GroupedCountQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const sounds = useImmersiveSounds();
  const { guardedHandler, lockInteractions } = useInputFocusGuard();

  const correctAnswer = task.bundleCount * task.bundleSize + task.looseCount;

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

    const isCorrect = value === correctAnswer;
    
    if (isCorrect) {
      sounds.celebration();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      onCorrectFeedback?.();
    } else {
      sounds.oops();
      onIncorrectFeedback?.(correctAnswer);
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
        >
          {task.instruction}
        </motion.h2>

        {/* Visual Representation with Animated Sticks */}
        <motion.div 
          className="relative bg-gradient-to-b from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 rounded-3xl p-8 mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatedSticks 
            bundleSize={task.bundleSize} 
            looseCount={task.looseCount} 
          />

          {/* Equation hint */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-6 text-center"
          >
            <motion.div 
              className="inline-flex items-center gap-2 bg-card px-6 py-3 rounded-full shadow-md"
              whileHover={{ scale: 1.02 }}
            >
              <span className="text-child-lg font-bold text-primary">{task.bundleSize}</span>
              <span className="text-child-base text-muted-foreground">+</span>
              <span className="text-child-lg font-bold text-primary">{task.looseCount}</span>
              <span className="text-child-base text-muted-foreground">=</span>
              <motion.span 
                className="text-child-lg font-bold text-success"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ?
              </motion.span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Answer Options */}
        <div className="grid grid-cols-3 gap-4">
          <AnimatePresence mode="wait">
            {task.options.map((option, index) => {
              const isSelected = selectedAnswer === option.value;
              const isCorrect = option.value === correctAnswer;
              
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
                  
                  {/* Ripple effect */}
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
                selectedAnswer === correctAnswer
                  ? 'bg-success/20' 
                  : 'bg-warning/20'
              )}
            >
              {selectedAnswer === correctAnswer ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <motion.span 
                      className="text-5xl"
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      🎉
                    </motion.span>
                    <span className="text-child-base font-bold text-success">
                      Brilliant!
                    </span>
                    <motion.span 
                      className="text-5xl"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      🌟
                    </motion.span>
                  </div>
                  <span className="text-muted-foreground">
                    {task.bundleSize} + {task.looseCount} = {correctAnswer}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">💪</span>
                  <span className="text-child-base font-bold text-warning">
                    Good try! The answer is {correctAnswer}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {task.bundleSize} + {task.looseCount} = {correctAnswer}
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
