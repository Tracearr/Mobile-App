/**
 * Interactive map showing active stream locations.
 * expo-maps (alpha): Apple Maps on iOS, Google Maps on Android, both
 * forced to their native dark styles. Platform prop shapes differ, so
 * each platform gets its own correctly-typed view instead of one
 * conditional-spread component. Google markers have no tint support;
 * server colors show on iOS only until expo-maps grows an equivalent.
 */
import React, { Component, type ReactNode } from 'react';
import { View, Platform } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Map as MapIcon } from 'lucide-react-native';
import type { ActiveSession } from '@tracearr/shared';
import { ACCENT_COLOR, colors } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@tracearr/translations/mobile';

class MapErrorBoundary extends Component<
  { children: ReactNode; height: number; fallbackText: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; height: number; fallbackText: string }) {
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
          <MapIcon size={32} color={colors.icon.default} />
          <Text className="text-muted-foreground text-sm">{this.props.fallbackText}</Text>
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
  serverColorMap?: Map<string, string | null>;
}

type SessionWithLocation = ActiveSession & {
  geoLat: number;
  geoLon: number;
};

function hasLocation(session: ActiveSession): session is SessionWithLocation {
  return session.geoLat != null && session.geoLon != null;
}

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  snippet: string;
  color: string;
}

function buildMarkers(
  sessions: SessionWithLocation[],
  serverColorMap?: Map<string, string | null>
): MarkerData[] {
  return sessions.map((session) => {
    const username = session.user?.username ?? 'Unknown';
    const displayName = session.user?.identityName ?? username;
    const location = [session.geoCity, session.geoCountry].filter(Boolean).join(', ');
    const mediaTitle = session.mediaTitle || '';
    const truncatedTitle =
      mediaTitle.length > 40 ? mediaTitle.substring(0, 37) + '...' : mediaTitle;

    return {
      id: session.sessionKey || session.id,
      latitude: session.geoLat,
      longitude: session.geoLon,
      title: displayName,
      snippet: [truncatedTitle, location].filter(Boolean).join('\n'),
      color: serverColorMap?.get(session.server.id) ?? ACCENT_COLOR,
    };
  });
}

function calculateZoom(sessions: SessionWithLocation[]): number {
  if (sessions.length === 1) return 10;

  const lats = sessions.map((s) => s.geoLat);
  const lons = sessions.map((s) => s.geoLon);
  const latSpread = Math.max(...lats) - Math.min(...lats);
  const lonSpread = Math.max(...lons) - Math.min(...lons);
  const maxSpread = Math.max(latSpread, lonSpread);

  if (maxSpread > 100) return 2;
  if (maxSpread > 50) return 3;
  if (maxSpread > 20) return 4;
  if (maxSpread > 10) return 5;
  if (maxSpread > 5) return 6;
  if (maxSpread > 1) return 8;
  return 10;
}

export function StreamMap({ sessions, height = 300, serverColorMap }: StreamMapProps) {
  const { t } = useTranslation(['mobile']);
  const sessionsWithLocation = sessions.filter(hasLocation);

  if (sessionsWithLocation.length === 0) {
    return (
      <View
        className="bg-card items-center justify-center overflow-hidden rounded-xl"
        style={{ height }}
      >
        <Text className="text-muted-foreground text-sm">{t('mobile:map.noData')}</Text>
      </View>
    );
  }

  const markers = buildMarkers(sessionsWithLocation, serverColorMap);
  const avgLat =
    sessionsWithLocation.reduce((sum, s) => sum + s.geoLat, 0) / sessionsWithLocation.length;
  const avgLon =
    sessionsWithLocation.reduce((sum, s) => sum + s.geoLon, 0) / sessionsWithLocation.length;

  const cameraPosition = {
    coordinates: { latitude: avgLat, longitude: avgLon },
    zoom: calculateZoom(sessionsWithLocation),
  };

  return (
    <MapErrorBoundary height={height} fallbackText={t('mobile:map.unavailable')}>
      <View className="bg-card overflow-hidden rounded-xl" style={{ height }}>
        {Platform.OS === 'ios' ? (
          <AppleMaps.View
            style={{ flex: 1 }}
            cameraPosition={cameraPosition}
            colorScheme={AppleMaps.MapColorScheme.DARK}
            markers={markers.map((m) => ({
              id: m.id,
              coordinates: { latitude: m.latitude, longitude: m.longitude },
              title: m.title,
              systemImage: 'play.circle.fill',
              tintColor: m.color,
            }))}
            properties={{
              pointsOfInterest: { including: [] },
            }}
            uiSettings={{
              compassEnabled: false,
              scaleBarEnabled: false,
              togglePitchEnabled: false,
              myLocationButtonEnabled: false,
            }}
          />
        ) : (
          <GoogleMaps.View
            style={{ flex: 1 }}
            cameraPosition={cameraPosition}
            colorScheme={GoogleMaps.MapColorScheme.DARK}
            markers={markers.map((m) => ({
              id: m.id,
              coordinates: { latitude: m.latitude, longitude: m.longitude },
              title: m.title,
              snippet: m.snippet,
            }))}
            uiSettings={{
              compassEnabled: false,
              scaleBarEnabled: false,
              rotationGesturesEnabled: false,
              tiltGesturesEnabled: false,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
              myLocationButtonEnabled: false,
            }}
          />
        )}
      </View>
    </MapErrorBoundary>
  );
}
