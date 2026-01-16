import { useCallback, useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseEnhancedVoiceCompanionOptions {
  enabled?: boolean;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onError?: (error: string) => void;
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

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export function useEnhancedVoiceCompanion(options: UseEnhancedVoiceCompanionOptions = {}) {
  const { enabled = true, onSpeakStart, onSpeakEnd, onError } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  type QueueItem = {
    runId: number;
    text: string;
    resolve: () => void;
    reject: (err: Error) => void;
    retryCount?: number;
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const isProcessingRef = useRef(false);
  const lastSpokenTextRef = useRef<string | null>(null);

  // Each stop() increments runId and aborts any in-flight request.
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const forceResolvePlaybackRef = useRef<(() => void) | null>(null);
  const rateLimitResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;

      forceResolvePlaybackRef.current?.();
      forceResolvePlaybackRef.current = null;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (rateLimitResetTimerRef.current) {
        clearTimeout(rateLimitResetTimerRef.current);
      }

      queueRef.current.forEach(item => item.resolve());
      queueRef.current = [];
    };
  }, []);

  const handleError = useCallback((errorMessage: string, showToast = true) => {
    setError(errorMessage);
    onError?.(errorMessage);
    if (showToast) {
      toast.error('Voice unavailable', {
        description: errorMessage,
        duration: 5000,
      });
    }
  }, [onError]);

  const handleRateLimit = useCallback((retryAfterSeconds: number) => {
    setIsRateLimited(true);
    setRetryAfter(retryAfterSeconds);

    // Clear any existing timer
    if (rateLimitResetTimerRef.current) {
      clearTimeout(rateLimitResetTimerRef.current);
    }

    // Auto-reset rate limit status after the retry period
    rateLimitResetTimerRef.current = setTimeout(() => {
      setIsRateLimited(false);
      setRetryAfter(null);
      toast.success('Voice is back!', {
        description: 'You can use voice features again.',
        duration: 3000,
      });
    }, retryAfterSeconds * 1000);

    toast.warning('Voice temporarily paused', {
      description: `Too many requests. Voice will resume in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      duration: 8000,
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;
    isProcessingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current.shift();
        if (!item) continue;

        // If we stopped after this item was queued, skip it.
        if (item.runId !== runIdRef.current) {
          item.resolve();
          continue;
        }

        // Skip if currently rate limited
        if (isRateLimited) {
          console.log('TTS rate limited, skipping:', item.text.substring(0, 30));
          item.resolve();
          continue;
        }

        const retryCount = item.retryCount || 0;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            console.warn('No session for TTS');
            item.resolve();
            continue;
          }

          setIsLoading(true);
          setError(null);

          const controller = new AbortController();
          abortRef.current = controller;

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ text: item.text }),
              signal: controller.signal,
            }
          );

          abortRef.current = null;
          setIsLoading(false);

          // If we stopped while request was in-flight, do not play it.
          if (item.runId !== runIdRef.current) {
            item.resolve();
            continue;
          }

          // Handle rate limiting (429)
          if (response.status === 429) {
            const retryAfterHeader = response.headers.get('Retry-After');
            const retrySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
            handleRateLimit(retrySeconds);
            item.resolve();
            continue;
          }

          // Handle other errors with retry logic
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `TTS request failed (${response.status})`;

            // Retry with exponential backoff for server errors (5xx)
            if (response.status >= 500 && retryCount < MAX_RETRIES) {
              const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
              console.log(`TTS server error, retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
              
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              
              // Re-queue with incremented retry count
              queueRef.current.unshift({
                ...item,
                retryCount: retryCount + 1,
              });
              continue;
            }

            throw new Error(errorMessage);
          }

          const audioBlob = await response.blob();

          // If we stopped after receiving bytes, still skip playback.
          if (item.runId !== runIdRef.current) {
            item.resolve();
            continue;
          }

          const audioUrl = URL.createObjectURL(audioBlob);

          await new Promise<void>((audioResolve, audioReject) => {
            // Cancel immediately if we're no longer the active run.
            if (item.runId !== runIdRef.current) {
              URL.revokeObjectURL(audioUrl);
              audioResolve();
              return;
            }

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            const cleanup = () => {
              URL.revokeObjectURL(audioUrl);
              if (audioRef.current === audio) audioRef.current = null;
              forceResolvePlaybackRef.current = null;
            };

            // Allow stop() to resolve this promise
            forceResolvePlaybackRef.current = () => {
              try {
                audio.pause();
                audio.currentTime = 0;
              } catch {
                // ignore
              }
              setIsSpeaking(false);
              onSpeakEnd?.();
              cleanup();
              audioResolve();
            };

            audio.onplay = () => {
              setIsSpeaking(true);
              onSpeakStart?.();
            };

            audio.onended = () => {
              setIsSpeaking(false);
              onSpeakEnd?.();
              cleanup();
              audioResolve();
            };

            audio.onerror = () => {
              setIsSpeaking(false);
              cleanup();
              audioReject(new Error('Audio playback failed'));
            };

            audio.play().catch(audioReject);
          });

          item.resolve();
        } catch (err) {
          // AbortError is expected when stop() cancels in-flight requests
          if (err instanceof DOMException && err.name === 'AbortError') {
            setIsLoading(false);
            item.resolve();
            continue;
          }

          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error('TTS error:', err);
          handleError(errorMessage, retryCount >= MAX_RETRIES - 1);
          setIsLoading(false);
          item.resolve();
        } finally {
          abortRef.current = null;
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [onSpeakStart, onSpeakEnd, isRateLimited, handleError, handleRateLimit]);

  const speak = useCallback((text: string, options?: { priority?: boolean; allowDuplicate?: boolean }): Promise<void> => {
    return new Promise((resolve) => {
      if (!enabled || !text.trim()) {
        resolve();
        return;
      }

      // Skip if rate limited (but don't show toast for every call)
      if (isRateLimited) {
        console.log('TTS rate limited, skipping speak call');
        resolve();
        return;
      }

      const { priority = false, allowDuplicate = false } = options || {};

      // Prevent duplicate consecutive messages (unless explicitly allowed)
      if (!allowDuplicate && lastSpokenTextRef.current === text) {
        console.log('Skipping duplicate TTS:', text.substring(0, 50));
        resolve();
        return;
      }

      lastSpokenTextRef.current = text;

      const queueItem: QueueItem = {
        runId: runIdRef.current,
        text,
        resolve,
        reject: () => resolve(),
        retryCount: 0,
      };

      if (priority) {
        queueRef.current.unshift(queueItem);
      } else {
        queueRef.current.push(queueItem);
      }

      processQueue();
    });
  }, [enabled, processQueue, isRateLimited]);

  const stop = useCallback(() => {
    // Invalidate any queued/in-flight audio so it can't play on the next question
    runIdRef.current += 1;

    // Resolve all pending promises in queue
    queueRef.current.forEach(item => item.resolve());
    queueRef.current = [];

    // IMPORTANT: do NOT reset lastSpokenTextRef here.
    // We want accidental re-queues (e.g. previous question repeating) to be deduped.

    // Abort any in-flight TTS request
    abortRef.current?.abort();
    abortRef.current = null;

    // Force-resolve the current playback promise (prevents hung queue)
    if (forceResolvePlaybackRef.current) {
      forceResolvePlaybackRef.current();
      forceResolvePlaybackRef.current = null;
      return;
    }

    // Stop current audio (fallback)
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        // ignore
      }
      audioRef.current = null;
      setIsSpeaking(false);
      onSpeakEnd?.();
    }
  }, [onSpeakEnd]);

  // Clear duplicate tracking when stopping (allows same text after explicit stop)
  const clearAndSpeak = useCallback(async (text: string): Promise<void> => {
    stop();
    lastSpokenTextRef.current = null; // Reset so we can speak this text
    return speak(text, { allowDuplicate: true });
  }, [stop, speak]);

  // Helper to get random item from array
  const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Celebrate correct answer with random variation
  const celebrateCorrect = useCallback(async (customMessage?: string) => {
    const message = customMessage || randomFrom(CORRECT_CELEBRATIONS);
    await speak(message, { priority: true, allowDuplicate: true });
  }, [speak]);

  // Encourage after incorrect answer with random variation
  const encourageIncorrect = useCallback(async (
    correctAnswer: string | number,
    customMessage?: string
  ) => {
    const intro = customMessage || randomFrom(INCORRECT_ENCOURAGEMENTS);
    const message = `${intro} The correct answer was ${correctAnswer}.`;
    await speak(message, { priority: true, allowDuplicate: true });
  }, [speak]);

  // Give a hint
  const giveHint = useCallback(async (hint: string) => {
    const intro = randomFrom(HINT_INTROS);
    await speak(`${intro} ${hint}`, { allowDuplicate: true });
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
    await speak(randomFrom(LEVEL_COMPLETE), { priority: true, allowDuplicate: true });
  }, [speak]);

  // Mid-session encouragement
  const encourage = useCallback(async () => {
    await speak(randomFrom(MID_SESSION_ENCOURAGEMENTS), { allowDuplicate: true });
  }, [speak]);

  // Welcome the student
  const welcome = useCallback(async (studentName?: string) => {
    const name = studentName ? `, ${studentName}` : '';
    const messages = [
      `Hi there${name}! I'm so excited to learn with you today!`,
      `Hello${name}! Ready for some fun math adventures?`,
      `Welcome back${name}! Let's discover some amazing things together!`,
    ];
    await speak(randomFrom(messages), { allowDuplicate: true });
  }, [speak]);

  // Read a question aloud
  const readQuestion = useCallback(async (questionText: string) => {
    stop();
    await speak(questionText, { priority: true });
  }, [stop, speak]);

  return {
    speak,
    stop,
    clearAndSpeak,
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
    isRateLimited,
    retryAfter,
  };
}
