import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for detecting speech activity from microphone input
 * @param {MediaStream} audioStream - The audio stream from microphone
 * @param {number} threshold - Volume threshold for speech detection (0-100)
 * @param {number} debounceTime - Time in ms to debounce speech detection
 * @returns {Object} - { isSpeaking, audioLevel, error }
 */
export const useSpeechDetection = (audioStream, threshold = 25, debounceTime = 150) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState(null);
  
  const analyserRef = useRef(null);
  const animationIdRef = useRef(null);
  const timeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const smoothedLevelRef = useRef(0);

  useEffect(() => {
    if (!audioStream) {
      setIsSpeaking(false);
      setAudioLevel(0);
      return;
    }

    const setupAudioAnalysis = async () => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        // Create analyser node
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512; // Higher resolution for better detection
        analyser.smoothingTimeConstant = 0.9; // More smoothing for stable detection
        analyser.minDecibels = -100;
        analyser.maxDecibels = -10;
        
        // Connect audio stream
        const source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyser);
        
        analyserRef.current = analyser;
        
        // Start analyzing
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const analyze = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate RMS (Root Mean Square) for more accurate volume detection
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const currentLevel = (rms / 255) * 100;
          
          // Apply smoothing to reduce noise
          smoothedLevelRef.current = smoothedLevelRef.current * 0.8 + currentLevel * 0.2;
          setAudioLevel(Math.round(smoothedLevelRef.current));
          
          // Check if speaking with hysteresis (different thresholds for start/stop)
          const startThreshold = threshold;
          const stopThreshold = threshold * 0.7; // Lower threshold to stop
          
          if (!isSpeaking && smoothedLevelRef.current > startThreshold) {
            setIsSpeaking(true);
            // Clear any existing timeout
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          } else if (isSpeaking && smoothedLevelRef.current < stopThreshold) {
            // Set timeout to stop speaking detection after debounce time
            if (!timeoutRef.current) {
              timeoutRef.current = setTimeout(() => {
                setIsSpeaking(false);
                timeoutRef.current = null;
              }, debounceTime);
            }
          } else if (isSpeaking && smoothedLevelRef.current > startThreshold) {
            // Cancel timeout if volume goes back up
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
          
          animationIdRef.current = requestAnimationFrame(analyze);
        };
        
        analyze();
      } catch (err) {
        console.error('Speech detection setup failed:', err);
        setError(err.message);
      }
    };

    setupAudioAnalysis();

    return () => {
      // Cleanup
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioStream, threshold, debounceTime, isSpeaking]);

  return { isSpeaking, audioLevel, error };
};

/**
 * Custom hook for managing microphone access and speech detection
 * @param {boolean} enabled - Whether microphone access is enabled
 * @returns {Object} - { micStream, isSpeaking, audioLevel, error, startMic, stopMic }
 */
export const useMicrophoneDetection = (enabled = false) => {
  const [micStream, setMicStream] = useState(null);
  const [error, setError] = useState(null);
  
  const { isSpeaking, audioLevel } = useSpeechDetection(micStream);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      setMicStream(stream);
      setError(null);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      setError(err.message);
    }
  };

  const stopMic = () => {
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
  };

  useEffect(() => {
    if (enabled) {
      startMic();
    } else {
      stopMic();
    }
    
    return () => {
      stopMic();
    };
  }, [enabled]);

  return { 
    micStream, 
    isSpeaking, 
    audioLevel, 
    error, 
    startMic, 
    stopMic 
  };
};
