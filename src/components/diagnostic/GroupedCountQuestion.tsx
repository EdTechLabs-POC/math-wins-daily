import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Level2TaskB } from '@/types/diagnostic';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useInputFocusGuard } from '@/hooks/useInputFocusGuard';

// Import sticks image
import sticksImg from '@/assets/diagnostic/sticks.png';

interface GroupedCountQuestionProps {
  task: Level2TaskB;
  onAnswer: (answer: number, isCorrect: boolean) => void;
  onVoicePrompt?: (text: string) => void;
  disabled?: boolean;
}

export function GroupedCountQuestion({ 
  task, 
  onAnswer, 
  onVoicePrompt,
  disabled = false 
}: GroupedCountQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const sounds = useSoundEffects();
  const { guardedHandler, lockInteractions } = useInputFocusGuard();

  const correctAnswer = task.bundleCount * task.bundleSize + task.looseCount;

  // Trigger voice prompt on mount
  useEffect(() => {
    onVoicePrompt?.(task.voicePrompt);
  }, [task.voicePrompt, onVoicePrompt]);

  const handleOptionClick = guardedHandler((value: number) => {
    if (disabled || showResult) return;

    sounds.tap();
    setSelectedAnswer(value);
    setShowResult(true);
    lockInteractions(1500);

    const isCorrect = value === correctAnswer;
    
    if (isCorrect) {
      sounds.correct();
    } else {
      sounds.incorrect();
    }

    // Wait for animation then submit
    setTimeout(() => {
      onAnswer(value, isCorrect);
    }, 1500);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="question-card max-w-2xl mx-auto"
    >
      {/* Question */}
      <h2 className="text-child-lg text-center font-bold text-foreground mb-6">
        {task.instruction}
      </h2>

      {/* Visual Representation */}
      <div className="relative bg-muted/30 rounded-3xl p-6 mb-8">
        <div className="flex items-center justify-center gap-8">
          {/* Bundle(s) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="relative">
              <img 
                src={sticksImg}
                alt={`Bundle of ${task.bundleSize}`}
                className="h-32 object-contain"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold"
              >
                {task.bundleSize}
              </motion.div>
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              {task.bundleCount} bundle{task.bundleCount > 1 ? 's' : ''} of {task.bundleSize}
            </span>
          </motion.div>

          {/* Plus sign */}
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-child-xl font-bold text-muted-foreground"
          >
            +
          </motion.span>

          {/* Loose sticks */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex gap-1">
              {Array.from({ length: task.looseCount }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="w-3 h-24 bg-amber-600 rounded-sm shadow-md"
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              {task.looseCount} loose stick{task.looseCount > 1 ? 's' : ''}
            </span>
          </motion.div>
        </div>

        {/* Equation hint */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 text-center text-muted-foreground"
        >
          <span className="text-child-base">
            {task.bundleSize} + {task.looseCount} = ?
          </span>
        </motion.div>
      </div>

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
                  scale: state === 'correct' ? 1.05 : 1
                }}
                transition={{ delay: 0.1 * index }}
                whileHover={!showResult ? { scale: 1.05 } : {}}
                whileTap={!showResult ? { scale: 0.95 } : {}}
                className={cn(
                  'answer-option',
                  state === 'selected' && 'selected',
                  state === 'correct' && 'correct glow-success',
                  state === 'incorrect' && 'incorrect'
                )}
              >
                <span className="text-child-xl font-bold">{option.label}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Feedback Animation */}
      <AnimatePresence>
        {showResult && selectedAnswer === correctAnswer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 text-center"
          >
            <span className="text-6xl">🎉</span>
            <p className="text-success text-child-base font-bold mt-2">
              You got it! {task.bundleSize} + {task.looseCount} = {correctAnswer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
