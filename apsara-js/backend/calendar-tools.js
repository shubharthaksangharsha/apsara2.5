// backend/calendar-tools.js
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get an authenticated Calendar client using the request object
async function getAuthenticatedCalendarClient(req) {
  try {
    // Validate request object has authentication tokens
    if (!req || typeof req !== 'object') {
      throw new Error('Invalid request object provided to Calendar tool');
    }
    
    // Check for authentication tokens
    if (!req.userTokens || !req.isAuthenticated) {
      throw new Error('No authentication tokens available. User must be logged in to use Calendar features.');
    }
    
    // Get credentials from credentials.json
    let credentials;
    try {
      const credentialsJson = fs.readFileSync(path.join(__dirname, './credentials.json'), 'utf8');
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      console.error(`Error reading credentials.json: ${error.message}`);
      throw new Error('Unable to load credentials. Please check your Google project configuration.');
    }
    
    const { client_id, client_secret } = credentials.web;
    const redirectUri = credentials.web.redirect_uris[0];
    const { access_token, refresh_token } = req.userTokens;
    
    if (!client_id || !client_secret || !redirectUri || !refresh_token) {
      throw new Error('Missing required OAuth credentials for Calendar access');
    }
    
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);
    oauth2Client.setCredentials({ refresh_token, access_token });
    
    // It's good practice to ensure the access token is fresh, though googleapis often handles this.
    try {
      await oauth2Client.getAccessToken();
    } catch (error) {
      console.error(`[CalendarTool] Error refreshing access token: ${error.message}`);
      throw error;
    }
    
    return google.calendar({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error(`[CalendarTool] Authentication error: ${error.message}`);
    throw error;
  }
}

// --- Tool Schemas for Calendar ---

export const createCalendarEventSchema = {
  name: 'createCalendarEvent',
  description: 'Creates a new event in the primary Google Calendar.',
  parameters: {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING', description: 'The title or summary of the event (e.g., "Team Meeting").' },
      description: { type: 'STRING', description: 'Optional. A longer description for the event.' },
      startDateTime: { type: 'STRING', description: 'The start date and time in ISO 8601 format (e.g., "2024-08-15T10:00:00-07:00"). Must include time zone offset.' },
      endDateTime: { type: 'STRING', description: 'The end date and time in ISO 8601 format (e.g., "2024-08-15T11:00:00-07:00"). Must include time zone offset.' },
      attendees: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Optional. List of attendee email addresses.' },
      location: { type: 'STRING', description: 'Optional. The location of the event.' }
      // timezone: { type: 'string', description: 'Optional. IANA Timezone (e.g., "America/Los_Angeles"). If not provided, calendar default is used.'} // Let API handle timezone from ISO string for simplicity
    },
    // required: ['summary', 'startDateTime', 'endDateTime']
  }
};

export const listCalendarEventsSchema = {
  name: 'listCalendarEvents',
  description: 'Lists upcoming events from the primary Google Calendar.',
  parameters: {
    type: 'OBJECT',
    properties: {
      maxResults: { type: 'INTEGER', description: 'Optional. Maximum number of events to return (e.g., 5 or 10). Defaults to 10.' },
      timeMin: { type: 'STRING', description: 'Optional. The start of the time range (ISO 8601 format). Defaults to the current time.' },
      // timeMax: { type: 'string', description: 'Optional. The end of the time range (ISO 8601 format). If not set, lists indefinitely from timeMin.'}
    },
    // required: []
  }
};


// --- Tool Handlers for Calendar (Placeholders/Basic Implementation) ---

