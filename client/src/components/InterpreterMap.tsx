import { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2 } from "lucide-react";

interface Interpreter {
  id: number;
  firstName: string;
  lastName: string;
  city: string | null;
  state: string | null;
  lat: string | null;
  lng: string | null;
  phone: string | null;
  email: string | null;
  targetLanguage: string | null;
  sourceLanguage: string | null;
}

interface InterpreterMapProps {
  interpreters: Interpreter[];
  selectedId?: number;
  onMarkerClick?: (id: number) => void;
  userLocation?: { lat: number; lng: number };
  radiusMiles?: number;
}

export function InterpreterMap({ interpreters, selectedId, onMarkerClick, userLocation, radiusMiles }: InterpreterMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [circle, setCircle] = useState<google.maps.Circle | null>(null);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Filter interpreters with valid coordinates
  const validInterpreters = interpreters.filter(
    (i) => i.lat && i.lng && !isNaN(parseFloat(i.lat)) && !isNaN(parseFloat(i.lng))
  );

  useEffect(() => {
    if (!map || validInterpreters.length === 0) return;

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));

    // Create info window if it doesn't exist
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // Create new markers
    const newMarkers = validInterpreters.map((interpreter) => {
      const position = {
        lat: parseFloat(interpreter.lat!),
        lng: parseFloat(interpreter.lng!),
      };

      const marker = new google.maps.Marker({
        position,
        map,
        title: `${interpreter.firstName} ${interpreter.lastName}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: selectedId === interpreter.id ? "#FFC107" : "#2E4FD8",
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      // Parse languages
      let languages: string[] = [];
      try {
        if (interpreter.targetLanguage) {
          // targetLanguage is already a string
        }
      } catch (e) {
        // ignore
      }

      // Add click listener
      marker.addListener("click", () => {
        const content = `
          <div style="padding: 8px; max-width: 250px;">
            <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #1a1a1a;">
              ${interpreter.firstName} ${interpreter.lastName}
            </h3>
            <p style="color: #666; font-size: 14px; margin-bottom: 8px;">
              <strong>Location:</strong> ${interpreter.city}, ${interpreter.state}
            </p>
            ${
              languages.length > 0
                ? `<p style="color: #666; font-size: 14px; margin-bottom: 8px;">
                     <strong>Languages:</strong> ${languages.slice(0, 3).join(", ")}${
                    languages.length > 3 ? ` +${languages.length - 3} more` : ""
                  }
                   </p>`
                : ""
            }
            ${
              interpreter.phone
                ? `<p style="color: #666; font-size: 14px; margin-bottom: 4px;">
                     <strong>Phone:</strong> ${interpreter.phone}
                   </p>`
                : ""
            }
            ${
              interpreter.email
                ? `<p style="color: #666; font-size: 14px; margin-bottom: 8px;">
                     <strong>Email:</strong> ${interpreter.email}
                   </p>`
                : ""
            }
            <a href="/interpreter/${interpreter.id}" 
               style="display: inline-block; margin-top: 8px; padding: 6px 12px; background-color: #2E4FD8; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">
              View Full Profile
            </a>
          </div>
        `;

        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open(map, marker);

        if (onMarkerClick) {
          onMarkerClick(interpreter.id);
        }
      });

      return marker;
    });

    setMarkers(newMarkers);

    // Fit bounds to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach((marker) => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      map.fitBounds(bounds);

      // Adjust zoom if only one marker
      if (newMarkers.length === 1) {
        map.setZoom(12);
      }
    }

    return () => {
      newMarkers.forEach((marker) => marker.setMap(null));
    };
  }, [map, validInterpreters, selectedId, onMarkerClick]);

  // Add user location marker and distance circle
  useEffect(() => {
    if (!map || !userLocation) {
      // Clean up if no user location
      if (circle) {
        circle.setMap(null);
        setCircle(null);
      }
      if (userMarker) {
        userMarker.setMap(null);
        setUserMarker(null);
      }
      return;
    }

    // Create or update user marker
    if (userMarker) {
      userMarker.setPosition(userLocation);
    } else {
      const marker = new google.maps.Marker({
        position: userLocation,
        map,
        title: "Your Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#FF0000",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        zIndex: 1000,
      });
      setUserMarker(marker);
    }

    // Create or update distance circle
    if (radiusMiles) {
      const radiusMeters = radiusMiles * 1609.34; // Convert miles to meters
      
      if (circle) {
        circle.setCenter(userLocation);
        circle.setRadius(radiusMeters);
      } else {
        const newCircle = new google.maps.Circle({
          map,
          center: userLocation,
          radius: radiusMeters,
          fillColor: "#2E4FD8",
          fillOpacity: 0.1,
          strokeColor: "#2E4FD8",
          strokeOpacity: 0.4,
          strokeWeight: 2,
        });
        setCircle(newCircle);
      }
    } else if (circle) {
      circle.setMap(null);
      setCircle(null);
    }

    return () => {
      if (circle) circle.setMap(null);
      if (userMarker) userMarker.setMap(null);
    };
  }, [map, userLocation, radiusMiles]);

  const handleMapReady = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  };

  if (validInterpreters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Interpreter Locations
          </CardTitle>
          <CardDescription>
            No interpreters with location data to display on map
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Location data not available for current results</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Interpreter Locations
        </CardTitle>
        <CardDescription>
          Showing {validInterpreters.length} interpreter{validInterpreters.length !== 1 ? "s" : ""} on map
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px] w-full rounded-b-lg overflow-hidden">
          <MapView
            onMapReady={handleMapReady}
            initialCenter={{ lat: 39.8283, lng: -98.5795 }} // Center of US
            initialZoom={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}
