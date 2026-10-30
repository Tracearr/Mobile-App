/**
 * Error Boundary component for catching and displaying React errors
 */
import { Component, useEffect, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from '@tracearr/translations/mobile';
import { ErrorState } from '@/components/ui/error-state';
import { recordTrouble } from '@/lib/reviewPrompt';
import { colors } from '@/lib/theme';

// React logs every caught error through console.error, which PostHog captures.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state.error === null) return this.props.children;
    return (
      <ErrorFallback error={this.state.error} resetError={() => this.setState({ error: null })} />
    );
  }
}

// Wired as unstable_settings.screenErrorBoundary in the root layout: one broken
// screen shows this inside its own tab or stack entry and the rest of the app
// keeps working.
export function ScreenErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation(['common']);

  useEffect(() => {
    recordTrouble();
  }, [error]);

  return (
    <View style={styles.container}>
      <ErrorState
        message={__DEV__ ? error.message : t('common:errors.unexpectedError')}
        onRetry={() => void retry()}
      />
    </View>
  );
}

function ErrorFallback({ error, resetError }: { error: unknown; resetError: () => void }) {
  const { t } = useTranslation(['common', 'mobile']);

  // A throw during the first render means the root layout's own hide never runs.
  useEffect(() => {
    SplashScreen.hide();
    recordTrouble();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AlertTriangle size={48} color={colors.error} strokeWidth={2} />
        <Text style={styles.title}>{t('common:errors.somethingWentWrong')}</Text>
        <Text style={styles.message}>{t('common:errors.unexpectedError')}</Text>

        {__DEV__ && (
          <ScrollView style={styles.errorContainer}>
            <Text style={styles.errorTitle}>{t('mobile:errors.errorDetails')}</Text>
            <Text style={styles.errorText}>
              {error instanceof Error ? error.message : String(error)}
            </Text>
          </ScrollView>
        )}

        <TouchableOpacity style={styles.button} onPress={resetError}>
          <RefreshCw size={20} color={colors.text.primary.dark} />
          <Text style={styles.buttonText}>{t('common:actions.tryAgain')}</Text>
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
