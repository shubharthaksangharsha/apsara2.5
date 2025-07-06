// Helper functions for useLiveSession

// Helper function to decode PCM audio data
export const decodePcm16ToFloat32 = (arrayBuffer) => {
  const pcmData = new Int16Array(arrayBuffer);
  const floatData = new Float32Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    floatData[i] = pcmData[i] / 32768.0; // Normalize to [-1.0, 1.0]
  }
  return floatData;
}; 