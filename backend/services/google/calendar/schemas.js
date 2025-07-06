// services/google/calendar/schemas.js
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
      },
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
      },
    }
  };
  
  export const calendarToolSchemas = [
    createCalendarEventSchema,
    listCalendarEventsSchema,
  ];