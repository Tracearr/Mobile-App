import { useState, useEffect, useRef } from 'react';
import type { ActiveSession } from '@tracearr/shared';

/**
 * Hook that estimates playback progress client-side for smooth UI updates.
 *
 * NOTE: This hook is duplicated in apps/web/src/hooks/useEstimatedProgress.ts
 * Keep both files in sync when making changes.
 *
 * When state is "playing", progress increments every second based on elapsed time.
 * When state is "paused" or "stopped", progress stays at last known value.
 *
 * Resets estimation when:
 * - Session ID changes
 * - Server-side progressMs changes (new data from SSE/poll)
 * - State changes
 *
 * @param session - The active session to estimate progress for
 * @returns Object with estimated progressMs and progress percentage
 */
export function useEstimatedProgress(session: ActiveSession) {
  const [estimatedProgressMs, setEstimatedProgressMs] = useState(session.progressMs ?? 0);

  // Track the last known server values to detect changes
  const lastServerProgress = useRef(session.progressMs);
  const lastSessionId = useRef(session.id);
  const lastState = useRef(session.state);
  const estimationStartTime = useRef(Date.now());
  const estimationStartProgress = useRef(session.progressMs ?? 0);

  // Reset estimation when server data changes
  useEffect(() => {
    const serverProgressChanged = session.progressMs !== lastServerProgress.current;
    const sessionChanged = session.id !== lastSessionId.current;
    const stateChanged = session.state !== lastState.current;

    if (sessionChanged || serverProgressChanged || stateChanged) {
      // Reset to server value
      const newProgress = session.progressMs ?? 0;
      setEstimatedProgressMs(newProgress);

      // Update refs
      lastServerProgress.current = session.progressMs;
      lastSessionId.current = session.id;
      lastState.current = session.state;
      estimationStartTime.current = Date.now();
      estimationStartProgress.current = newProgress;
    }
  }, [session.id, session.progressMs, session.state]);

  // Tick progress when playing
  useEffect(() => {
    if (session.state !== 'playing') {
      return;
    }

    const intervalId = setInterval(() => {
      const elapsedMs = Date.now() - estimationStartTime.current;
      const estimated = estimationStartProgress.current + elapsedMs;

      // Cap at total duration if available
      const maxProgress = session.totalDurationMs ?? Infinity;
      setEstimatedProgressMs(Math.min(estimated, maxProgress));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [session.state, session.totalDurationMs]);

  // Calculate percentage
  const progressPercent = session.totalDurationMs
    ? Math.min((estimatedProgressMs / session.totalDurationMs) * 100, 100)
    : 0;

  return {
    estimatedProgressMs,
    progressPercent,
    isEstimating: session.state === 'playing',
  };
}
