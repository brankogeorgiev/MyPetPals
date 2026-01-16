import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Search, X } from 'lucide-react';

// You can get your Mapbox public token from https://mapbox.com/ -> Dashboard -> Tokens
const MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNtNzZ4eWlrMTBibXoya3B2djZ4MXNsdnEifQ.bMo8vwrpdMErOPSB5jYJtQ';

interface MapLocationPickerProps {
  value: string;
  onChange: (location: string) => void;
}

interface SearchResult {
  place_name: string;
  center: [number, number];
}

export function MapLocationPicker({ value, onChange }: MapLocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ address: string; coords: [number, number] } | null>(null);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!isOpen || !mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: selectedLocation?.coords || [-74.006, 40.7128], // Default to NYC
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add marker if we have a selected location
    if (selectedLocation) {
      marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat(selectedLocation.coords)
        .addTo(map.current);
    }

    // Click to place marker
    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      
      // Reverse geocode to get address
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();
        const address = data.features?.[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        setSelectedLocation({ address, coords: [lng, lat] });
        
        // Update or create marker
        if (marker.current) {
          marker.current.setLngLat([lng, lat]);
        } else if (map.current) {
          marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
            .setLngLat([lng, lat])
            .addTo(map.current);
        }
      } catch (error) {
        console.error('Error reverse geocoding:', error);
        setSelectedLocation({ address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, coords: [lng, lat] });
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [isOpen]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: SearchResult) => {
    const coords: [number, number] = [result.center[0], result.center[1]];
    setSelectedLocation({ address: result.place_name, coords });
    setSearchResults([]);
    setSearchQuery('');
    
    if (map.current) {
      map.current.flyTo({ center: coords, zoom: 15 });
      
      if (marker.current) {
        marker.current.setLngLat(coords);
      } else {
        marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat(coords)
          .addTo(map.current);
      }
    }
  };

  const confirmLocation = () => {
    if (selectedLocation) {
      onChange(selectedLocation.address);
    }
    setIsOpen(false);
  };

  const openPicker = () => {
    if (value) {
      // Try to geocode existing value
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.features?.[0]) {
            setSelectedLocation({
              address: data.features[0].place_name,
              coords: data.features[0].center,
            });
          }
        })
        .catch(console.error);
    }
    setIsOpen(true);
  };

  return (
    <>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., Happy Paws Vet Clinic, 123 Main St"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={openPicker}>
          <MapPin className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-display">Select Location</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for an address..."
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleSearch} disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full max-w-[calc(100%-3rem)] bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectSearchResult(result)}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm border-b last:border-b-0"
                  >
                    {result.place_name}
                  </button>
                ))}
              </div>
            )}

            {/* Map */}
            <div ref={mapContainer} className="h-80 rounded-lg overflow-hidden border" />

            {/* Selected Location */}
            {selectedLocation && (
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <p className="text-sm flex-1">{selectedLocation.address}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSelectedLocation(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Click on the map to select a location, or search for an address above.
            </p>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmLocation} disabled={!selectedLocation}>
                Confirm Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
