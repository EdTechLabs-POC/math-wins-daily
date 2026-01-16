import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Background music hook using Web Audio API
 * Creates a mellow, non-distracting ambient loop perfect for kids
 */
export function useBackgroundMusic() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.15);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = volume;
    }
    return audioContextRef.current;
  }, [volume]);

  // Create a mellow ambient pad sound
  const createAmbientPad = useCallback(() => {
    const ctx = initAudioContext();
    if (!ctx || !gainNodeRef.current) return;

    // Stop existing oscillators
    oscillatorsRef.current.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    oscillatorsRef.current = [];

    // Create layered ambient sound
    // Using pentatonic scale for pleasant, child-friendly tones
    const frequencies = [
      130.81, // C3 - root
      196.00, // G3 - fifth
      261.63, // C4 - octave
      329.63, // E4 - third
    ];

    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const oscGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      
      // Add slight detuning for warmth
      oscillator.detune.value = (index % 2 === 0 ? 5 : -5);
      
      // Low-pass filter for soft, mellow sound
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      filter.Q.value = 1;
      
      // Very gentle volume per oscillator
      oscGain.gain.value = 0.03;
      
      // Add subtle LFO for gentle movement
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.1 + index * 0.05; // Very slow movement
      lfoGain.gain.value = 0.005;
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);
      lfo.start();
      
      oscillator.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(gainNodeRef.current!);
      
      oscillator.start();
      oscillatorsRef.current.push(oscillator);
    });
  }, [initAudioContext]);

  const play = useCallback(() => {
    const ctx = initAudioContext();
    if (ctx?.state === 'suspended') {
      ctx.resume();
    }
    createAmbientPad();
    setIsPlaying(true);
  }, [initAudioContext, createAmbientPad]);

  const pause = useCallback(() => {
    oscillatorsRef.current.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    oscillatorsRef.current = [];
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isPlaying,
    play,
    pause,
    toggle,
    volume,
    setVolume,
  };
}
