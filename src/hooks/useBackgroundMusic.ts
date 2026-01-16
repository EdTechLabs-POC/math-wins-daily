import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseBackgroundMusicOptions {
  autoPlay?: boolean;
}

/**
 * Background music hook using ElevenLabs AI-generated music
 * Generates a child-friendly, mellow loop for learning sessions
 */
export function useBackgroundMusic(options: UseBackgroundMusicOptions = {}) {
  const { autoPlay = false } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(0.2);
  const [error, setError] = useState<string | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const hasGeneratedRef = useRef(false);

  // Music prompt for child-friendly learning ambient
  const MUSIC_PROMPT = "Gentle, calming children's background music with soft piano and light synthesizer pads. Playful but not distracting, suitable for focus and learning. Loopable ambient track with a positive, encouraging mood. No vocals.";

  const generateAndPlay = useCallback(async () => {
    // If we already have generated audio, just play it
    if (audioUrlRef.current && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    // Only generate once per session
    if (hasGeneratedRef.current || isLoading) return;
    hasGeneratedRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      console.log('Generating background music...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-music`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            prompt: MUSIC_PROMPT,
            duration: 30, // 30 seconds, will loop
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate music');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audio.loop = true;
      audio.volume = volume;
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onerror = () => {
        setError('Failed to play music');
        setIsPlaying(false);
      };

      await audio.play();
      console.log('Background music started');
    } catch (err) {
      console.error('Background music error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      hasGeneratedRef.current = false; // Allow retry
    } finally {
      setIsLoading(false);
    }
  }, [volume, isLoading]);

  const play = useCallback(() => {
    if (audioRef.current && audioUrlRef.current) {
      audioRef.current.play();
      return;
    }
    generateAndPlay();
  }, [generateAndPlay]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  // Auto-play if enabled (requires user interaction first due to browser policies)
  useEffect(() => {
    if (autoPlay && !isPlaying && !isLoading && !hasGeneratedRef.current) {
      // Delayed auto-play after a short time
      const timer = setTimeout(() => {
        generateAndPlay();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isPlaying, isLoading, generateAndPlay]);

  return {
    isPlaying,
    isLoading,
    play,
    pause,
    toggle,
    volume,
    setVolume,
    error,
  };
}
