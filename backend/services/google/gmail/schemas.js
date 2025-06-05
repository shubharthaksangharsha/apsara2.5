// services/google/gmail/schemas.js
export const sendGmailSchema = {
    name: 'sendGmail',
    description: 'Sends an email message via Gmail using the pre-authorized server account. You can use predefined aliases like "me", "bro", "gf", "mom", "dad".',
    parameters: {
      type: 'OBJECT',
      properties: {
        to: { type: 'STRING', description: 'The recipient\'s email address or a predefined alias (e.g., "mom", "bro@example.com").' },
        subject: { type: 'STRING', description: 'The subject of the email.' },
        body: { type: 'STRING', description: 'The plain text content of the email.' },
      },
    }
  };
  
  export const draftGmailSchema = {
    name: 'draftGmail',
    description: 'Creates a draft email message in Gmail using the pre-authorized server account. Does not send. You can use predefined aliases like "me", "bro", "gf", "mom", "dad".',
    parameters: {
      type: 'OBJECT',
      properties: {
        to: { type: 'STRING', description: 'Optional. The recipient\'s email address or a predefined alias.' },
        subject: { type: 'STRING', description: 'Optional. The subject of the draft.' },
        body: { type: 'STRING', description: 'Optional. The plain text content of the draft.' },
      },
    }
  };
  
  export const listGmailMessagesSchema = {
    name: 'listGmailMessages',
    description: 'Lists recent email messages from the authenticated Gmail account.',
    parameters: {
      type: 'OBJECT',
      properties: {
        maxResults: { type: 'INTEGER', description: 'Optional. Maximum number of messages to return (e.g., 5 or 10). Defaults to 5.' },
        query: { type: 'STRING', description: 'Optional. Gmail search query (e.g., "is:unread", "from:boss@example.com").' }
      },
    }
  };
  
  export const getGmailMessageSchema = {
    name: 'getGmailMessage',
    description: 'Retrieves the full content (or snippet) of a specific email by its ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        messageId: { type: 'STRING', description: 'The ID of the Gmail message to retrieve.' },
        format: { type: 'STRING', enum: ['full', 'metadata', 'raw'], description: 'Optional. Format of the message parts to retrieve. Defaults to "metadata". "full" includes payload.'}
      },
    }
  };
  
  export const gmailToolSchemas = [
    sendGmailSchema,
    draftGmailSchema,
    listGmailMessagesSchema,
    getGmailMessageSchema,
  ];