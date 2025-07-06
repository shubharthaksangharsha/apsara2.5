// services/google/calendar/handlers.js
import { getAuthenticatedCalendarClient } from '../auth/googleAuth.js';

/**
 * Creates a new calendar event
 */
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
      },
      end: {
        dateTime: endDateTime,
      },
      attendees: args.attendees ? args.attendees.map(email => ({ email })) : [],
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

/**
 * Lists upcoming calendar events
 */
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

export const calendarToolHandlers = {
  createCalendarEvent: handleCreateCalendarEvent,
  listCalendarEvents: handleListCalendarEvents,
};