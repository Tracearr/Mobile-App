/**
 * Unauthenticated screen component
 * Full-screen replacement when token is revoked or invalid
 * Provides QR scan and manual entry options for re-pairing
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Unlink } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useConnectionStore } from '../stores/connectionStore';
import { colors, spacing, borderRadius, typography } from '../lib/theme';

export function UnauthenticatedScreen() {
  const router = useRouter();
  const { cachedServerUrl, cachedServerName } = useConnectionStore();

  const handleScanQR = () => {
    router.replace('/(auth)/pair');
  };

  const handleManualEntry = () => {
    router.replace({
      pathname: '/(auth)/pair',
      params: { prefillUrl: cachedServerUrl ?? '' },
    });
  };

  const serverDisplay = cachedServerName || cachedServerUrl || 'your server';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Unlink size={48} color={colors.text.muted.dark} />
        </View>

        <Text style={styles.heading}>Connection Lost</Text>

        <Text style={styles.message}>
          Your access to {serverDisplay} was revoked. Ask the server owner for a new pairing code.
        </Text>

        <Pressable style={styles.primaryButton} onPress={handleScanQR}>
          <Text style={styles.primaryButtonText}>Scan QR Code</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleManualEntry}>
          <Text style={styles.secondaryButtonText}>Enter Manually</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  heading: {
    color: colors.text.primary.dark,
    fontSize: typography.fontSize['2xl'],
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  message: {
    color: colors.text.secondary.dark,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.cyan.core,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    color: colors.background.dark,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text.muted.dark,
    fontSize: typography.fontSize.base,
  },
});
