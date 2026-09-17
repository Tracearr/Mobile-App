/**
 * Pull-to-refresh state for a RefreshControl.
 *
 * `refreshing` follows the user's gesture only. Binding it to a query flag
 * lets background refetches drive the native control, which arms every
 * mounted tab at once and moves the scroll offset.
 *
 * `controlKey` remounts the control when the app or the screen comes back, on
 * iOS only. iOS drops the spinner's layer animation while the app is
 * backgrounded and RefreshControl never restarts it, so a fresh control is the
 * only repair. Android renders the control as the ScrollView's wrapper, where
 * a new key would tear the list down instead.
 *
 * Spread `refreshControlProps` onto the RefreshControl and pass
 * `key={controlKey}` beside it. `tintColor` is iOS
 * only; Android takes its spinner colors from `colors` and
 * `progressBackgroundColor`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { useIsFocused } from 'expo-router';
import { ACCENT_COLOR, colors } from '@/lib/theme';

const CAN_REMOUNT = Platform.OS === 'ios';

export function usePullToRefresh(onRefresh: () => Promise<unknown>, resetKey?: unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const [controlKey, setControlKey] = useState(0);
  const isFocused = useIsFocused();

  const handlerRef = useRef(onRefresh);
  const refreshingRef = useRef(false);
  const needsRemountRef = useRef(false);
  // Only the newest pull may clear the spinner. cancelRefetch defaults to true,
  // so starting a second refresh settles the first one's promise immediately.
  const generationRef = useRef(0);

  useEffect(() => {
    handlerRef.current = onRefresh;
  });

  const stop = useCallback(() => {
    generationRef.current += 1;
    refreshingRef.current = false;
    setRefreshing(false);
  }, []);

  const start = useCallback(() => {
    const generation = ++generationRef.current;
    refreshingRef.current = true;
    setRefreshing(true);
    void Promise.resolve(handlerRef.current()).finally(() => {
      if (generationRef.current !== generation) return;
      refreshingRef.current = false;
      setRefreshing(false);
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') {
        if (needsRemountRef.current) {
          needsRemountRef.current = false;
          setControlKey((key) => key + 1);
        }
        return;
      }
      if (refreshingRef.current && CAN_REMOUNT) {
        needsRemountRef.current = true;
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isFocused) {
      if (needsRemountRef.current) {
        needsRemountRef.current = false;
        setControlKey((key) => key + 1);
      }
      return;
    }
    if (refreshingRef.current) {
      if (CAN_REMOUNT) {
        needsRemountRef.current = true;
      }
      stop();
    }
  }, [isFocused, stop]);

  // A subtree remount below the screen component can otherwise hand a stale
  // `true` to a fresh control, which starts a refresh the user never asked for.
  useEffect(() => {
    if (refreshingRef.current) {
      stop();
    }
  }, [resetKey, stop]);

  // `key` stays out of this object: React warns when a key arrives through a spread.
  const refreshControlProps = {
    refreshing,
    onRefresh: start,
    tintColor: ACCENT_COLOR,
    colors: [ACCENT_COLOR],
    progressBackgroundColor: colors.surface.dark,
  };

  return { refreshing, onRefresh: start, controlKey, refreshControlProps };
}
