import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VoiceMessage } from '@/types/diagnostic';

interface UseVoiceCompanionOptions {
  voiceId?: string;
  autoPlay?: boolean;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - warm, friendly voice

export function useVoiceCompanion(options: UseVoiceCompanionOptions = {}) {
  const { 
    voiceId = VOICE_ID, 
    autoPlay = true,
    onSpeakStart,
    onSpeakEnd 
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageQueueRef = useRef<VoiceMessage[]>([]);
  const isProcessingRef = useRef(false);

  // Process message queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || messageQueueRef.current.length === 0) return;
    
    isProcessingRef.current = true;
    const message = messageQueueRef.current.shift();
    
    if (message) {
      await speakMessage(message);
    }
    
    isProcessingRef.current = false;
    
    // Process next message if any
    if (messageQueueRef.current.length > 0) {
      processQueue();
    }
  }, []);

  // Speak a message using ElevenLabs TTS
  const speakMessage = useCallback(async (message: VoiceMessage): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: message.text, 
            voiceId,
            emotion: message.emotion 
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Stop any currently playing audio
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
        setError('Failed to play audio');
        setIsSpeaking(false);
      };

      if (autoPlay) {
        await audio.play();
      }
    } catch (err) {
      console.error('Voice companion error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate speech');
    } finally {
      setIsLoading(false);
    }
  }, [voiceId, autoPlay, onSpeakStart, onSpeakEnd]);

  // Queue a message for speaking
  const speak = useCallback((message: VoiceMessage) => {
    // High priority messages jump to front of queue
    if (message.priority === 'high') {
      messageQueueRef.current.unshift(message);
    } else {
      messageQueueRef.current.push(message);
    }
    processQueue();
  }, [processQueue]);

  // Quick speak method for simple text
  const say = useCallback((text: string, emotion: VoiceMessage['emotion'] = 'neutral') => {
    speak({ text, emotion, priority: 'normal' });
  }, [speak]);

  // Stop speaking
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    messageQueueRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Pre-defined voice prompts for common scenarios
  const prompts = {
    welcome: (name: string) => speak({
      text: `Hi ${name}! I'm so excited to learn with you today. Let's have some fun with numbers!`,
      emotion: 'encouraging',
      priority: 'high'
    }),
    
    taskIntro: (instruction: string) => speak({
      text: instruction,
      emotion: 'guiding',
      priority: 'high'
    }),
    
    correct: () => {
      const responses = [
        "Brilliant! You got it!",
        "Amazing work! That's exactly right!",
        "Wonderful! You're doing so well!",
        "Yes! Great job!",
        "Perfect! You're a math star!"
      ];
      speak({
        text: responses[Math.floor(Math.random() * responses.length)],
        emotion: 'celebrating',
        priority: 'high'
      });
    },
    
    incorrect: () => {
      const responses = [
        "Hmm, not quite. Let's try again!",
        "That's okay! Everyone makes mistakes. Let's have another go.",
        "Almost! You're getting closer. Try once more.",
        "Don't worry! Let's think about this together."
      ];
      speak({
        text: responses[Math.floor(Math.random() * responses.length)],
        emotion: 'comforting',
        priority: 'high'
      });
    },
    
    hint: (hintText: string) => speak({
      text: `Here's a little hint: ${hintText}`,
      emotion: 'guiding',
      priority: 'normal'
    }),
    
    levelComplete: () => speak({
      text: "Fantastic! You've completed this level! You're doing amazing!",
      emotion: 'celebrating',
      priority: 'high'
    }),
    
    encouragement: () => {
      const responses = [
        "You can do this! I believe in you!",
        "Take your time, there's no rush.",
        "You're doing great! Keep going!",
        "I'm right here with you. Let's figure this out together."
      ];
      speak({
        text: responses[Math.floor(Math.random() * responses.length)],
        emotion: 'encouraging',
        priority: 'normal'
      });
    },
    
    repair: (step: number) => speak({
      text: step === 1 
        ? "Let's go back to the basics together. We'll count one thing at a time!"
        : "Great! Now let's add one more. Can you count with me?",
      emotion: 'guiding',
      priority: 'high'
    })
  };

  return {
    speak,
    say,
    stop,
    prompts,
    isSpeaking,
    isLoading,
    error
  };
}
