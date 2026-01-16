import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { Level2TaskA } from '@/types/diagnostic';
import { useImmersiveSounds } from '@/hooks/useImmersiveSounds';
import { useInputFocusGuard } from '@/hooks/useInputFocusGuard';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw } from 'lucide-react';
import { AnimatedDice, Confetti } from './AnimatedVisuals';

interface DragDropQuestionProps {
  task: Level2TaskA;
  onAnswer: (matches: Record<number, string>, isCorrect: boolean) => void;
  onVoicePrompt?: (text: string) => void;
  onCorrectFeedback?: () => Promise<void> | void;
  onIncorrectFeedback?: (explanation: string) => Promise<void> | void;
  disabled?: boolean;
}

// Draggable number tile component
function DraggableNumber({ value, isPlaced }: { value: number; isPlaced: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `number-${value}`,
    data: { value },
  });

  if (isPlaced) return null;

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, scale: 0, rotate: -10 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'w-20 h-20 rounded-2xl',
        'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
        'flex items-center justify-center text-child-xl font-bold',
        'shadow-lg cursor-grab active:cursor-grabbing',
        'touch-manipulation select-none',
        isDragging && 'opacity-50'
      )}
      style={{ boxShadow: '0 8px 20px -4px hsl(var(--primary) / 0.4)' }}
    >
      {value}
    </motion.div>
  );
}

