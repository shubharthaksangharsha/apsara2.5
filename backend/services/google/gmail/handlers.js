// services/google/gmail/handlers.js
import { getAuthenticatedGmailClient } from '../auth/googleAuth.js';
import { resolveEmailAlias } from './aliases.js';

/**
 * Sends an email via Gmail
 */
export async function handleSendGmail(req, args) {
  console.log(`[GmailTool: sendGmail] Received request with args:`, JSON.stringify(args));
  
  // Handle case when args is undefined or not an object
  if (!args || typeof args !== 'object') {
    console.error(`[GmailTool: sendGmail] Invalid arguments:`, args);
    return { status: 'error', message: 'Invalid arguments provided. Expected object with to, subject, and body properties.' };
  }

  const { to, subject, body } = args;
  
  // Validate required fields
  if (!to) {
    return { status: 'error', message: 'Recipient (to) field is required.' };
  }
  
  if (!subject) {
    return { status: 'error', message: 'Email subject is required.' };
  }
  
  console.log(`[GmailTool: sendGmail] Processing: to=${to}, subject=${subject}`);
  
  // Resolve any alias in the 'to' field
  const resolvedTo = resolveEmailAlias(to);
  if (!resolvedTo) {
    return { status: 'error', message: `Invalid recipient: ${to} is not a valid email or known alias.` };
  }
  
  try {
    const gmail = await getAuthenticatedGmailClient(req);
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject || '(No Subject)').toString('base64')}?=`;
    const messageParts = [
      `To: ${resolvedTo}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      (body || '').replace(/=/g, '=3D').replace(/\n/g, '=0A\n')
    ];
    const email = messageParts.join('\n');
    const encodedMessage = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
    return { status: 'success', messageId: res.data.id, message: `Email successfully queued to be sent to ${resolvedTo}.` };
  } catch (error) {
    let errorMessage = 'Failed to send email.';
    if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Gmail API Error: ${error.response.data.error.message} (Code: ${error.response.data.error.code})`;
    } else if (error.message) {
        errorMessage = error.message;
    }
    console.error('[GmailTool: sendGmail] Error:', errorMessage, error.stack);
    if (error.message && (error.message.includes('invalid_grant') || (error.response && error.response.status === 401))) {
        errorMessage += " This might be due to an invalid or revoked refresh token.";
    }
    return { status: 'error', message: errorMessage };
  }
}

/**
 * Creates a draft email in Gmail
 */
export async function handleDraftGmail(req, args) {
  console.log(`[GmailTool: draftGmail] Received request with args:`, JSON.stringify(args));
  
  // Handle case when args is undefined or not an object
  if (!args || typeof args !== 'object') {
    console.error(`[GmailTool: draftGmail] Invalid arguments:`, args);
    return { status: 'error', message: 'Invalid arguments provided. Expected object with optional to, subject, and body properties.' };
  }

  // Extract parameters with defaults
  const to = args.to || '';
  const subject = args.subject || '';
  const body = args.body || '';
  
  console.log(`[GmailTool: draftGmail] Processing draft: to=${to}, subject=${subject}`);
  
  // Handle recipient alias if provided
  let resolvedTo = '';
  if (to) {
    resolvedTo = resolveEmailAlias(to);
    if (!resolvedTo) {
      console.warn(`[GmailTool: draftGmail] Invalid 'to' field "${to}" provided, creating draft without recipient.`);
    }
  }
  console.log(`[GmailTool: draftGmail] Request: To: ${resolvedTo || 'N/A'}, Subject: "${subject}"`);

  try {
    const gmail = await getAuthenticatedGmailClient(req);
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [];
    if (resolvedTo) messageParts.push(`To: ${resolvedTo}`);
    messageParts.push(`Subject: ${utf8Subject}`);
    messageParts.push('MIME-Version: 1.0');
    messageParts.push('Content-Type: text/plain; charset=utf-8');
    messageParts.push('Content-Transfer-Encoding: quoted-printable');
    messageParts.push('');
    messageParts.push(body.replace(/=/g, '=3D').replace(/\n/g, '=0A\n'));

    const email = messageParts.join('\n');
    const encodedMessage = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    });
    return { status: 'success', draftId: res.data.id, message: `Draft created successfully${resolvedTo ? ' for ' + resolvedTo : ''}.` };
  } catch (error) {
    let errorMessage = 'Failed to create draft.';
    if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Gmail API Error: ${error.response.data.error.message} (Code: ${error.response.data.error.code})`;
    } else if (error.message) { errorMessage = error.message; }
    console.error('[GmailTool: draftGmail] Error:', errorMessage, error.stack);
     if (error.message && (error.message.includes('invalid_grant') || (error.response && error.response.status === 401))) {
        errorMessage += " This might be due to an invalid or revoked refresh token.";
    }
    return { status: 'error', message: errorMessage };
  }
}

