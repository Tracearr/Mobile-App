import { AppState } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStateStore } from './authStateStore';
import { canAskForReview, recordActiveDay, type ReviewHistory } from './reviewEligibility';
import { zustandStorage } from './storage';

interface ReviewPromptState extends ReviewHistory {
  // Set while the app is on screen and cleared when it backgrounds. Still set at
  // launch means the previous run ended on screen: a crash or an OS kill.
  running: boolean;
}

const useReviewPromptStore = create<ReviewPromptState>()(
  persist(
    (): ReviewPromptState => ({
      activeDays: 0,
      lastActiveDay: null,
      lastTroubleAt: null,
      lastAskedAt: null,
      running: false,
    }),
    { name: 'tracearr-review-prompt', storage: createJSONStorage(() => zustandStorage) }
  )
);

function enterForeground() {
  useReviewPromptStore.setState((s) => ({ ...recordActiveDay(s, Date.now()), running: true }));
}

export function recordTrouble() {
  useReviewPromptStore.setState({ lastTroubleAt: Date.now() });
}

export function startReviewTracking() {
  const onLaunch = () => {
    if (useReviewPromptStore.getState().running) recordTrouble();
    // Headless background launches (push handling) must not count as a visible run.
    if (AppState.currentState !== 'background') enterForeground();
  };
  if (useReviewPromptStore.persist.hasHydrated()) onLaunch();
  else useReviewPromptStore.persist.onFinishHydration(onLaunch);

  AppState.addEventListener('change', (status) => {
    if (status === 'active') enterForeground();
    else if (status === 'background') useReviewPromptStore.setState({ running: false });
  });
}

export async function maybeRequestReview() {
  const { server, connectionState } = useAuthStateStore.getState();
  const paired = server !== null && connectionState === 'connected';
  if (!canAskForReview(useReviewPromptStore.getState(), paired, Date.now())) return;
  if (!(await StoreReview.isAvailableAsync())) return;
  useReviewPromptStore.setState({ lastAskedAt: Date.now() });
  await StoreReview.requestReview();
}
