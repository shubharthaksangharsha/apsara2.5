// services/tools/urlcontext/schemas.js
export const urlContextSchema = {
  name: 'urlContext',
  description: 'Retrieves and analyzes content from a URL to provide additional context for responses.',
  parameters: {
    type: 'OBJECT',
    properties: {
      url: { type: 'STRING', description: 'The URL to retrieve and analyze content from.' },
      query: { type: 'STRING', description: 'Optional. Specific question or query about the URL content.' }
    }
  }
};

export const urlcontextToolSchemas = [
  urlContextSchema
]; 