// Droppable target zone component
function DroppableZone({ 
  groupId, 
  count, 
  placedValue,
  isCorrect,
  showResult 
}: { 
  groupId: string; 
  count: number; 
  placedValue: number | null;
  isCorrect: boolean | null;
  showResult: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: groupId,
    data: { count },
  });

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative flex flex-col items-center gap-3 p-4 rounded-3xl',
        'border-4 border-dashed transition-all duration-300',
        isOver && 'border-primary bg-primary/10 scale-105',
        !isOver && 'border-muted-foreground/30 bg-card',
        showResult && isCorrect === true && 'border-success bg-success/10 glow-success',
        showResult && isCorrect === false && 'border-destructive bg-destructive/10'
      )}
    >
      {/* Animated Dice */}
      <motion.div 
        className="relative"
        animate={isOver ? { scale: 1.1 } : { scale: 1 }}
      >
        <AnimatedDice value={count} size={70} />
      </motion.div>

      {/* Drop target / placed number */}
      <div className={cn(
        'w-14 h-14 rounded-xl border-2 border-dashed',
        'flex items-center justify-center transition-all',
        placedValue ? 'bg-primary/20 border-primary' : 'bg-muted/50 border-muted-foreground/30'
      )}>
        {placedValue !== null && (
          <motion.span
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-child-lg font-bold text-primary"
          >
            {placedValue}
          </motion.span>
        )}
        {placedValue === null && (
          <motion.span 
            className="text-muted-foreground text-2xl"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ?
          </motion.span>
        )}
      </div>
      
      {/* Result indicator */}
      {showResult && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2"
        >
          <span className="text-2xl">
            {isCorrect ? '✅' : '❌'}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

export function DragDropQuestion({ 
  task, 
  onAnswer, 
  onVoicePrompt,
  onCorrectFeedback,
  onIncorrectFeedback,
  disabled = false 
}: DragDropQuestionProps) {
  const [placements, setPlacements] = useState<Record<number, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  
  const sounds = useImmersiveSounds();
  const { lockInteractions } = useInputFocusGuard();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Trigger voice prompt on mount
  useEffect(() => {
    onVoicePrompt?.(task.instruction);
  }, [task.instruction, onVoicePrompt]);

  const handleDragStart = (event: DragStartEvent) => {
    if (disabled || showResult) return;
    setActiveId(event.active.id as string);
    sounds.sticky();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled || showResult) return;
    
    setActiveId(null);
    const { active, over } = event;
    
    if (!over) {
      sounds.whoosh();
      return;
    }

    const numberValue = active.data.current?.value as number;
    const groupId = over.id as string;
    
    // Remove previous placement of this number
    setPlacements(prev => {
      const newPlacements = { ...prev };
      delete newPlacements[numberValue];
      newPlacements[numberValue] = groupId;
      return newPlacements;
    });
    
    sounds.drop();
  };

  const handleReset = () => {
    if (disabled || showResult) return;
    sounds.whoosh();
    setPlacements({});
  };

  const handleSubmit = async () => {
    if (disabled || showResult) return;
    
    setShowResult(true);
    lockInteractions(5000);

    // Check each placement
    const newResults: Record<string, boolean> = {};
    let allCorrect = true;

    task.objectGroups.forEach(group => {
      const placedNumber = Object.entries(placements).find(
        ([_, gId]) => gId === group.id
      )?.[0];
      
      const isCorrect = placedNumber !== undefined && 
                        parseInt(placedNumber) === group.count;
      newResults[group.id] = isCorrect;
      if (!isCorrect) allCorrect = false;
    });

    setResults(newResults);

    if (allCorrect) {
      sounds.celebration();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      sounds.oops();
    }

    // Wait for feedback audio to complete before advancing
    try {
      if (allCorrect) {
        await onCorrectFeedback?.();
      } else {
        const wrongCount = Object.values(newResults).filter(r => !r).length;
        await onIncorrectFeedback?.(`${wrongCount} match${wrongCount > 1 ? 'es were' : ' was'} incorrect`);
      }
    } catch {
      // Audio may fail; continue anyway
    }

    await new Promise(r => setTimeout(r, 400));
    onAnswer(placements, allCorrect);
  };

  const allPlaced = task.numberSlots.every(slot => 
    placements[slot.value] !== undefined
  );

  const getPlacedValueForGroup = (groupId: string): number | null => {
    const entry = Object.entries(placements).find(([_, gId]) => gId === groupId);
    return entry ? parseInt(entry[0]) : null;
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {showConfetti && <Confetti />}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="question-card max-w-4xl mx-auto"
      >
        {/* Question */}
        <motion.h2 
          className="text-child-lg text-center font-bold text-foreground mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {task.instruction}
        </motion.h2>

        {/* Instructions hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-muted-foreground mb-4"
        >
          Drag each number to the matching group! 🎯
        </motion.p>

        {/* Draggable Numbers */}
        <motion.div 
          className="flex items-center justify-center gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {task.numberSlots.map((slot, index) => (
            <motion.div
              key={slot.value}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1, type: 'spring' }}
            >
              <DraggableNumber
                value={slot.value}
                isPlaced={placements[slot.value] !== undefined}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Drop Zones */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {task.objectGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <DroppableZone
                groupId={group.id}
                count={group.count}
                placedValue={getPlacedValueForGroup(group.id)}
                isCorrect={showResult ? results[group.id] : null}
                showResult={showResult}
              />
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleReset}
            disabled={disabled || showResult || Object.keys(placements).length === 0}
            className="btn-child"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Start Over
          </Button>
          
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={disabled || showResult || !allPlaced}
            className={cn(
              'btn-child bg-primary text-primary-foreground',
              allPlaced && 'bg-success hover:bg-success/90 animate-pulse'
            )}
          >
            <Check className="w-5 h-5 mr-2" />
            Check My Answers!
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
                Object.values(results).every(Boolean) 
                  ? 'bg-success/20' 
                  : 'bg-warning/20'
              )}
            >
              {Object.values(results).every(Boolean) ? (
                <div className="flex items-center justify-center gap-3">
                  <motion.span 
                    className="text-5xl"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 1 }}
                  >
                    🎲
                  </motion.span>
                  <span className="text-child-base font-bold text-success">
                    Amazing! You matched them all!
                  </span>
                  <motion.span 
                    className="text-5xl"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    ⭐
                  </motion.span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">🎯</span>
                  <span className="text-child-base font-bold text-warning">
                    Some matches need fixing. Keep practicing!
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && (
          <motion.div 
            initial={{ scale: 1 }}
            animate={{ scale: 1.1, rotate: 5 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-child-xl font-bold shadow-2xl"
          >
            {activeId.replace('number-', '')}
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
