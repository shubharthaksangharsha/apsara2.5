import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Mic } from 'lucide-react';

/**
 * Advanced Audio Visualizer Component
 * Provides real-time audio visualization with frequency analysis
 * Automatically switches between user and model speaking based on priority
 */
const AudioVisualizer = ({ 
  isModelSpeaking, 
  isUserSpeaking, 
  audioStream = null, 
  className = "",
  showLabel = true,
  size = "medium", // small, medium, large
  userAudioLevel = 0, // 0-100 for user audio level
  modelAudioLevel = 0, // 0-100 for model audio level
  priority = 'auto', // 'auto', 'user', 'model'
  userDisplayName = 'You', // Display name for the user
  hasMicrophone = false // Whether microphone is available
}) => {
  const [audioData, setAudioData] = useState(new Array(32).fill(0));
  const [animationFrame, setAnimationFrame] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState('none'); // 'user', 'model', 'none'
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationIdRef = useRef(null);
  const fallbackAnimationRef = useRef(null);

  // Size configurations
  const sizeConfigs = {
    small: {
      height: 'h-6', // Increased height for better visualization
      bars: 20, // More bars for better spread
      barWidth: 'w-0.5',
      spacing: 'gap-px', // Tighter spacing for full width coverage
      iconSize: 'h-3 w-3',
      textSize: 'text-xs',
      padding: 'px-2 py-1'
    },
    medium: {
      height: 'h-8',
      bars: 28,
      barWidth: 'w-1',
      spacing: 'gap-0.5',
      iconSize: 'h-4 w-4',
      textSize: 'text-sm',
      padding: 'px-3 py-2'
    },
    large: {
      height: 'h-10',
      bars: 32,
      barWidth: 'w-1.5',
      spacing: 'gap-1',
      iconSize: 'h-5 w-5',
      textSize: 'text-base',
      padding: 'px-4 py-3'
    }
  };

  const config = sizeConfigs[size] || sizeConfigs.medium;

  // Determine current speaker based on priority and speaking states
  useEffect(() => {
    if (priority === 'auto') {
      // Auto-switching logic with priority
      if (isModelSpeaking && isUserSpeaking && hasMicrophone) {
        // Both speaking - prioritize based on audio levels
        if (modelAudioLevel > userAudioLevel) {
          setCurrentSpeaker('model');
        } else if (userAudioLevel > modelAudioLevel) {
          setCurrentSpeaker('user');
        } else {
          // Equal levels - prioritize model (AI response)
          setCurrentSpeaker('model');
        }
      } else if (isModelSpeaking) {
        setCurrentSpeaker('model');
      } else if (isUserSpeaking && hasMicrophone) { // Only show user if mic is available
        setCurrentSpeaker('user');
      } else {
        setCurrentSpeaker('none');
      }
    } else {
      // Manual priority override
      if (priority === 'user' && isUserSpeaking && hasMicrophone) {
        setCurrentSpeaker('user');
      } else if (priority === 'model' && isModelSpeaking) {
        setCurrentSpeaker('model');
      } else {
        setCurrentSpeaker('none');
      }
    }
  }, [isModelSpeaking, isUserSpeaking, priority, modelAudioLevel, userAudioLevel, hasMicrophone]);

  // Update audio level based on current speaker
  useEffect(() => {
    if (currentSpeaker === 'user') {
      setAudioLevel(userAudioLevel);
    } else if (currentSpeaker === 'model') {
      setAudioLevel(modelAudioLevel);
    } else {
      setAudioLevel(0);
    }
    
    // Debug logging
    console.log('🎵 AudioVisualizer State:', {
      currentSpeaker,
      userAudioLevel,
      modelAudioLevel,
      hasMicrophone,
      audioLevel,
      hasAudioStream: !!audioStream
    });
  }, [currentSpeaker, userAudioLevel, modelAudioLevel, hasMicrophone, audioStream]);

  // Setup audio analysis when we have a stream and someone is speaking
  useEffect(() => {
    if (currentSpeaker === 'user' && audioStream) {
      // Use real audio stream for user
      setupAudioAnalysis();
    } else if (currentSpeaker === 'model') {
      // For model, we don't use audioStream (that's user's mic), use fallback with model audio level
      cleanupAudioAnalysis();
      startFallbackAnimation();
    } else {
      cleanupAudioAnalysis();
      stopFallbackAnimation();
    }

    return () => {
      cleanupAudioAnalysis();
      stopFallbackAnimation();
    };
  }, [audioStream, currentSpeaker]);

  const setupAudioAnalysis = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.85; // Slightly higher for smoother visualization
      analyser.minDecibels = -100;
      analyser.maxDecibels = -10;
      
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      
      analyzeAudio();
    } catch (error) {
      console.warn('Audio analysis not available, using fallback animation:', error);
      startFallbackAnimation();
    }
  };

  const analyzeAudio = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Process frequency data to create visualization bars
    const bars = config.bars;
    const barData = new Array(bars).fill(0);
    const totalFrequencyData = dataArrayRef.current.length;
    
    for (let i = 0; i < bars; i++) {
      // Map each bar to a frequency range (distribute across entire spectrum)
      const startIndex = Math.floor((i / bars) * totalFrequencyData);
      const endIndex = Math.floor(((i + 1) / bars) * totalFrequencyData);
      
      // Average the frequency data for this bar's range
      let sum = 0;
      let count = 0;
      for (let j = startIndex; j < endIndex && j < totalFrequencyData; j++) {
        sum += dataArrayRef.current[j];
        count++;
      }
      
      const averageValue = count > 0 ? sum / count : 0;
      let normalizedValue = averageValue / 255;
      
      // Apply audio level scaling with much higher multiplier
      const levelMultiplier = Math.max(0.6, audioLevel / 80); // Better scaling
      // Apply massive scaling for real audio to make it much more visible
      const audioBoost = currentSpeaker === 'user' ? 8.0 : 5.0; // Much higher boost for visibility
      
      // Add some randomness and smoothing for more natural look
      const smoothing = Math.random() * 0.3 + 0.85;
      
      barData[i] = Math.min(2.0, normalizedValue * levelMultiplier * audioBoost * smoothing); // Allow up to 2.0 amplitude
    }
    
    setAudioData(barData);
    animationIdRef.current = requestAnimationFrame(analyzeAudio);
  };

  const startFallbackAnimation = () => {
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      fallbackAnimationRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const stopFallbackAnimation = () => {
    if (fallbackAnimationRef.current) {
      cancelAnimationFrame(fallbackAnimationRef.current);
      fallbackAnimationRef.current = null;
    }
    setAnimationFrame(0);
  };

  const cleanupAudioAnalysis = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
  };

  // Generate fallback animation data based on audio level
  const generateFallbackData = () => {
    const bars = config.bars;
    const data = new Array(bars).fill(0);
    const time = animationFrame * 0.08; // Slightly slower for more natural feel
    const levelMultiplier = Math.max(0.6, audioLevel / 80); // Higher base level and easier scaling
    
    // Give user speech more prominent visualization
    const userBoost = currentSpeaker === 'user' ? 3.0 : 2.0; // Increased boost
    
    for (let i = 0; i < bars; i++) {
      // Create more realistic speech-like patterns across ALL bars
      const normalizedIndex = i / (bars - 1); // 0 to 1 across all bars
      
      // Multiple overlapping waves for natural speech pattern
      const wave1 = Math.sin(time + normalizedIndex * Math.PI * 2.5) * 0.6 + 0.8;
      const wave2 = Math.sin(time * 1.3 + normalizedIndex * Math.PI * 1.8) * 0.5 + 0.7;
      const wave3 = Math.sin(time * 0.9 + normalizedIndex * Math.PI * 3.2) * 0.4 + 0.6;
      const wave4 = Math.sin(time * 2.1 + normalizedIndex * Math.PI * 0.8) * 0.3 + 0.5;
      const randomness = Math.random() * 0.6; // More randomness
      
      // Center bias - make middle bars slightly more prominent
      const centerBias = 1 - Math.abs((normalizedIndex - 0.5) * 0.2);
      
      // Edge enhancement - make outer bars more dynamic
      const edgeBoost = Math.abs(normalizedIndex - 0.5) > 0.3 ? 1.3 : 1.0;
      
      // Combine all elements - much higher amplitude potential
      const combined = (wave1 * wave2 * wave3 * wave4 + randomness) * levelMultiplier * userBoost * centerBias * edgeBoost;
      data[i] = Math.max(0.3, Math.min(2.0, combined)); // Allow up to 2.0 amplitude for much higher waves
    }
    
    return data;
  };

  const visualizationData = currentSpeaker === 'user' && audioStream 
    ? audioData 
    : generateFallbackData();

  // Don't show anything if no one is speaking, or if user is speaking but no mic
  if (currentSpeaker === 'none' || (currentSpeaker === 'user' && !hasMicrophone)) {
    return null;
  }

  // Color schemes based on current speaker
  const colorScheme = currentSpeaker === 'user' ? {
    primary: 'bg-green-500',
    secondary: 'bg-green-400',
    accent: 'bg-green-300',
    text: 'text-green-600',
    darkText: 'text-green-400',
    background: 'bg-green-100/80 dark:bg-green-900/30',
    icon: 'text-green-500'
  } : {
    primary: 'bg-blue-500',
    secondary: 'bg-blue-400', 
    accent: 'bg-blue-300',
    text: 'text-blue-600',
    darkText: 'text-blue-400',
    background: 'bg-blue-100/80 dark:bg-blue-900/30',
    icon: 'text-blue-500'
  };

  return (
    <div className={`flex items-center justify-center ${config.padding} ${colorScheme.background} backdrop-blur-sm rounded-xl shadow-xl border border-white/20 dark:border-gray-700/50 audio-visualizer-glow transition-all duration-300 ${className}`}>
      <div className="flex items-center gap-2 w-full">
        {/* Speaker Icon */}
        <div className="flex-shrink-0">
          {currentSpeaker === 'user' ? (
            <Mic className={`${config.iconSize} ${colorScheme.icon} animate-pulse`} />
          ) : (
            <Volume2 className={`${config.iconSize} ${colorScheme.icon} animate-pulse`} />
          )}
        </div>
        
        {/* Audio Visualization Bars - Full width */}
        <div className={`flex items-end ${config.spacing} ${config.height} flex-1 px-1`}>
          {visualizationData.map((amplitude, index) => {
            // Handle the increased amplitude range (0 to 2.0) and scale to full height
            const height = Math.max(0.15, Math.min(1.0, amplitude * 0.8)); // Scale down 2.0 to 1.0 for full height usage
            const barColorClass = amplitude > 1.2 ? colorScheme.primary : 
                                 amplitude > 0.6 ? colorScheme.secondary : 
                                 colorScheme.accent;
            
            return (
              <div
                key={index}
                className={`flex-1 ${barColorClass} rounded-full visualizer-bar transition-all duration-75 ease-out`}
                style={{
                  height: `${height * 100}%`,
                  minHeight: '6px',
                  maxHeight: '100%',
                  transform: `scaleY(${height})`,
                  transformOrigin: 'bottom'
                }}
              />
            );
          })}
        </div>
        
        {/* Status Label */}
        {showLabel && (
          <div className="flex-shrink-0">
            <span className={`${config.textSize} ${colorScheme.text} dark:${colorScheme.darkText} font-medium`}>
              {currentSpeaker === 'user' ? userDisplayName : 'Apsara'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioVisualizer;
