import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTutorFeedbackOptions {
  enabled?: boolean;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

// Encouraging phrases for correct answers
const CORRECT_PHRASES = [
  "Amazing! You got it right!",
  "Wonderful! You're so smart!",
  "That's correct! Great job!",
  "Yes! You're doing fantastic!",
  "Perfect! You're a star!",
  "Brilliant! Keep it up!",
  "Hooray! That's the right answer!",
  "Excellent work! You nailed it!",
];

// Gentle, encouraging phrases for incorrect answers
const INCORRECT_PHRASES = [
  "Oops, not quite! Let me help you.",
  "That's okay! Let's try again together.",
  "Almost there! Let me explain.",
  "Good try! Here's a little hint.",
  "No worries! Learning takes practice.",
];

/**
 * Hook for AI tutor voice feedback
 * Provides encouraging feedback for correct answers and helpful explanations for wrong ones
 */
export function useTutorFeedback(options: UseTutorFeedbackOptions = {}) {
  const { enabled = true, onSpeakStart, onSpeakEnd } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!enabled) return;
    
    try {
      setIsLoading(true);
      
      // Get user session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('No session for TTS');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            text, 
            voice: 'shimmer', // Child-friendly voice
            emotion: 'cheerful'
          }),
        }
      );

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

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
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        onSpeakEnd?.();
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, onSpeakStart, onSpeakEnd]);

  const celebrateCorrect = useCallback(async (customMessage?: string) => {
    const phrase = customMessage || CORRECT_PHRASES[Math.floor(Math.random() * CORRECT_PHRASES.length)];
    await speak(phrase);
  }, [speak]);

  const encourageIncorrect = useCallback(async (
    correctAnswer: string | number,
    explanation?: string
  ) => {
    const basePhrase = INCORRECT_PHRASES[Math.floor(Math.random() * INCORRECT_PHRASES.length)];
    const fullMessage = explanation 
      ? `${basePhrase} The correct answer is ${correctAnswer}. ${explanation}`
      : `${basePhrase} The correct answer is ${correctAnswer}. Let's try more questions to practice!`;
    
    await speak(fullMessage);
  }, [speak]);

  const giveHint = useCallback(async (hint: string) => {
    await speak(`Here's a hint: ${hint}`);
  }, [speak]);

  const introduceTask = useCallback(async (instruction: string) => {
    await speak(instruction);
  }, [speak]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
      onSpeakEnd?.();
    }
  }, [onSpeakEnd]);

  return {
    speak,
    celebrateCorrect,
    encourageIncorrect,
    giveHint,
    introduceTask,
    stop,
    isSpeaking,
    isLoading,
  };
}
