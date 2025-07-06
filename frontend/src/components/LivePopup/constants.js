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

// Default form values for calendar event creation
export const DEFAULT_EVENT_FORM = {
  summary: '',
  startDateTime: '',
  endDateTime: '',
  description: '',
  location: '',
  attendees: '',
};

// List of loggable keywords for system messages
export const LOGGABLE_KEYWORDS = [
  'Preparing live session', 'Initiating connection', 'Browser-Backend WS connected',
  'Backend ready', 'Live AI connection active', 'Requesting video stream',
  'Webcam access granted', 'Video stream active', 'Video stream stopped',
  'Starting recording', 'Mic access granted', 'Recording active',
  'Using tool:', 'Tool getGoogleMapsRoute result:',
  'Recording stopped.'
]; 