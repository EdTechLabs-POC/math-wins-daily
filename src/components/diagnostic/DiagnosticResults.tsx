import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Star, Trophy, Target, ArrowRight, RefreshCw } from 'lucide-react';

interface DiagnosticResultsProps {
  summary: {
    passed: boolean;
    passedLevel1: boolean;
    passedLevel2: boolean;
    needsExtraSupport: boolean;
    repairAttempts: number;
    correctCount: number;
    totalQuestions: number;
    totalTimeSeconds: number;
    gaps: string[];
    strengths: string[];
  };
  studentName?: string;
  onContinue: () => void;
  onRetry: () => void;
}

export function DiagnosticResults({ 
  summary, 
  studentName = 'Champion',
  onContinue,
  onRetry 
}: DiagnosticResultsProps) {
  const scorePercentage = Math.round((summary.correctCount / summary.totalQuestions) * 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="question-card max-w-2xl mx-auto text-center"
    >
      {/* Celebration header */}
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        className="mb-6"
      >
        <motion.span 
          className="text-7xl block mb-4"
          animate={{ 
            rotate: [0, -10, 10, -10, 10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          {summary.passed ? '🎉' : '💪'}
        </motion.span>
        
        <h1 className="text-child-xl font-bold text-foreground">
          {summary.passed 
            ? `Amazing Job, ${studentName}!` 
            : `Great Effort, ${studentName}!`}
        </h1>
      </motion.div>

      {/* Score display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="12"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={352}
              initial={{ strokeDashoffset: 352 }}
              animate={{ strokeDashoffset: 352 - (352 * scorePercentage) / 100 }}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-child-lg font-bold text-primary">
              {summary.correctCount}/{summary.totalQuestions}
            </span>
          </div>
        </div>
        
        <p className="text-muted-foreground">Questions answered correctly</p>
      </motion.div>

      {/* Level progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center gap-6 mb-8"
      >
        <div className={cn(
          'flex flex-col items-center p-4 rounded-2xl',
          summary.passedLevel1 ? 'bg-success/20' : 'bg-muted'
        )}>
          <Star className={cn(
            'w-8 h-8 mb-2',
            summary.passedLevel1 ? 'text-success fill-success' : 'text-muted-foreground'
          )} />
          <span className="text-sm font-medium">Level 1</span>
          <span className="text-xs text-muted-foreground">
            {summary.passedLevel1 ? 'Completed!' : 'In Progress'}
          </span>
        </div>
        
        <div className={cn(
          'flex flex-col items-center p-4 rounded-2xl',
          summary.passedLevel2 ? 'bg-success/20' : 'bg-muted'
        )}>
          <Trophy className={cn(
            'w-8 h-8 mb-2',
            summary.passedLevel2 ? 'text-success fill-success' : 'text-muted-foreground'
          )} />
          <span className="text-sm font-medium">Level 2</span>
          <span className="text-xs text-muted-foreground">
            {summary.passedLevel2 ? 'Completed!' : 'In Progress'}
          </span>
        </div>
      </motion.div>

      {/* Strengths and gaps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-2 gap-4 mb-8"
      >
        {summary.strengths.length > 0 && (
          <div className="bg-success/10 rounded-2xl p-4 text-left">
            <h3 className="font-bold text-success mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" />
              You're great at:
            </h3>
            <ul className="text-sm text-muted-foreground">
              {summary.strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        )}
        
        {summary.gaps.length > 0 && (
          <div className="bg-warning/10 rounded-2xl p-4 text-left">
            <h3 className="font-bold text-warning mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              We'll practice:
            </h3>
            <ul className="text-sm text-muted-foreground">
              {summary.gaps.map((g, i) => (
                <li key={i}>• {g}</li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>

      {/* Extra support message */}
      {summary.needsExtraSupport && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-sm text-muted-foreground bg-muted rounded-xl p-4 mb-6"
        >
          🌟 We'll give you extra practice time and hints to help you master these skills!
        </motion.p>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex justify-center gap-4"
      >
        {!summary.passed && (
          <Button
            variant="outline"
            size="lg"
            onClick={onRetry}
            className="btn-child"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
        )}
        
        <Button
          size="lg"
          onClick={onContinue}
          className="btn-child bg-primary text-primary-foreground"
        >
          {summary.passed ? 'Start Learning!' : 'Continue'}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
