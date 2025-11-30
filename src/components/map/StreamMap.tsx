/**
 * Interactive map showing active stream locations
 * Uses expo-maps with Apple Maps on iOS, Google Maps on Android
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import type { ActiveSession } from '@tracearr/shared';
import { colors, borderRadius, typography } from '../../lib/theme';

interface StreamMapProps {
  sessions: ActiveSession[];
  height?: number;
}

export function StreamMap({ sessions, height = 300 }: StreamMapProps) {
  // Filter sessions with valid geo coordinates
  const sessionsWithLocation = sessions.filter(
    (s) => s.geoLat != null && s.geoLon != null
  );

  if (sessionsWithLocation.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>No location data available</Text>
      </View>
    );
  }

  // Calculate center point from all sessions
  const avgLat = sessionsWithLocation.reduce((sum, s) => sum + s.geoLat!, 0) / sessionsWithLocation.length;
  const avgLon = sessionsWithLocation.reduce((sum, s) => sum + s.geoLon!, 0) / sessionsWithLocation.length;

  // Create markers for each session
  const markers = sessionsWithLocation.map((session) => ({
    id: session.sessionKey || session.id,
    coordinates: {
      latitude: session.geoLat!,
      longitude: session.geoLon!,
    },
    title: session.user?.username || 'Unknown',
    snippet: `${session.mediaTitle || 'Unknown'} - ${session.geoCity || ''}, ${session.geoCountry || ''}`,
  }));

  const cameraPosition = {
    coordinates: {
      latitude: avgLat || 39.8283,
      longitude: avgLon || -98.5795,
    },
    zoom: sessionsWithLocation.length === 1 ? 10 : 4,
  };

  // Use platform-specific map component
  const MapComponent = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View;

  return (
    <View style={[styles.container, { height }]}>
      <MapComponent
        style={styles.map}
        cameraPosition={cameraPosition}
        markers={markers.map((m) => ({
          id: m.id,
          coordinates: m.coordinates,
          title: m.title,
          snippet: m.snippet,
          tintColor: colors.cyan.core,
        }))}
        uiSettings={{
          compassEnabled: false,
          scaleBarEnabled: false,
          rotationGesturesEnabled: false,
          tiltGesturesEnabled: false,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card.dark,
  },
  map: {
    flex: 1,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted.dark,
    fontSize: typography.fontSize.sm,
  },
});
