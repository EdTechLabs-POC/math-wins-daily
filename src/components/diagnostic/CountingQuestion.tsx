import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Level1TaskA } from '@/types/diagnostic';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useInputFocusGuard } from '@/hooks/useInputFocusGuard';

interface CountingQuestionProps {
  task: Level1TaskA;
  onAnswer: (answer: number, isCorrect: boolean) => void;
  onVoicePrompt?: (text: string) => void;
  disabled?: boolean;
}

export function CountingQuestion({ 
  task, 
  onAnswer, 
  onVoicePrompt,
  disabled = false 
}: CountingQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const sounds = useSoundEffects();
  const { guardedHandler, lockInteractions } = useInputFocusGuard();

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

    const isCorrect = value === task.correctAnswer;
    
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

      {/* Image */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted mb-8">
        <motion.img
          src={task.imageUrl}
          alt="Count the objects"
          className="w-full h-full object-contain p-4"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        />
      </div>

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
        {showResult && selectedAnswer === task.correctAnswer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <span className="text-8xl">🎉</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