export async function handleCreateCalendarEvent(req, args) {
  console.log(`[CalendarTool: createEvent] Received request with args:`, JSON.stringify(args));
  
  // Handle case when args is undefined or not an object
  if (!args || typeof args !== 'object') {
    console.error(`[CalendarTool: createEvent] Invalid arguments:`, args);
    return { status: 'error', message: 'Invalid arguments provided. Expected object with event details.' };
  }
  
  // Support multiple parameter naming conventions (schema vs actual usage)
  const summary = args.summary;
  const description = args.description || '';
  const location = args.location || '';
  const startDateTime = args.startDateTime || args.start;
  const endDateTime = args.endDateTime || args.end;
  
  console.log(`[CalendarTool: createEvent] Processed args: summary=${summary}, start=${startDateTime}, end=${endDateTime}`);

  // Validate required fields
  let missing = [];
  if (!summary) missing.push('summary');
  if (!startDateTime) missing.push('start time (startDateTime or start)');
  if (!endDateTime) missing.push('end time (endDateTime or end)');
  
  if (missing.length > 0) {
    return { status: 'error', message: `Missing required information for creating event: ${missing.join(', ')}.` };
  }
  
  // Validate date formats
  try {
    if (startDateTime) new Date(startDateTime).toISOString();
    if (endDateTime) new Date(endDateTime).toISOString();
  } catch (e) {
    return { status: 'error', message: 'Invalid date format for start or end time. Please use ISO format (YYYY-MM-DDTHH:MM:SS).' };
  }

  try {
    const calendar = await getAuthenticatedCalendarClient(req);
    
    // Use our processed parameters with fallbacks
    const event = {
      summary: summary,
      description: description,
      location: location,
      start: {
        dateTime: startDateTime,
        // timeZone: args.timeZone, // Often inferred from dateTime offset
      },
      end: {
        dateTime: endDateTime,
        // timeZone: args.timeZone,
      },
      attendees: args.attendees ? args.attendees.map(email => ({ email })) : [],
      // Reminders, recurrence, etc. can be added here
    };

    const res = await calendar.events.insert({
      calendarId: 'primary', // Use the primary calendar
      requestBody: event,
    });
    console.log('[CalendarTool: createEvent] Event created:', res.data.htmlLink);
    return { status: 'success', eventId: res.data.id, summary: res.data.summary, link: res.data.htmlLink, message: `Event "${res.data.summary}" created successfully.` };
  } catch (error) {
    let errorMessage = 'Failed to create calendar event.';
    if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Calendar API Error: ${error.response.data.error.message} (Code: ${error.response.data.error.code})`;
    } else if (error.message) { errorMessage = error.message; }
    console.error('[CalendarTool: createEvent] Error:', errorMessage, error.stack);
    if (error.message && (error.message.includes('invalid_grant') || (error.response && error.response.status === 401))) {
        errorMessage += " This might be due to an invalid or revoked refresh token (ensure it has Calendar scope).";
    }
    return { status: 'error', message: errorMessage };
  }
}

export async function handleListCalendarEvents(req, args) {
  console.log(`[CalendarTool: listEvents] Received request with args:`, JSON.stringify(args));
  
  // Handle case when args is undefined or not an object
  if (!args || typeof args !== 'object') {
    console.error(`[CalendarTool: listEvents] Invalid arguments:`, args);
    return { status: 'error', message: 'Invalid arguments provided. Expected object with optional maxResults and timeMin properties.' };
  }
  
  // Extract parameters with fallbacks and support for different parameter names
  const maxResults = args.maxResults || args.max || args.limit || 10;
  const timeMin = args.timeMin || args.startTime || null;
  
  // Validate maxResults is a reasonable number
  const parsedMaxResults = parseInt(maxResults);
  const validMaxResults = !isNaN(parsedMaxResults) && parsedMaxResults > 0 ? 
    Math.min(parsedMaxResults, 100) : 10; // Cap at 100 events
    
  console.log(`[CalendarTool: listEvents] Using maxResults=${validMaxResults}, timeMin=${timeMin || 'now'}`);
  
  // Validate timeMin if provided
  let validTimeMin = null;
  if (timeMin) {
    try {
      validTimeMin = new Date(timeMin).toISOString();
    } catch (e) {
      return { status: 'error', message: 'Invalid timeMin date format. Please use ISO format (YYYY-MM-DDTHH:MM:SS).' };
    }
  }
  
  try {
    const calendar = await getAuthenticatedCalendarClient(req);
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: validTimeMin || (new Date()).toISOString(), // Default to now
      maxResults: validMaxResults,
      singleEvents: true, // Expand recurring events into single instances
      orderBy: 'startTime',
    });

    const events = res.data.items;
    if (!events || events.length === 0) {
      return { status: 'success', events: [], message: 'No upcoming events found.' };
    }

    // Format events for easier display/understanding by the AI
    const formattedEvents = events.map(event => ({
      id: event.id,
      summary: event.summary || '(No Title)',
      location: event.location,
      start: event.start.dateTime || event.start.date, // Handle all-day events
      end: event.end.dateTime || event.end.date,
      description: event.description,
      link: event.htmlLink,
    }));

    return { status: 'success', events: formattedEvents };
  } catch (error) {
    let errorMessage = 'Failed to list calendar events.';
    if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Calendar API Error: ${error.response.data.error.message} (Code: ${error.response.data.error.code})`;
    } else if (error.message) { errorMessage = error.message; }
    console.error('[CalendarTool: listEvents] Error:', errorMessage, error.stack);
     if (error.message && (error.message.includes('invalid_grant') || (error.response && error.response.status === 401))) {
        errorMessage += " This might be due to an invalid or revoked refresh token (ensure it has Calendar scope).";
    }
    return { status: 'error', message: errorMessage };
  }
}

// --- Export all schemas and handlers from this file ---
export const calendarToolSchemas = [
  createCalendarEventSchema,
  listCalendarEventsSchema,
];

export const calendarToolHandlers = {
  createCalendarEvent: handleCreateCalendarEvent,
  listCalendarEvents: handleListCalendarEvents,
};