import { useCallback } from 'react';
import { AudioLines } from 'lucide-react';

export const useContentHandlers = ({
  audioContextRef,
  isRecording,
  initAudioContexts,
  resetSpeakingState,
  stopAndClearAudio,
  enqueueAudio,
  selectedModel,
  liveModality,
  addOrUpdateLiveModelMessagePart,
  addLiveMessage,
  resetStreamingRefs,
  inputTranscriptionBufferRef,
  outputTranscriptionBufferRef,
  lastTranscriptionChunkRef
}) => {

  // Handle the main model turn parts
  const handleModelTurnParts = useCallback((parts) => {
    let isAudioChunk = false;

    parts.forEach(part => {
      // Handle text and other non-audio/image parts
      addOrUpdateLiveModelMessagePart(part);

      // Handle Audio separately for playback (only if modality allows)
      if (part.inlineData?.mimeType?.startsWith('audio/')) {
        isAudioChunk = true;
        if (liveModality === 'AUDIO') {
          if (!audioContextRef.current) initAudioContexts();
          
          // Check if we're using a native audio model
          const isNativeAudioModel = selectedModel?.includes('native-audio');
          
          if (audioContextRef.current?.state === 'running') {
            try {
              // Decode base64 audio data
              const bs = window.atob(part.inlineData.data);
              const len = bs.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) bytes[i] = bs.charCodeAt(i);
              
              // Queue audio data and start playback
              enqueueAudio(bytes.buffer);
            } catch (e) {
              console.error("[Audio] Decode/Queue Error:", e);
            }
          }
        }
      } 
      // Handle inline images
      else if (part.inlineData?.mimeType?.startsWith('image/')) {
        addOrUpdateLiveModelMessagePart({ inlineData: part.inlineData });
      }
      // Handle executable code parts
      else if (part.executableCode) {
        addOrUpdateLiveModelMessagePart({ executableCode: part.executableCode });
      } 
      // Handle code execution results
      else if (part.codeExecutionResult) {
        addOrUpdateLiveModelMessagePart({ codeExecutionResult: part.codeExecutionResult });
      }
    });

    return isAudioChunk;
  }, [
    addOrUpdateLiveModelMessagePart,
    liveModality, 
    audioContextRef, 
    initAudioContexts, 
    selectedModel, 
    enqueueAudio
  ]);

  // Handle input transcription
  const handleInputTranscription = useCallback((text) => {
    if (text) {
      inputTranscriptionBufferRef.current += text;
      return true; // Flag that this event was for input transcription
    }
    return false;
  }, [inputTranscriptionBufferRef]);

  // Handle output transcription
  const handleOutputTranscription = useCallback((text) => {
    if (text) {
      if (text !== lastTranscriptionChunkRef.current) {
        outputTranscriptionBufferRef.current += text;
        lastTranscriptionChunkRef.current = text;
      }
    }
  }, [outputTranscriptionBufferRef, lastTranscriptionChunkRef]);

  // Handle server content processing including transcription buffer management
  const handleServerContent = useCallback((data) => {
    let isInputTranscriptionEvent = false;
    let isAudioChunk = false;
    let turnOrGenComplete = false;
    
    // Handle model turn parts (text/audio/etc)
    if (data.modelTurn?.parts) {
      isAudioChunk = handleModelTurnParts(data.modelTurn.parts);
      
      // Reset speaking indicator if turn is complete and audio was playing
      if ((data.turnComplete || data.generationComplete) && isAudioChunk) {
        resetSpeakingState();
      }
    }
    
    // Handle turn/generation completion
    if (data.turnComplete || data.generationComplete) {
      turnOrGenComplete = true;
    }
    
    // Handle interruption
    if (data.interrupted) {
      stopAndClearAudio(); // Stop playback and clear queue
    }
    
    // Handle input transcription
    if (data.inputTranscription?.text) {
      isInputTranscriptionEvent = handleInputTranscription(data.inputTranscription.text);
    }
    
    // Handle output transcription
    if (data.outputTranscription?.text) {
      handleOutputTranscription(data.outputTranscription.text);
    }
    
    // Logic to flush input transcription when appropriate
    const modelTurnEffectivelyEnded = data.turnComplete || data.generationComplete;
    
    if (modelTurnEffectivelyEnded && !isInputTranscriptionEvent && inputTranscriptionBufferRef.current) {
      addLiveMessage({
        role: 'user',
        text: inputTranscriptionBufferRef.current,
      });
      inputTranscriptionBufferRef.current = ""; // Clear buffer after displaying
    }
    
    // Flush output transcription if turn is complete
    if (modelTurnEffectivelyEnded && outputTranscriptionBufferRef.current) {
      addLiveMessage({
        role: 'system',
        text: outputTranscriptionBufferRef.current,
        icon: AudioLines
      });
      outputTranscriptionBufferRef.current = "";
      lastTranscriptionChunkRef.current = "";
    }
    
    return {
      turnOrGenComplete,
      isInputTranscriptionEvent
    };
  }, [
    handleModelTurnParts, 
    handleInputTranscription, 
    handleOutputTranscription,
    resetSpeakingState, 
    stopAndClearAudio, 
    inputTranscriptionBufferRef, 
    addLiveMessage, 
    outputTranscriptionBufferRef, 
    lastTranscriptionChunkRef
  ]);

  // Handle token usage metadata
  const handleUsageMetadata = useCallback((data, setTokenUsage) => {
    console.log("📊 [Live WS] Processing 'usageMetadata':", data);
    
    // Extract token counts from the usage metadata
    const { inputTokenCount, outputTokenCount, totalTokenCount } = data;
    
    // Update token usage state with new values
    setTokenUsage(prevUsage => ({
      inputTokens: inputTokenCount || prevUsage.inputTokens,
      outputTokens: outputTokenCount || prevUsage.outputTokens,
      totalTokens: totalTokenCount || prevUsage.totalTokens,
      lastUpdated: Date.now()
    }));
    
    console.log(`[Live WS] Updated token usage - Total: ${totalTokenCount}, Input: ${inputTokenCount}, Output: ${outputTokenCount}`);
    
    // Log token usage to system message (optional - for debugging or user awareness)
    if (totalTokenCount && totalTokenCount % 1000 < 10) { // Show roughly every ~1000 tokens
      addLiveMessage({
        role: 'system',
        text: `Session token usage: ${totalTokenCount} tokens`
      });
    }
  }, [addLiveMessage]);

  return {
    handleServerContent,
    handleUsageMetadata
  };
}; 