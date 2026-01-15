import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Level1TaskB } from '@/types/diagnostic';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useInputFocusGuard } from '@/hooks/useInputFocusGuard';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw } from 'lucide-react';

interface TapCountQuestionProps {
  task: Level1TaskB;
  onAnswer: (tappedIds: string[], isCorrect: boolean) => void;
  onVoicePrompt?: (text: string) => void;
  disabled?: boolean;
}

export function TapCountQuestion({ 
  task, 
  onAnswer, 
  onVoicePrompt,
  disabled = false 
}: TapCountQuestionProps) {
  const [tappedIds, setTappedIds] = useState<Set<string>>(new Set());
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const sounds = useSoundEffects();
  const { guardedHandler, lockInteractions } = useInputFocusGuard({ debounceMs: 150 });

  // Trigger voice prompt on mount
  useEffect(() => {
    onVoicePrompt?.(task.voicePrompt);
  }, [task.voicePrompt, onVoicePrompt]);

  const handleObjectTap = guardedHandler((objectId: string) => {
    if (disabled || showResult) return;

    sounds.tap();
    
    setTappedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectId)) {
        newSet.delete(objectId);
      } else {
        // Limit to target count + a bit of wiggle room
        if (newSet.size < task.targetCount + 3) {
          newSet.add(objectId);
        }
      }
      return newSet;
    });
  });

  const handleReset = useCallback(() => {
    if (disabled || showResult) return;
    sounds.pop();
    setTappedIds(new Set());
  }, [disabled, showResult, sounds]);

  const handleSubmit = guardedHandler(() => {
    if (disabled || showResult) return;
    
    setShowResult(true);
    lockInteractions(1500);

    const correct = tappedIds.size === task.targetCount;
    setIsCorrect(correct);
    
    if (correct) {
      sounds.celebrate();
    } else {
      sounds.incorrect();
    }

    setTimeout(() => {
      onAnswer(Array.from(tappedIds), correct);
    }, 1500);
  });

  const currentCount = tappedIds.size;
  const targetReached = currentCount === task.targetCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="question-card max-w-3xl mx-auto"
    >
      {/* Question */}
      <h2 className="text-child-lg text-center font-bold text-foreground mb-4">
        {task.instruction}
      </h2>

      {/* Counter Display */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <motion.div
          animate={{
            scale: targetReached ? 1.1 : 1,
            color: targetReached ? 'hsl(var(--success))' : 'hsl(var(--foreground))'
          }}
          className="text-child-xl font-bold"
        >
          {currentCount}
        </motion.div>
        <span className="text-child-base text-muted-foreground">/</span>
        <span className="text-child-xl font-bold text-muted-foreground">
          {task.targetCount}
        </span>
      </div>

      {/* Tappable Objects Grid */}
      <div className="relative bg-muted/50 rounded-3xl p-6 mb-6 min-h-[300px]">
        <div className="grid grid-cols-4 gap-4">
          {task.objects.map((obj, index) => {
            const isTapped = tappedIds.has(obj.id);
            
            return (
              <motion.button
                key={obj.id}
                onClick={() => handleObjectTap(obj.id)}
                disabled={disabled || showResult}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  y: showResult && isTapped ? [0, -10, 0] : 0
                }}
                transition={{ 
                  delay: index * 0.05,
                  y: { duration: 0.3 }
                }}
                whileHover={!showResult ? { scale: 1.1 } : {}}
                whileTap={!showResult ? { scale: 0.9 } : {}}
                className={cn(
                  'tap-object aspect-square rounded-2xl p-3 transition-all',
                  'bg-card shadow-md hover:shadow-lg',
                  isTapped && 'tapped bg-primary/10'
                )}
              >
                {/* Apple emoji as placeholder - in production would use actual images */}
                <span className="text-4xl">🍎</span>
                
                {/* Selection indicator */}
                <AnimatePresence>
                  {isTapped && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

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
            targetReached && 'bg-success hover:bg-success/90'
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
              'mt-6 p-4 rounded-2xl text-center text-child-base font-bold',
              isCorrect ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
            )}
          >
            {isCorrect 
              ? '🎉 Perfect! You counted exactly right!' 
              : `You tapped ${currentCount}, but we needed ${task.targetCount}. Let's try again!`
            }
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
