import { useRef, useCallback, useEffect, useState } from 'react';

interface UseBackgroundMusicOptions {
  autoPlay?: boolean;
}

// Multiple royalty-free children's learning music options as fallbacks
const BACKGROUND_MUSIC_URLS = [
  'https://cdn.pixabay.com/audio/2024/11/04/audio_c978921b66.mp3',
  'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
  'https://cdn.pixabay.com/audio/2024/02/14/audio_78e10a4d0e.mp3',
];

/**
 * Background music hook using royalty-free ambient tracks
 * Plays a child-friendly, mellow loop for learning sessions
 */
export function useBackgroundMusic(options: UseBackgroundMusicOptions = {}) {
  const { autoPlay = false } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(0.15);
  const [error, setError] = useState<string | null>(null);
  const currentUrlIndexRef = useRef(0);

  const createAudio = useCallback((url: string) => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    audio.src = url;
    return audio;
  }, [volume]);

  const tryNextUrl = useCallback(() => {
    currentUrlIndexRef.current++;
    if (currentUrlIndexRef.current < BACKGROUND_MUSIC_URLS.length) {
      const nextUrl = BACKGROUND_MUSIC_URLS[currentUrlIndexRef.current];
      console.log('Trying next music URL:', nextUrl);
      if (audioRef.current) {
        audioRef.current.src = nextUrl;
        audioRef.current.load();
      }
      return true;
    }
    return false;
  }, []);

  const initializeAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const url = BACKGROUND_MUSIC_URLS[currentUrlIndexRef.current];
    console.log('Initializing background music:', url);
    
    const audio = createAudio(url);

    audio.onplay = () => {
      console.log('Background music playing');
      setIsPlaying(true);
      setError(null);
    };
    
    audio.onpause = () => {
      setIsPlaying(false);
    };
    
    audio.oncanplaythrough = () => {
      console.log('Background music ready to play');
      setIsLoading(false);
    };
    
    audio.onerror = (e) => {
      console.error('Background music error:', e);
      // Try next URL
      if (!tryNextUrl()) {
        setError('Failed to load background music');
        setIsLoading(false);
      }
    };

    audioRef.current = audio;
    return audio;
  }, [createAudio, tryNextUrl]);

  const play = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const audio = initializeAudio();
      
      // Ensure audio is loaded
      if (audio.readyState < 2) {
        audio.load();
      }

      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log('Background music started successfully');
      }
    } catch (err) {
      console.error('Background music play error:', err);
      
      // Try next URL on play error
      if (tryNextUrl() && audioRef.current) {
        try {
          audioRef.current.load();
          await audioRef.current.play();
        } catch {
          setError('Could not play background music');
        }
      } else {
        // Browser may block autoplay - this is expected on first interaction
        setError('Click to enable music');
      }
    } finally {
      setIsLoading(false);
    }
  }, [initializeAudio, tryNextUrl]);

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
