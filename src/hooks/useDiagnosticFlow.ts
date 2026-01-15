import { useState, useCallback } from 'react';
import type { 
  DiagnosticState, 
  DiagnosticLevel, 
  TaskResult,
  DiagnosticTask 
} from '@/types/diagnostic';

// Initial diagnostic tasks based on the PDF specification
const DIAGNOSTIC_TASKS: Record<DiagnosticLevel, { A: DiagnosticTask; B: DiagnosticTask }> = {
  level_1: {
    A: {
      type: 'count_objects',
      taskId: 'L1_A',
      instruction: 'How many birds are sitting on the branch?',
      voicePrompt: 'Look at the picture. Can you count how many birds are sitting on the branch? Take your time!',
      imageUrl: '/diagnostic/birds.png',
      correctAnswer: 5,
      options: [
        { value: 4, label: 'Four' },
        { value: 5, label: 'Five' },
        { value: 6, label: 'Six' }
      ]
    },
    B: {
      type: 'tap_count',
      taskId: 'L1_B',
      instruction: 'Tap on seven apples!',
      voicePrompt: 'Can you tap on exactly seven apples? Touch them one by one!',
      objects: Array.from({ length: 12 }, (_, i) => ({
        id: `apple-${i}`,
        x: (i % 4) * 25 + 10,
        y: Math.floor(i / 4) * 30 + 10,
        imageUrl: '/diagnostic/apple.png'
      })),
      targetCount: 7
    }
  },
  level_2: {
    A: {
      type: 'drag_drop_match',
      taskId: 'L2_A',
      instruction: 'Match the numbers to the groups!',
      voicePrompt: 'Drag each number to the group that has that many things. Let\'s match them up!',
      numberSlots: [
        { value: 3, x: 0, y: 0 },
        { value: 4, x: 0, y: 1 },
        { value: 5, x: 0, y: 2 }
      ],
      objectGroups: [
        { id: 'group-3', count: 3, imageUrl: '/diagnostic/dice_1.png' },
        { id: 'group-4', count: 4, imageUrl: '/diagnostic/dice_2.png' },
        { id: 'group-5', count: 5, imageUrl: '/diagnostic/dice_3.png' }
      ]
    },
    B: {
      type: 'count_grouped',
      taskId: 'L2_B',
      instruction: 'Which number matches this picture?',
      voicePrompt: 'Look at the bundle of sticks and the loose sticks. How many sticks are there altogether?',
      bundleCount: 1,
      looseCount: 3,
      bundleSize: 10,
      imageUrl: '/diagnostic/sticks.png',
      options: [
        { value: 10, label: '10' },
        { value: 12, label: '12' },
        { value: 13, label: '13' }
      ]
    }
  }
};

const initialState: DiagnosticState = {
  currentLevel: 'level_1',
  currentTask: 'A',
  taskResults: [],
  repairAttempts: 0,
  needsExtraSupport: false,
  isComplete: false,
  passedLevel1: false,
  passedLevel2: false
};

export function useDiagnosticFlow() {
  const [state, setState] = useState<DiagnosticState>(initialState);

  // Get current task data
  const getCurrentTask = useCallback((): DiagnosticTask | null => {
    if (state.isComplete || state.currentTask === 'repair') {
      return null;
    }
    return DIAGNOSTIC_TASKS[state.currentLevel][state.currentTask];
  }, [state.currentLevel, state.currentTask, state.isComplete]);

  // Process task result according to routing logic
  const submitTaskResult = useCallback((result: TaskResult) => {
    setState(prev => {
      const newResults = [...prev.taskResults, result];
      
      // Level 1 Logic
      if (prev.currentLevel === 'level_1') {
        if (prev.currentTask === 'A') {
          if (result.isCorrect) {
            // Task A correct → Move to Level 2
            return {
              ...prev,
              taskResults: newResults,
              currentLevel: 'level_2',
              currentTask: 'A',
              passedLevel1: true
            };
          } else {
            // Task A incorrect → Try Task B
            return {
              ...prev,
              taskResults: newResults,
              currentTask: 'B'
            };
          }
        } else if (prev.currentTask === 'B') {
          if (result.isCorrect) {
            // Task B correct → Level 1 cleared, Move to Level 2
            return {
              ...prev,
              taskResults: newResults,
              currentLevel: 'level_2',
              currentTask: 'A',
              passedLevel1: true
            };
          } else {
            // Both A & B failed → Repair needed
            return {
              ...prev,
              taskResults: newResults,
              currentTask: 'repair',
              repairAttempts: prev.repairAttempts + 1
            };
          }
        }
      }
      
      // Level 2 Logic
      if (prev.currentLevel === 'level_2') {
        // Get results for Level 2 tasks
        const level2Results = newResults.filter(r => 
          r.taskId === 'L2_A' || r.taskId === 'L2_B'
        );
        
        if (prev.currentTask === 'A') {
          // Always attempt both tasks in Level 2
          return {
            ...prev,
            taskResults: newResults,
            currentTask: 'B'
          };
        } else if (prev.currentTask === 'B') {
          const taskAResult = level2Results.find(r => r.taskId === 'L2_A');
          const taskBResult = result;
          
          const taskACorrect = taskAResult?.isCorrect ?? false;
          const taskBCorrect = taskBResult.isCorrect;
          
          if (taskACorrect && taskBCorrect) {
            // Both correct → Diagnostic passed
            return {
              ...prev,
              taskResults: newResults,
              isComplete: true,
              passedLevel2: true,
              needsExtraSupport: false
            };
          } else if (taskACorrect !== taskBCorrect) {
            // One correct, one incorrect → Proceed with extra support
            return {
              ...prev,
              taskResults: newResults,
              isComplete: true,
              passedLevel2: true,
              needsExtraSupport: true
            };
          } else {
            // Both incorrect → Repair needed
            return {
              ...prev,
              taskResults: newResults,
              currentTask: 'repair',
              repairAttempts: prev.repairAttempts + 1
            };
          }
        }
      }
      
      return prev;
    });
  }, []);

  // Complete repair and retry
  const completeRepair = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentTask: 'A' // Retry from Task A of current level
    }));
  }, []);

  // Reset diagnostic
  const resetDiagnostic = useCallback(() => {
    setState(initialState);
  }, []);

  // Get diagnostic summary for results page
  const getDiagnosticSummary = useCallback(() => {
    const { taskResults, passedLevel1, passedLevel2, needsExtraSupport, repairAttempts } = state;
    
    const correctCount = taskResults.filter(r => r.isCorrect).length;
    const totalTime = taskResults.reduce((sum, r) => sum + r.timeTakenSeconds, 0);
    
    // Identify gaps based on incorrect answers
    const gaps: string[] = [];
    const strengths: string[] = [];
    
    taskResults.forEach(result => {
      const topic = result.taskId.startsWith('L1') ? 'Basic Counting' : 'Grouped Counting';
      if (result.isCorrect) {
        if (!strengths.includes(topic)) strengths.push(topic);
      } else {
        if (!gaps.includes(topic)) gaps.push(topic);
      }
    });
    
    return {
      passed: passedLevel1 || passedLevel2,
      passedLevel1,
      passedLevel2,
      needsExtraSupport,
      repairAttempts,
      correctCount,
      totalQuestions: taskResults.length,
      totalTimeSeconds: totalTime,
      gaps,
      strengths
    };
  }, [state]);

  return {
    state,
    getCurrentTask,
    submitTaskResult,
    completeRepair,
    resetDiagnostic,
    getDiagnosticSummary,
    isInRepair: state.currentTask === 'repair',
    isComplete: state.isComplete
  };
}
