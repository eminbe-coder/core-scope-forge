import React, { useState, useEffect, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Crosshair, AlertCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number) => void;
  className?: string;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyDummy'; // This will need to be set via secrets

interface MapComponentProps {
  center: { lat: number; lng: number };
  zoom: number;
  onLocationChange: (lat: number, lng: number) => void;
  isMobile: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  center, 
  zoom, 
  onLocationChange, 
  isMobile 
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null && !map) {
      const newMap = new google.maps.Map(node, {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
      });
      setMap(newMap);
      
      // Create initial marker
      const newMarker = new google.maps.Marker({
        position: center,
        map: newMap,
        draggable: true,
        title: 'Site Location'
      });
      setMarker(newMarker);

      // Add click listener for desktop
      if (!isMobile) {
        newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            newMarker.setPosition({ lat, lng });
            onLocationChange(lat, lng);
          }
        });
      }

      // Add drag listener for marker
      newMarker.addListener('dragend', () => {
        const position = newMarker.getPosition();
        if (position) {
          onLocationChange(position.lat(), position.lng());
        }
      });
    }
  }, [center, zoom, onLocationChange, isMobile, map]);

  useEffect(() => {
    if (marker && (center.lat !== 0 || center.lng !== 0)) {
      marker.setPosition(center);
      map?.setCenter(center);
    }
  }, [center, marker, map]);

  return <div ref={mapRef} className="w-full h-64 rounded-lg" />;
};

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
        </div>
      </div>;
    default:
      return <div className="h-64 bg-muted rounded-lg" />;
  }
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude = 24.7136,
  longitude = 46.6753,
  onLocationChange,
  className = ''
}) => {
  const isMobile = useIsMobile();
  const [currentLocation, setCurrentLocation] = useState({ lat: latitude, lng: longitude });
  const [isLocating, setIsLocating] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation({ lat, lng });
        onLocationChange(lat, lng);
        setIsLocating(false);
        toast.success('Location detected successfully');
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location access denied. Please enable location services.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('An error occurred while retrieving location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setCurrentLocation({ lat, lng });
    onLocationChange(lat, lng);
  };

  useEffect(() => {
    if (latitude && longitude) {
      setCurrentLocation({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Picker
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={isLocating}
          >
            <Crosshair className="h-4 w-4 mr-2" />
            {isLocating ? 'Locating...' : 'Use GPS'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {isMobile 
            ? 'Tap "Use GPS" to detect your current location, or drag the marker to set the location.'
            : 'Click on the map or drag the marker to set the location. You can also use GPS to detect your current location.'
          }
        </div>
        
        <div className="space-y-2">
          <div className="text-sm">
            <strong>Selected Location:</strong>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Latitude:</span> {currentLocation.lat.toFixed(6)}
            </div>
            <div>
              <span className="font-medium">Longitude:</span> {currentLocation.lng.toFixed(6)}
            </div>
          </div>
        </div>

        <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render}>
          <MapComponent
            center={currentLocation}
            zoom={15}
            onLocationChange={handleLocationChange}
            isMobile={isMobile}
          />
        </Wrapper>
      </CardContent>
    </Card>
  );
};