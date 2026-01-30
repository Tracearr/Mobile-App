/**
 * Interactive map showing active stream locations
 * Uses expo-maps with Apple Maps on iOS, Google Maps on Android
 *
 * Note: expo-maps doesn't support custom tile providers, so we can't
 * match the web's dark theme exactly. Using default map styles.
 */
import React, { Component, type ReactNode } from 'react';
import { View, Platform } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Ionicons } from '@expo/vector-icons';
import type { ActiveSession } from '@tracearr/shared';
import { ACCENT_COLOR, colors } from '@/lib/theme';
import { Text } from '@/components/ui/text';

/**
 * Error boundary to catch map crashes (e.g., missing Google Maps API key on Android)
 * This prevents the entire app from crashing if the map fails to render
 */
class MapErrorBoundary extends Component<
  { children: ReactNode; height: number },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; height: number }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('StreamMap crashed:', error.message);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          className="bg-card items-center justify-center gap-2 overflow-hidden rounded-xl"
          style={{ height: this.props.height }}
        >
          <Ionicons name="map-outline" size={32} color={colors.icon.default} />
          <Text className="text-muted-foreground text-sm">Map unavailable</Text>
          {__DEV__ && this.state.error && (
            <Text className="text-destructive px-4 text-center text-xs">
              {this.state.error.message}
            </Text>
          )}
        </View>
      );
    }
    return this.props.children;
  }
}

interface StreamMapProps {
  sessions: ActiveSession[];
  height?: number;
}

/** Session with guaranteed geo coordinates */
type SessionWithLocation = ActiveSession & {
  geoLat: number;
  geoLon: number;
};

/** Type guard to filter sessions with valid coordinates */
function hasLocation(session: ActiveSession): session is SessionWithLocation {
  return session.geoLat != null && session.geoLon != null;
}

export function StreamMap({ sessions, height = 300 }: StreamMapProps) {
  // Filter sessions with valid geo coordinates (type guard narrows to SessionWithLocation[])
  const sessionsWithLocation = sessions.filter(hasLocation);

  if (sessionsWithLocation.length === 0) {
    return (
      <View
        className="bg-card items-center justify-center overflow-hidden rounded-xl"
        style={{ height }}
      >
        <Text className="text-muted-foreground text-sm">No location data available</Text>
      </View>
    );
  }

  // Calculate center point from all sessions
  const avgLat =
    sessionsWithLocation.reduce((sum, s) => sum + s.geoLat, 0) / sessionsWithLocation.length;
  const avgLon =
    sessionsWithLocation.reduce((sum, s) => sum + s.geoLon, 0) / sessionsWithLocation.length;

  // Create markers for each session with enhanced info
  const markers = sessionsWithLocation.map((session) => {
    const username = session.user?.username ?? 'Unknown';
    const displayName = session.user?.identityName ?? username;
    const location =
      [session.geoCity, session.geoCountry].filter(Boolean).join(', ') || 'Unknown location';
    const mediaTitle = session.mediaTitle || 'Unknown';

    // Truncate long media titles for snippet
    const truncatedTitle =
      mediaTitle.length > 40 ? mediaTitle.substring(0, 37) + '...' : mediaTitle;

    return {
      id: session.sessionKey || session.id,
      coordinates: {
        latitude: session.geoLat,
        longitude: session.geoLon,
      },
      // Title shows display name prominently
      title: displayName,
      // Snippet shows media and location
      snippet: `${truncatedTitle}\n${location}`,
      // Use accent color to match app theme
      tintColor: ACCENT_COLOR,
      // iOS: Use SF Symbol for streaming indicator
      ...(Platform.OS === 'ios' && {
        systemImage: 'play.circle.fill',
      }),
    };
  });

  // Calculate appropriate zoom based on marker spread
  const calculateZoom = () => {
    if (sessionsWithLocation.length === 1) return 10;

    // Calculate spread of coordinates
    const lats = sessionsWithLocation.map((s) => s.geoLat);
    const lons = sessionsWithLocation.map((s) => s.geoLon);
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lonSpread = Math.max(...lons) - Math.min(...lons);
    const maxSpread = Math.max(latSpread, lonSpread);

    // Adjust zoom based on spread
    if (maxSpread > 100) return 2;
    if (maxSpread > 50) return 3;
    if (maxSpread > 20) return 4;
    if (maxSpread > 10) return 5;
    if (maxSpread > 5) return 6;
    if (maxSpread > 1) return 8;
    return 10;
  };

  const cameraPosition = {
    coordinates: {
      latitude: avgLat || 39.8283,
      longitude: avgLon || -98.5795,
    },
    zoom: calculateZoom(),
  };

  // Use platform-specific map component
  const MapComponent = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View;

  return (
    <MapErrorBoundary height={height}>
      <View className="bg-card overflow-hidden rounded-xl" style={{ height }}>
        <MapComponent
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          markers={markers.map((m) => ({
            id: m.id,
            coordinates: m.coordinates,
            title: m.title,
            snippet: m.snippet,
            tintColor: m.tintColor,
            ...(Platform.OS === 'ios' && m.systemImage && { systemImage: m.systemImage }),
          }))}
          uiSettings={{
            compassEnabled: false,
            scaleBarEnabled: false,
            rotationGesturesEnabled: false,
            tiltGesturesEnabled: false,
          }}
        />
      </View>
    </MapErrorBoundary>
  );
}
