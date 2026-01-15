import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { ArrowRight, Eye, Hand } from 'lucide-react';

interface RepairFlowProps {
  level: 'level_1' | 'level_2';
  onComplete: () => void;
  onVoicePrompt?: (text: string, emotion?: string) => void;
}

interface RepairStep {
  instruction: string;
  voicePrompt: string;
  visual: React.ReactNode;
  type: 'watch' | 'practice';
}

// Repair steps for Level 1 (counting fundamentals)
const LEVEL_1_REPAIR_STEPS: RepairStep[] = [
  {
    instruction: "Let's count together! Watch me count these stars.",
    voicePrompt: "Watch carefully as I count each star. One... two... three... four... five! We touch each one as we count.",
    type: 'watch',
    visual: (
      <div className="flex gap-4 items-center justify-center">
        {[1, 2, 3, 4, 5].map((num) => (
          <motion.div
            key={num}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: num * 0.8 }}
            className="relative"
          >
            <span className="text-6xl">⭐</span>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: num * 0.8 + 0.4 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-child-lg font-bold text-primary"
            >
              {num}
            </motion.span>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    instruction: "Now you try! Touch each heart as you count.",
    voicePrompt: "Your turn! Touch each heart one at a time. Say the number as you touch it.",
    type: 'practice',
    visual: (
      <div className="flex gap-4 items-center justify-center">
        {[1, 2, 3, 4].map((num) => (
          <motion.div
            key={num}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: num * 0.2 }}
            className="p-4 bg-pink-100 dark:bg-pink-900/30 rounded-2xl cursor-pointer hover:scale-110 transition-transform"
          >
            <span className="text-5xl">💖</span>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    instruction: "Great job! Remember: touch each object once and say the number.",
    voicePrompt: "You're doing amazing! The key is to touch each thing once, and say the number out loud. Let's try the quiz again!",
    type: 'watch',
    visual: (
      <div className="text-center">
        <motion.span 
          className="text-8xl block mb-4"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          🌟
        </motion.span>
        <p className="text-child-base text-muted-foreground">
          Touch once, count once!
        </p>
      </div>
    ),
  },
];

// Repair steps for Level 2 (place value / grouping)
const LEVEL_2_REPAIR_STEPS: RepairStep[] = [
  {
    instruction: "Let's learn about groups of ten!",
    voicePrompt: "Ten is a special number! When we have 10 things, we can put them in a bundle. Watch!",
    type: 'watch',
    visual: (
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="w-4 h-16 bg-amber-500 rounded-sm"
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          className="text-child-lg font-bold text-primary"
        >
          = 1 bundle of 10!
        </motion.div>
      </div>
    ),
  },
  {
    instruction: "A bundle plus some extras!",
    voicePrompt: "Look! One bundle of ten, plus 3 more. That's 10 plus 3, which equals 13!",
    type: 'watch',
    visual: (
      <div className="flex items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-24 bg-amber-600 rounded-md border-2 border-amber-800 flex items-center justify-center">
            <span className="text-white font-bold text-sm rotate-90">10</span>
          </div>
          <span className="text-sm text-muted-foreground">Bundle (10)</span>
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-child-xl font-bold"
        >
          +
        </motion.span>
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + n * 0.2 }}
                className="w-3 h-16 bg-amber-500 rounded-sm"
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">Extras (3)</span>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5 }}
          className="flex flex-col items-center"
        >
          <span className="text-child-xl font-bold">=</span>
          <span className="text-child-xl font-bold text-success">13</span>
        </motion.div>
      </div>
    ),
  },
  {
    instruction: "You're ready to try again!",
    voicePrompt: "Remember: count the bundles of ten first, then add the extras. You've got this!",
    type: 'watch',
    visual: (
      <div className="text-center">
        <motion.span 
          className="text-8xl block mb-4"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          🎯
        </motion.span>
        <p className="text-child-base text-muted-foreground">
          Bundle = 10, then add extras!
        </p>
      </div>
    ),
  },
];

export function RepairFlow({ level, onComplete, onVoicePrompt }: RepairFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const sounds = useSoundEffects();
  
  const steps = level === 'level_1' ? LEVEL_1_REPAIR_STEPS : LEVEL_2_REPAIR_STEPS;
  const currentRepairStep = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    onVoicePrompt?.(currentRepairStep.voicePrompt, 'guiding');
  }, [currentStep, currentRepairStep.voicePrompt, onVoicePrompt]);

  const handleNext = () => {
    sounds.pop();
    
    if (isLastStep) {
      sounds.celebrate();
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="question-card max-w-2xl mx-auto"
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              index === currentStep ? 'bg-primary' : 'bg-muted'
            )}
            animate={index === currentStep ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        ))}
      </div>

      {/* Step type indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {currentRepairStep.type === 'watch' ? (
          <>
            <Eye className="w-5 h-5 text-primary" />
            <span className="text-sm text-primary font-medium">Watch & Learn</span>
          </>
        ) : (
          <>
            <Hand className="w-5 h-5 text-success" />
            <span className="text-sm text-success font-medium">Your Turn!</span>
          </>
        )}
      </div>

      {/* Instruction */}
      <h2 className="text-child-lg text-center font-bold text-foreground mb-8">
        {currentRepairStep.instruction}
      </h2>

      {/* Visual content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="min-h-[200px] flex items-center justify-center mb-8"
        >
          {currentRepairStep.visual}
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleNext}
          className="btn-child bg-primary text-primary-foreground"
        >
          {isLastStep ? "I'm Ready to Try Again!" : "Next"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
