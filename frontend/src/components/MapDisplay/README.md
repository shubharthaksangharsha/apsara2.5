# MapDisplay Component

A React component for displaying and interacting with Google Maps in the Apsara 2.5 application.

## Features

- Displays an interactive Google Map
- Handles API loading, success, and error states
- Supports markers and info windows
- Provides event callbacks for map interactions
- Automatically passes map instance to child components
- Responsive design with clean styling
- Handles map updates (center, zoom, type) efficiently

## Structure

The component is structured as follows:

```
MapDisplay/
├── components/           # Subcomponents
│   ├── MapMarker.jsx     # Marker component
│   └── InfoWindow.jsx    # Info window component
├── constants.js          # Configuration constants
├── index.jsx             # Main component
└── README.md             # Documentation
```

## Usage

```jsx
import MapDisplay from '../components/MapDisplay';
import { MapMarker, InfoWindow } from '../components/MapDisplay/components';

// In your component
const [selectedLocation, setSelectedLocation] = useState(null);
const [mapConfig, setMapConfig] = useState({
  center: { lat: 37.7749, lng: -122.4194 },
  zoom: 12
});

const handleMapClick = (location) => {
  setSelectedLocation(location);
};

const handleBoundsChanged = (mapData) => {
  console.log('Map bounds changed:', mapData.bounds);
  console.log('New center:', mapData.center);
};

// In your JSX
<MapDisplay 
  center={mapConfig.center}
  zoom={mapConfig.zoom}
  mapType="roadmap"
  apiKey="YOUR_GOOGLE_MAPS_API_KEY"
  onClick={handleMapClick}
  onBoundsChanged={handleBoundsChanged}
>
  {/* Add markers */}
  <MapMarker 
    position={{ lat: 37.7749, lng: -122.4194 }}
    title="San Francisco"
    onClick={() => console.log('Marker clicked')}
  />
  
  {/* Add info window */}
  {selectedLocation && (
    <InfoWindow
      position={selectedLocation}
      content="<div>You clicked here!</div>"
      isOpen={true}
      onClose={() => setSelectedLocation(null)}
    />
  )}
</MapDisplay>
```

## Props

### MapDisplay Component

- `center` (object): Map center coordinates `{lat, lng}` (default: San Francisco)
- `zoom` (number): Map zoom level (default: 13)
- `mapType` (string): Map type - 'roadmap', 'satellite', 'hybrid', or 'terrain' (default: 'roadmap')
- `children` (node): Child components to render (typically markers and info windows)
- `onMapLoad` (function): Callback when map is loaded, receives map instance
- `onBoundsChanged` (function): Callback when map bounds change
- `onClick` (function): Callback when map is clicked
- `apiKey` (string): Google Maps API key

### MapMarker Component

- `map` (object): Google Map instance (automatically provided by MapDisplay)
- `position` (object): Marker position `{lat, lng}`
- `title` (string): Tooltip text shown on hover
- `label` (string, optional): Label to show on the marker
- `icon` (object, optional): Custom icon configuration
- `onClick` (function, optional): Callback when marker is clicked

### InfoWindow Component

- `map` (object): Google Map instance (automatically provided by MapDisplay)
- `position` (object): Info window position `{lat, lng}`
- `marker` (object, optional): Marker to attach to (instead of position)
- `content` (string): HTML content to display
- `isOpen` (boolean): Whether the info window is open
- `onClose` (function, optional): Callback when info window is closed

## API Key

You'll need a Google Maps API key to use this component. You can get one from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/overview).

## Dependencies

- React 16.8+ (for hooks)
- Google Maps JavaScript API
- Lucide React (for loading icon)