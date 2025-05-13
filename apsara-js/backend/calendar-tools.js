// backend/calendar-tools.js
import { google } from 'googleapis';

// Helper function to get an authenticated Calendar client
// Uses the same OAuth credentials and refresh token as Gmail
async function getAuthenticatedCalendarClient() {
  const clientId = process.env.GMAIL_CLIENT_ID; // Assuming reuse of credentials
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN; // Token MUST have calendar scope

  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    throw new Error("Google API client credentials or refresh token not configured in .env file for calendar-tools.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
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

export async function handleCreateCalendarEvent(params) {
  console.log('[CalendarTool: createEvent] Request:', params);

  // Add checks for previously required parameters
  if (!params.summary || !params.startDateTime || !params.endDateTime) {
    let missing = [];
    if (!params.summary) missing.push('summary');
    if (!params.startDateTime) missing.push('startDateTime');
    if (!params.endDateTime) missing.push('endDateTime');
    return { status: 'error', message: `Missing required information for creating event: ${missing.join(', ')}.` };
  }

  try {
    const calendar = await getAuthenticatedCalendarClient();
    const event = {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: {
        dateTime: params.startDateTime,
        // timeZone: params.timeZone, // Often inferred from dateTime offset
      },
      end: {
        dateTime: params.endDateTime,
        // timeZone: params.timeZone,
      },
      attendees: params.attendees ? params.attendees.map(email => ({ email })) : [],
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

export async function handleListCalendarEvents({ maxResults = 10, timeMin }) {
  console.log(`[CalendarTool: listEvents] Request: maxResults=${maxResults}, timeMin=${timeMin || 'now'}`);
  try {
    const calendar = await getAuthenticatedCalendarClient();
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || (new Date()).toISOString(), // Default to now
      maxResults: maxResults,
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