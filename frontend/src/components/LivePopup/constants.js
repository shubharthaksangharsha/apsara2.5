// Define tabs
export const TABS = [
  { id: 'chat', label: 'Chat', icon: 'MessageSquare' },
  { id: 'code', label: 'Code & Output', icon: 'Code2' },
  { id: 'map', label: 'Map', icon: 'MapPin' },
  { id: 'calendar', label: 'Calendar', icon: 'CalendarIcon' },
  { id: 'weather', label: 'Weather', icon: 'Sun' },
];

// Add the media resolution options as a constant
export const MEDIA_RESOLUTIONS = [
  { value: 'MEDIA_RESOLUTION_LOW', label: 'Low' },
  { value: 'MEDIA_RESOLUTION_MEDIUM', label: 'Medium' },
  { value: 'MEDIA_RESOLUTION_HIGH', label: 'High' },
];

// Default values
export const DEFAULT_FORM_VALUES = {
  summary: '',
  startDateTime: '', // Expect ISO 8601 format e.g., "2024-08-15T10:00:00-07:00"
  endDateTime: '',   // Expect ISO 8601 format
  description: '',
  location: '',
  attendees: '', // Comma-separated emails
}; 