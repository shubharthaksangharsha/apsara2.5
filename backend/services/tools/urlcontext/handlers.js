// services/tools/urlcontext/handlers.js
/**
 * Retrieves and analyzes content from a URL using Gemini's URL context feature
 */
export async function handleUrlContext({ url, query }) {
  try {
    console.log(`[Tool: urlContext] Retrieving content from URL: ${url}`);
    
    // Import Gemini client
    const { getGeminiClient } = await import('../../ai/client.js');
    const ai = await getGeminiClient();
    
    // Build prompt based on URL and optional query
    let prompt = query 
      ? `Based on the content of the URL (${url}), please answer: ${query}` 
      : `Please analyze and summarize the key information from this URL: ${url}`;
    
    console.log(`[Tool: urlContext] Processing with prompt: "${prompt}"`);
    
    // Call Gemini API with URL context tool enabled
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Use same model as the main conversation
      contents: prompt,
      config: {
        tools: [{urlContext: {}}],
        temperature: 0.2, // Lower temperature for more factual responses
        maxOutputTokens: 1024 // Reasonable size for summaries
      }
    });
    
    // Get the text content from the response
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`[Tool: urlContext] Response received, length: ${responseText.length}`);
    
    // Extract complete URL context metadata from the response
    const urlContextMetadata = response.candidates?.[0]?.urlContextMetadata || {};
    // Format the URL metadata for the frontend
    const formattedUrlMetadata = urlContextMetadata.urlMetadata?.map(item => ({
      retrieved_url: item.retrievedUrl,
      url_retrieval_status: item.urlRetrievalStatus
    })) || [];
    
    return {
      summary: responseText,
      metadata: {
        retrievedUrls: formattedUrlMetadata.map(item => ({
          url: item.retrieved_url,
          status: item.url_retrieval_status
        })),
        sourceCount: formattedUrlMetadata.length
      },
      // Add full metadata for the UI to display sources
      url_context_metadata: {
        url_metadata: formattedUrlMetadata
      }
    };
  } catch (error) {
    console.error(`[Tool: urlContext] Error processing URL: ${error}`);
    return {
      error: `Failed to retrieve or process URL content: ${error.message}`,
      url
    };
  }
}

export const urlcontextToolHandlers = {
  urlContext: handleUrlContext
}; 