/**
 * Error Boundary component for catching and displaying React errors
 */
import { useEffect, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { ObserveErrorBoundary, type ObserveErrorBoundaryFallbackProps } from 'expo-observe';
import { recordTrouble } from '@/lib/reviewPrompt';
import { colors } from '@/lib/theme';

export function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ObserveErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
      {children}
    </ObserveErrorBoundary>
  );
}

function ErrorFallback({ error, resetError }: ObserveErrorBoundaryFallbackProps) {
  useEffect(() => {
    recordTrouble();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AlertTriangle size={48} color={colors.error} strokeWidth={2} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>An unexpected error occurred. Please try again.</Text>

        {__DEV__ && (
          <ScrollView style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error Details:</Text>
            <Text style={styles.errorText}>
              {error instanceof Error ? error.message : String(error)}
            </Text>
          </ScrollView>
        )}

        <TouchableOpacity style={styles.button} onPress={resetError}>
          <RefreshCw size={20} color={colors.text.primary.dark} />
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// The fallback renders when the tree above it may be broken, so it avoids NativeWind.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.text.secondary.dark,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    maxHeight: 200,
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.card.dark,
    borderRadius: 8,
    width: '100%',
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.text.secondary.dark,
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cyan.core,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
});
