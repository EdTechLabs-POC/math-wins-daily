import { useCallback, useRef, useEffect } from 'react';
import useSound from 'use-sound';

// Sound effect URLs - using simple embedded sounds for POC
// In production, these would be proper audio files

interface SoundEffectsOptions {
  volume?: number;
  enabled?: boolean;
}

export function useSoundEffects(options: SoundEffectsOptions = {}) {
  const { volume = 0.5, enabled = true } = options;
  
  // Audio context for generating sounds
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Generate a tone programmatically
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!enabled) return;
    
    const ctx = initAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [enabled, volume, initAudioContext]);

  // Pre-defined sound effects
  const sounds = {
    // Happy success sound (ascending melody)
    correct: useCallback(() => {
      if (!enabled) return;
      const ctx = initAudioContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.2, 'sine'), i * 100);
      });
    }, [enabled, initAudioContext, playTone]),

    // Gentle incorrect sound (soft low tone)
    incorrect: useCallback(() => {
      if (!enabled) return;
      playTone(220, 0.3, 'sine');
    }, [enabled, playTone]),

    // Tap/click sound
    tap: useCallback(() => {
      if (!enabled) return;
      playTone(800, 0.05, 'sine');
    }, [enabled, playTone]),

    // Select sound
    select: useCallback(() => {
      if (!enabled) return;
      playTone(600, 0.08, 'sine');
    }, [enabled, playTone]),

    // Pop sound for drag/drop
    pop: useCallback(() => {
      if (!enabled) return;
      const ctx = initAudioContext();
      if (!ctx) return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    }, [enabled, volume, initAudioContext]),

    // Celebration fanfare
    celebrate: useCallback(() => {
      if (!enabled) return;
      const ctx = initAudioContext();
      if (!ctx) return;

      // Play a happy melody
      const melody = [
        { freq: 523.25, time: 0 },      // C5
        { freq: 587.33, time: 0.1 },    // D5
        { freq: 659.25, time: 0.2 },    // E5
        { freq: 783.99, time: 0.3 },    // G5
        { freq: 1046.5, time: 0.5 },    // C6
      ];

      melody.forEach(({ freq, time }) => {
        setTimeout(() => playTone(freq, 0.25, 'sine'), time * 1000);
      });
    }, [enabled, initAudioContext, playTone]),

    // Whoosh for transitions
    whoosh: useCallback(() => {
      if (!enabled) return;
      const ctx = initAudioContext();
      if (!ctx) return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.2);
      
      oscillator.frequency.setValueAtTime(100, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.2, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    }, [enabled, volume, initAudioContext]),

    // Gentle notification
    notification: useCallback(() => {
      if (!enabled) return;
      playTone(880, 0.15, 'sine');
      setTimeout(() => playTone(1100, 0.15, 'sine'), 150);
    }, [enabled, playTone]),
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return sounds;
}
