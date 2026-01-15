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
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useInputFocusGuard } from '@/hooks/useInputFocusGuard';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw } from 'lucide-react';

// Import dice images
import dice1 from '@/assets/diagnostic/dice_1.png';
import dice2 from '@/assets/diagnostic/dice_2.png';
import dice3 from '@/assets/diagnostic/dice_3.png';
import dice4 from '@/assets/diagnostic/dice_4.png';

interface DragDropQuestionProps {
  task: Level2TaskA;
  onAnswer: (matches: Record<number, string>, isCorrect: boolean) => void;
  onVoicePrompt?: (text: string) => void;
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
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'w-20 h-20 rounded-2xl bg-primary text-primary-foreground',
        'flex items-center justify-center text-child-xl font-bold',
        'shadow-lg cursor-grab active:cursor-grabbing',
        'touch-manipulation select-none',
        isDragging && 'opacity-50'
      )}
    >
      {value}
    </motion.div>
  );
}

// Droppable target zone component
function DroppableZone({ 
  groupId, 
  count, 
  imageUrl, 
  placedValue,
  isCorrect,
  showResult 
}: { 
  groupId: string; 
  count: number; 
  imageUrl: string;
  placedValue: number | null;
  isCorrect: boolean | null;
  showResult: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: groupId,
    data: { count },
  });

  // Map image URLs to actual imports
  const getImageSrc = (url: string) => {
    if (url.includes('dice_1')) return dice1;
    if (url.includes('dice_2')) return dice2;
    if (url.includes('dice_3')) return dice3;
    if (url.includes('dice_4')) return dice4;
    return url;
  };

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative flex flex-col items-center gap-3 p-4 rounded-3xl',
        'border-4 border-dashed transition-all',
        isOver && 'border-primary bg-primary/10 scale-105',
        !isOver && 'border-muted-foreground/30 bg-card',
        showResult && isCorrect === true && 'border-success bg-success/10 glow-success',
        showResult && isCorrect === false && 'border-destructive bg-destructive/10'
      )}
    >
      {/* Object group image */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <img 
          src={getImageSrc(imageUrl)} 
          alt={`Group of ${count}`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Drop target / placed number */}
      <div className={cn(
        'w-16 h-16 rounded-xl border-2 border-dashed',
        'flex items-center justify-center',
        placedValue ? 'bg-primary/20 border-primary' : 'bg-muted/50 border-muted-foreground/30'
      )}>
        {placedValue !== null && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-child-lg font-bold text-primary"
          >
            {placedValue}
          </motion.span>
        )}
        {placedValue === null && (
          <span className="text-muted-foreground text-sm">?</span>
        )}
      </div>
    </motion.div>
  );
}

export function DragDropQuestion({ 
  task, 
  onAnswer, 
  onVoicePrompt,
  disabled = false 
}: DragDropQuestionProps) {
  // Map: placed number value -> group id
  const [placements, setPlacements] = useState<Record<number, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  
  const sounds = useSoundEffects();
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
    onVoicePrompt?.(task.voicePrompt);
  }, [task.voicePrompt, onVoicePrompt]);

  const handleDragStart = (event: DragStartEvent) => {
    if (disabled || showResult) return;
    setActiveId(event.active.id as string);
    sounds.pop();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled || showResult) return;
    
    setActiveId(null);
    const { active, over } = event;
    
    if (!over) return;

    const numberValue = active.data.current?.value as number;
    const groupId = over.id as string;
    
    // Remove previous placement of this number
    setPlacements(prev => {
      const newPlacements = { ...prev };
      // If this number was placed elsewhere, remove it
      delete newPlacements[numberValue];
      // Place in new location
      newPlacements[numberValue] = groupId;
      return newPlacements;
    });
    
    sounds.tap();
  };

  const handleReset = () => {
    if (disabled || showResult) return;
    sounds.pop();
    setPlacements({});
  };

  const handleSubmit = () => {
    if (disabled || showResult) return;
    
    setShowResult(true);
    lockInteractions(2000);

    // Check each placement
    const newResults: Record<string, boolean> = {};
    let allCorrect = true;

    task.objectGroups.forEach(group => {
      // Find which number was placed on this group
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
      sounds.celebrate();
    } else {
      sounds.incorrect();
    }

    setTimeout(() => {
      onAnswer(placements, allCorrect);
    }, 2000);
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="question-card max-w-4xl mx-auto"
      >
        {/* Question */}
        <h2 className="text-child-lg text-center font-bold text-foreground mb-6">
          {task.instruction}
        </h2>

        {/* Draggable Numbers */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {task.numberSlots.map((slot, index) => (
            <motion.div
              key={slot.value}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <DraggableNumber
                value={slot.value}
                isPlaced={placements[slot.value] !== undefined}
              />
            </motion.div>
          ))}
        </div>

        {/* Drop Zones */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {task.objectGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <DroppableZone
                groupId={group.id}
                count={group.count}
                imageUrl={group.imageUrl}
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
              allPlaced && 'bg-success hover:bg-success/90'
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
                'mt-6 p-4 rounded-2xl text-center text-child-base font-bold',
                Object.values(results).every(Boolean) 
                  ? 'bg-success/20 text-success' 
                  : 'bg-warning/20 text-warning'
              )}
            >
              {Object.values(results).every(Boolean)
                ? '🎉 Amazing! You matched them all correctly!'
                : "Some matches weren't quite right. Let's learn more!"}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && (
          <div className="w-20 h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-child-xl font-bold shadow-2xl">
            {activeId.replace('number-', '')}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
