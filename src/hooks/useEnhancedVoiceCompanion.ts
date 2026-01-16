import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseEnhancedVoiceCompanionOptions {
  enabled?: boolean;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

// Rich variations for correct answers - dopamine-inducing phrases
const CORRECT_CELEBRATIONS = [
  "Yay! You did it! That's exactly right!",
  "Woohoo! You're absolutely brilliant!",
  "Amazing work! Your brain is on fire today!",
  "Fantastic! You're getting so good at this!",
  "Yes! You're a math superstar!",
  "Incredible! That was perfect!",
  "You're rocking it! Great job!",
  "Boom! Another one right! You're unstoppable!",
  "High five! That's the correct answer!",
  "Wonderful! You figured it out!",
  "Super duper! You're so smart!",
  "That's it! You're doing amazing!",
  "Hooray! You're on a roll!",
  "Bravo! Keep up the fantastic work!",
  "You nailed it! I'm so proud of you!",
];

// Gentle, supportive phrases for incorrect answers
const INCORRECT_ENCOURAGEMENTS = [
  "I can see why you thought that! Let me show you another way to look at it.",
  "That's a really good try! Here's a little secret that might help.",
  "Oops! But you know what? Making mistakes is how we learn!",
  "Almost there! Let's figure this out together.",
  "Good thinking, but let's take another look at this one.",
  "That's okay! Even the smartest people make mistakes sometimes.",
  "Nice try! Here's a hint that might help you.",
  "Not quite, but I love that you're trying! Let's work on this.",
  "Hmm, that's close! Let me help you see it a different way.",
  "Great effort! The answer is a little different, but you're learning!",
];

// Hints and guidance phrases
const HINT_INTROS = [
  "Here's a little clue for you:",
  "Try thinking about it this way:",
  "Here's something that might help:",
  "Let me give you a hint:",
  "Think about this:",
];

// Task introduction phrases
const TASK_INTROS = [
  "Okay, here's a fun one for you!",
  "Let's try this next!",
  "Here comes a new challenge!",
  "Are you ready? Here we go!",
  "Time for your next adventure!",
];

// Level completion celebrations
const LEVEL_COMPLETE = [
  "Wow! You finished the whole level! That's incredible!",
  "You did it! You completed the level! I'm so proud of you!",
  "Amazing! You've conquered this level! You're a champion!",
  "Fantastic work! You've mastered this level!",
  "You're a superstar! That level is done and dusted!",
];

// Encouragement during longer sessions
const MID_SESSION_ENCOURAGEMENTS = [
  "You're doing so well! Keep going!",
  "I can see you're working hard! That's wonderful!",
  "Your brain is getting stronger with every question!",
  "You're making great progress! I believe in you!",
  "Look at you go! You're becoming a math expert!",
];

export function useEnhancedVoiceCompanion(options: UseEnhancedVoiceCompanionOptions = {}) {
  const { enabled = true, onSpeakStart, onSpeakEnd } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;
    isProcessingRef.current = true;

    while (queueRef.current.length > 0) {
      const text = queueRef.current.shift();
      if (!text) continue;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.warn('No session for TTS');
          continue;
        }

        setIsLoading(true);
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ text }),
          }
        );

        setIsLoading(false);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'TTS request failed');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        await new Promise<void>((resolve, reject) => {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onplay = () => {
            setIsSpeaking(true);
            onSpeakStart?.();
          };

          audio.onended = () => {
            setIsSpeaking(false);
            onSpeakEnd?.();
            URL.revokeObjectURL(audioUrl);
            resolve();
          };

          audio.onerror = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            reject(new Error('Audio playback failed'));
          };

          audio.play().catch(reject);
        });
      } catch (err) {
        console.error('TTS error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    }

    isProcessingRef.current = false;
  }, [onSpeakStart, onSpeakEnd]);

  const speak = useCallback(async (text: string, priority: boolean = false) => {
    if (!enabled) return;
    
    if (priority) {
      queueRef.current.unshift(text);
    } else {
      queueRef.current.push(text);
    }
    
    processQueue();
  }, [enabled, processQueue]);

  const stop = useCallback(() => {
    queueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
      onSpeakEnd?.();
    }
  }, [onSpeakEnd]);

  // Helper to get random item from array
  const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Celebrate correct answer with random variation
  const celebrateCorrect = useCallback(async (customMessage?: string) => {
    const message = customMessage || randomFrom(CORRECT_CELEBRATIONS);
    await speak(message);
  }, [speak]);

  // Encourage after incorrect answer with random variation
  const encourageIncorrect = useCallback(async (
    correctAnswer: string | number,
    customMessage?: string
  ) => {
    const intro = customMessage || randomFrom(INCORRECT_ENCOURAGEMENTS);
    const message = `${intro} The correct answer was ${correctAnswer}.`;
    await speak(message);
  }, [speak]);

  // Give a hint
  const giveHint = useCallback(async (hint: string) => {
    const intro = randomFrom(HINT_INTROS);
    await speak(`${intro} ${hint}`);
  }, [speak]);

  // Introduce a new task
  const introduceTask = useCallback(async (instruction: string, useIntro: boolean = true) => {
    if (useIntro) {
      const intro = randomFrom(TASK_INTROS);
      await speak(`${intro} ${instruction}`);
    } else {
      await speak(instruction);
    }
  }, [speak]);

  // Celebrate completing a level
  const celebrateLevelComplete = useCallback(async () => {
    await speak(randomFrom(LEVEL_COMPLETE));
  }, [speak]);

  // Mid-session encouragement
  const encourage = useCallback(async () => {
    await speak(randomFrom(MID_SESSION_ENCOURAGEMENTS));
  }, [speak]);

  // Welcome the student
  const welcome = useCallback(async (studentName?: string) => {
    const name = studentName ? `, ${studentName}` : '';
    const messages = [
      `Hi there${name}! I'm so excited to learn with you today!`,
      `Hello${name}! Ready for some fun math adventures?`,
      `Welcome back${name}! Let's discover some amazing things together!`,
    ];
    await speak(randomFrom(messages));
  }, [speak]);

  // Read a question aloud
  const readQuestion = useCallback(async (voicePrompt: string) => {
    await speak(voicePrompt);
  }, [speak]);

  return {
    speak,
    stop,
    celebrateCorrect,
    encourageIncorrect,
    giveHint,
    introduceTask,
    celebrateLevelComplete,
    encourage,
    welcome,
    readQuestion,
    isSpeaking,
    isLoading,
    error,
  };
}
