import { useState, useEffect, useRef } from "react";

export function useAudioVolume(stream: MediaStream | null, threshold = 10) {
  const [isTalking, setIsTalking] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setIsTalking(false);
      return;
    }

    try {
      // Create audio context only if needed
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        setIsTalking(average > threshold);

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();

      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        source.disconnect();
        analyser.disconnect();
        audioContext.close();
      };
    } catch (e) {
      console.error("Failed to initialize audio volume analyzer:", e);
    }
  }, [stream, threshold]);

  return { isTalking };
}
