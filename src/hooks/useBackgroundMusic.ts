import { useRef, useCallback, useEffect, useState } from 'react';

interface UseBackgroundMusicOptions {
  autoPlay?: boolean;
}

// Royalty-free children's learning music - gentle piano loop
// Source: Free Music Archive / Public Domain
const BACKGROUND_MUSIC_URL = 'https://cdn.pixabay.com/audio/2024/11/04/audio_c978921b66.mp3';

/**
 * Background music hook using a royalty-free ambient track
 * Plays a child-friendly, mellow loop for learning sessions
 */
export function useBackgroundMusic(options: UseBackgroundMusicOptions = {}) {
  const { autoPlay = false } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(0.15);
  const [error, setError] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  const initializeAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio(BACKGROUND_MUSIC_URL);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';

    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.oncanplaythrough = () => setIsLoading(false);
    audio.onerror = () => {
      setError('Failed to load background music');
      setIsPlaying(false);
      setIsLoading(false);
    };

    audioRef.current = audio;
    return audio;
  }, [volume]);

  const play = useCallback(async () => {
    try {
      const audio = initializeAudio();
      
      if (!hasInitializedRef.current) {
        setIsLoading(true);
        hasInitializedRef.current = true;
      }

      await audio.play();
      setError(null);
    } catch (err) {
      // Browser may block autoplay - this is expected
      console.log('Background music play blocked (expected on first load):', err);
      setIsLoading(false);
    }
  }, [initializeAudio]);

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

  // Preload audio on mount
  useEffect(() => {
    initializeAudio();
  }, [initializeAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Auto-play if enabled (requires user interaction first due to browser policies)
  useEffect(() => {
    if (autoPlay && !isPlaying && !isLoading) {
      const timer = setTimeout(() => {
        play();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isPlaying, isLoading, play]);

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
