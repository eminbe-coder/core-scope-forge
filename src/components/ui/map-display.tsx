import React, { useCallback, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, AlertCircle } from 'lucide-react';

interface MapDisplayProps {
  latitude: number;
  longitude: number;
  siteName?: string;
  address?: string;
  className?: string;
  height?: string;
}

interface MapComponentProps {
  center: { lat: number; lng: number };
  siteName?: string;
  address?: string;
  height: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  center, 
  siteName, 
  address,
  height 
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null && !map) {
      const newMap = new google.maps.Map(node, {
        center,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });
      setMap(newMap);
      
      // Create marker
      const marker = new google.maps.Marker({
        position: center,
        map: newMap,
        title: siteName || 'Site Location',
        animation: google.maps.Animation.DROP,
      });

      // Create info window if we have site details
      if (siteName || address) {
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              ${siteName ? `<h3 style="margin: 0 0 4px 0; font-weight: bold;">${siteName}</h3>` : ''}
              ${address ? `<p style="margin: 0; color: #666;">${address}</p>` : ''}
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #888;">
                ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}
              </p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(newMap, marker);
        });

        // Auto-open info window
        infoWindow.open(newMap, marker);
      }
    }
  }, [center, siteName, address, map]);

  return (
    <div 
      ref={mapRef} 
      className={`w-full rounded-lg ${height}`}
      style={{ minHeight: height }}
    />
  );
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyDummy'; // This will need to be set via secrets

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>;
    case Status.FAILURE:
      return <div className="flex items-center justify-center h-64 bg-muted rounded-lg border-2 border-dashed">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Map unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please configure Google Maps API key
          </p>
        </div>
      </div>;
    default:
      return <div className="h-64 bg-muted rounded-lg" />;
  }
};

export const MapDisplay: React.FC<MapDisplayProps> = ({
  latitude,
  longitude,
  siteName,
  address,
  className = '',
  height = 'h-64'
}) => {
  // Default to Riyadh if no valid coordinates
  const center = {
    lat: (latitude && longitude && latitude !== 0 && longitude !== 0) ? latitude : 24.7136,
    lng: (latitude && longitude && latitude !== 0 && longitude !== 0) ? longitude : 46.6753
  };

  const hasValidLocation = latitude && longitude && latitude !== 0 && longitude !== 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {hasValidLocation ? 'Site Location' : 'Location Not Set'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasValidLocation ? (
          <div className="flex items-center justify-center h-32 bg-muted rounded-lg border-2 border-dashed">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No location coordinates available</p>
              <p className="text-xs text-muted-foreground">Edit the site to add location details</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">
              Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
            <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render}>
              <MapComponent
                center={center}
                siteName={siteName}
                address={address}
                height={height}
              />
            </Wrapper>
          </div>
        )}
      </CardContent>
    </Card>
  );
};