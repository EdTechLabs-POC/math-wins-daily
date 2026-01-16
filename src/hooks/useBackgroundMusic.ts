import { useRef, useCallback, useEffect, useState } from 'react';

interface UseBackgroundMusicOptions {
  autoPlay?: boolean;
}

// Local royalty-free background music file
const BACKGROUND_MUSIC_URL = '/audio/background-music.mp3';

/**
 * Background music hook using a local ambient track
 * Plays a child-friendly, mellow loop for learning sessions
 */
export function useBackgroundMusic(options: UseBackgroundMusicOptions = {}) {
  const { autoPlay = false } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(0.15);
  const [error, setError] = useState<string | null>(null);

  const initializeAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    console.log('Initializing background music from:', BACKGROUND_MUSIC_URL);
    
    const audio = new Audio(BACKGROUND_MUSIC_URL);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';

    audio.onplay = () => {
      console.log('Background music playing');
      setIsPlaying(true);
      setError(null);
    };
    
    audio.onpause = () => {
      setIsPlaying(false);
    };
    
    audio.oncanplaythrough = () => {
      console.log('Background music ready');
      setIsLoading(false);
    };
    
    audio.onerror = (e) => {
      console.error('Background music load error:', e);
      setError('Failed to load music');
      setIsLoading(false);
    };

    audioRef.current = audio;
    return audio;
  }, [volume]);

  const play = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const audio = initializeAudio();

      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log('Background music started');
      }
    } catch (err) {
      console.error('Background music play error:', err);
      // NotAllowedError is expected if user hasn't interacted yet
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Click Play to start music');
      } else {
        setError('Could not play music');
      }
    } finally {
      setIsLoading(false);
    }
  }, [initializeAudio]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const toggle = useCallback(() => {
    console.log('Toggle music, currently playing:', isPlaying);
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
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Auto-play if enabled
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
