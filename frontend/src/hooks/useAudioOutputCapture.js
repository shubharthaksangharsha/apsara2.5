import { useState, useEffect, useRef } from 'react';

/**
 * Hook to capture audio output from HTML audio elements and analyze their levels
 * This hook monitors all audio elements on the page and provides real-time audio levels
 */
export const useAudioOutputCapture = () => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodesRef = useRef(new Map());
  const animationIdRef = useRef(null);
  const destinationRef = useRef(null);

  useEffect(() => {
    const setupAudioCapture = async () => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Create analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -100;
        analyser.maxDecibels = -10;
        analyserRef.current = analyser;

        // Create gain node as destination
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0;
        destinationRef.current = gainNode;

        // Connect: sources -> analyser -> gain -> destination
        analyser.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Function to monitor audio elements
        const monitorAudioElements = () => {
          const audioElements = document.querySelectorAll('audio');
          console.log(`Found ${audioElements.length} audio elements on page`);
          
          audioElements.forEach((audioElement, index) => {
            // Skip if already connected
            if (sourceNodesRef.current.has(audioElement)) return;

            try {
              // Always try to connect, even without src initially
              console.log(`Attempting to connect audio element ${index}:`, audioElement);

              // Create media element source
              const source = audioContext.createMediaElementSource(audioElement);
              
              // Connect to analyser (this also routes audio to speakers)
              source.connect(analyser);
              
              // Store reference
              sourceNodesRef.current.set(audioElement, source);

              console.log(`✅ Connected audio element ${index} to analyser`);

              // Listen for play/pause events
              const handlePlay = () => {
                console.log('🎵 Audio started playing');
                setIsPlaying(true);
                if (audioContext.state === 'suspended') {
                  audioContext.resume().then(() => {
                    console.log('Audio context resumed for output capture');
                  });
                }
              };

              const handlePause = () => {
                console.log('⏸️ Audio paused');
                // Check if any other audio is still playing
                const allAudio = document.querySelectorAll('audio');
                const stillPlaying = Array.from(allAudio).some(audio => !audio.paused);
                if (!stillPlaying) {
                  setIsPlaying(false);
                  setAudioLevel(0);
                }
              };

              const handleEnded = () => {
                console.log('🔚 Audio ended');
                // Check if any other audio is still playing
                const allAudio = document.querySelectorAll('audio');
                const stillPlaying = Array.from(allAudio).some(audio => !audio.paused);
                if (!stillPlaying) {
                  setIsPlaying(false);
                  setAudioLevel(0);
                }
              };

              const handleLoadStart = () => {
                console.log('📥 Audio loading started');
              };

              const handleCanPlay = () => {
                console.log('▶️ Audio can play');
              };

              audioElement.addEventListener('play', handlePlay);
              audioElement.addEventListener('pause', handlePause);
              audioElement.addEventListener('ended', handleEnded);
              audioElement.addEventListener('loadstart', handleLoadStart);
              audioElement.addEventListener('canplay', handleCanPlay);

              // Store event listeners for cleanup
              audioElement._apsaraListeners = { 
                handlePlay, handlePause, handleEnded, handleLoadStart, handleCanPlay 
              };

            } catch (error) {
              console.warn('Failed to connect audio element:', error);
            }
          });
        };

        // Monitor existing audio elements
        monitorAudioElements();

        // Use MutationObserver to monitor for new audio elements
        const observer = new MutationObserver((mutations) => {
          let shouldCheck = false;
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                  if (node.tagName === 'AUDIO' || node.querySelector('audio')) {
                    shouldCheck = true;
                  }
                }
              });
            }
          });
          if (shouldCheck) {
            setTimeout(monitorAudioElements, 100); // Small delay for DOM to settle
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        // Start analyzing
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const analyze = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate RMS for audio level with better scaling
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const level = (rms / 255) * 100;
          
          // Enhanced level calculation for better detection
          const enhancedLevel = Math.min(100, level * 1.5); // Boost signal
          
          // Always update level, but only show playing state when actually playing
          setAudioLevel(Math.round(enhancedLevel));
          console.log(`🎚️ Audio level: ${Math.round(enhancedLevel)}, Playing: ${isPlaying}`);
          
          animationIdRef.current = requestAnimationFrame(analyze);
        };

        analyze();

        return () => {
          observer.disconnect();
          // Clean up event listeners
          const audioElements = document.querySelectorAll('audio');
          audioElements.forEach((audioElement) => {
            if (audioElement._apsaraListeners) {
              const { handlePlay, handlePause, handleEnded, handleLoadStart, handleCanPlay } = audioElement._apsaraListeners;
              audioElement.removeEventListener('play', handlePlay);
              audioElement.removeEventListener('pause', handlePause);
              audioElement.removeEventListener('ended', handleEnded);
              audioElement.removeEventListener('loadstart', handleLoadStart);
              audioElement.removeEventListener('canplay', handleCanPlay);
              delete audioElement._apsaraListeners;
            }
          });
        };

      } catch (error) {
        console.error('Failed to setup audio output capture:', error);
      }
    };

    setupAudioCapture();

    return () => {
      // Cleanup
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      sourceNodesRef.current.clear();
    };
  }, [isPlaying]); // Add isPlaying as dependency

  return { audioLevel, isPlaying };
};
