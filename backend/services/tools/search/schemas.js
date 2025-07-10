// services/tools/search/schemas.js
export const googleSearchSchema = {
  name: 'googleSearch',
  description: 'Performs a Google search to find real-time information from the web to answer questions.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING', description: 'Optional. The search query. If not provided, the model will generate an appropriate query based on the conversation.' }
    }
  }
};

export const searchToolSchemas = [
  googleSearchSchema
]; 