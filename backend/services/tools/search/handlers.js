// services/tools/search/handlers.js
/**
 * Handles Google Search grounding
 */
export async function handleGoogleSearch({ query }) {
  try {
    console.log(`[Tool: googleSearch] Processing search${query ? ` with query: ${query}` : ' without explicit query'}`);
    
    // Import Gemini client
    const { getGeminiClient } = await import('../../ai/client.js');
    const ai = await getGeminiClient();
    
    // Determine which prompt to use
    // const prompt = query || "Please search for relevant information based on the conversation context";
    const prompt = "Use Google Search and answer the following question: " + query;
    console.log(`[Tool: googleSearch] Prompt: ${prompt}`);
    // Call Gemini API with Google Search tool enabled
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        temperature: 0.2,
        maxOutputTokens: 1024
      }
    });
    
    // Get the text content from the response
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`[Tool: googleSearch] Response received, length: ${responseText.length}`);
    
    // Extract complete grounding metadata for the UI
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || {};
    const webSearchQueries = groundingMetadata.webSearchQueries || [];
    const groundingChunks = groundingMetadata.groundingChunks || [];
    const groundingSupports = groundingMetadata.groundingSupports || [];
    
    // Process the grounding chunks to extract sources for the metadata summary
    const sources = groundingChunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web.title || '',
        url: chunk.web.uri || ''
      }));
    
    return {
      result: responseText,
      metadata: {
        searchQueries: webSearchQueries,
        sources: sources,
        sourceCount: sources.length
      },
      // Add the complete grounding metadata for the UI to display sources
      groundingMetadata: {
        webSearchQueries,
        groundingChunks,
        groundingSupports
      }
    };
  } catch (error) {
    console.error(`[Tool: googleSearch] Error during search: ${error}`);
    return {
      error: `Failed to perform search: ${error.message}`
    };
  }
}

export const searchToolHandlers = {
  googleSearch: handleGoogleSearch
}; 