/**
 * Lists Gmail messages
 */
export async function handleListGmailMessages(req, { maxResults = 5, query = '' }) {
  console.log(`[GmailTool: listGmailMessages] Request: maxResults=${maxResults}, query="${query}"`);
  try {
    const gmail = await getAuthenticatedGmailClient(req);
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: maxResults,
      q: query,
    });

    if (!res.data.messages || res.data.messages.length === 0) {
      return { status: 'success', messages: [], message: 'No messages found matching criteria.' };
    }

    // For each message ID, get some metadata (like subject, from, snippet)
    const messageDetails = await Promise.all(
      res.data.messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata', // Get only headers and snippet
          metadataHeaders: ['Subject', 'From', 'Date'],
        });
        const headers = detail.data.payload.headers;
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const fromHeader = headers.find(h => h.name === 'From');
        const dateHeader = headers.find(h => h.name === 'Date');
        return {
          id: detail.data.id,
          threadId: detail.data.threadId,
          snippet: detail.data.snippet,
          subject: subjectHeader ? subjectHeader.value : 'No Subject',
          from: fromHeader ? fromHeader.value : 'Unknown Sender',
          date: dateHeader ? dateHeader.value : 'Unknown Date',
        };
      })
    );
    return { status: 'success', messages: messageDetails, resultSizeEstimate: res.data.resultSizeEstimate };
  } catch (error) {
    let errorMessage = 'Failed to list Gmail messages.';
     if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Gmail API Error: ${error.response.data.error.message} (Code: ${error.response.data.error.code})`;
    } else if (error.message) {
        errorMessage = error.message;
    }
    console.error('[GmailTool: listGmailMessages] Error:', errorMessage, error.stack);
    return { status: 'error', message: errorMessage };
  }
}

/**
 * Gets a specific Gmail message by ID
 */
export async function handleGetGmailMessage(req, { messageId, format = 'metadata' }) {
  console.log(`[GmailTool: getGmailMessage] Request: messageId=${messageId}, format=${format}`);
  if (!messageId) return { status: 'error', message: 'Message ID is required.' };
  try {
    const gmail = await getAuthenticatedGmailClient(req);
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: format, // 'full', 'metadata', 'raw', 'minimal'
    });

    // Basic parsing for 'full' format to get a text body part
    let bodyText = '';
    if (format === 'full' && res.data.payload) {
        const findTextPart = (parts) => {
            if (!parts) return null;
            for (const part of parts) {
                if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                    return Buffer.from(part.body.data, 'base64').toString('utf-8');
                }
                if (part.parts) { // Recurse for multipart messages
                    const found = findTextPart(part.parts);
                    if (found) return found;
                }
            }
            return null;
        };
        if (res.data.payload.mimeType === 'text/plain' && res.data.payload.body && res.data.payload.body.data) {
             bodyText = Buffer.from(res.data.payload.body.data, 'base64').toString('utf-8');
        } else if (res.data.payload.parts) {
            bodyText = findTextPart(res.data.payload.parts);
        }
    }

    const subjectHeader = res.data.payload?.headers?.find(h => h.name.toLowerCase() === 'subject');
    const fromHeader = res.data.payload?.headers?.find(h => h.name.toLowerCase() === 'from');
    const toHeader = res.data.payload?.headers?.find(h => h.name.toLowerCase() === 'to');
    const dateHeader = res.data.payload?.headers?.find(h => h.name.toLowerCase() === 'date');

    return {
      status: 'success',
      id: res.data.id,
      threadId: res.data.threadId,
      snippet: res.data.snippet,
      labelIds: res.data.labelIds,
      subject: subjectHeader ? subjectHeader.value : 'N/A',
      from: fromHeader ? fromHeader.value : 'N/A',
      to: toHeader ? toHeader.value : 'N/A',
      date: dateHeader ? dateHeader.value : 'N/A',
      payload: format === 'full' || format === 'raw' ? res.data.payload : undefined, // Include full payload if requested
      bodyText: bodyText || (format !== 'full' ? '(Body not fetched, use format: "full")' : '(No plain text body found)'),
    };
  } catch (error) {
    let errorMessage = `Failed to get Gmail message ID: ${messageId}.`;
     if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Gmail API Error: ${error.response.data.error.message} (Code: ${error.response.data.error.code})`;
    } else if (error.message) {
        errorMessage = error.message;
    }
    console.error('[GmailTool: getGmailMessage] Error:', errorMessage, error.stack);
    return { status: 'error', message: errorMessage };
  }
}

export const gmailToolHandlers = {
  sendGmail: handleSendGmail,
  draftGmail: handleDraftGmail,
  listGmailMessages: handleListGmailMessages,
  getGmailMessage: handleGetGmailMessage,
};