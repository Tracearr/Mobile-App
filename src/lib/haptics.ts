import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Android goes through performAndroidHapticsAsync: the expo-haptics docs advise
// against the Vibrator-backed calls there. Every call is fire-and-forget and
// swallows rejection, so a device with no haptic engine is a no-op.
function fire(ios: () => Promise<void>, android: Haptics.AndroidHaptics) {
  const run = Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(android) : ios();
  run.catch(() => {});
}

export const haptics = {
  /** A picker, segment, toggle or filter changed value. */
  selection: () => fire(Haptics.selectionAsync, Haptics.AndroidHaptics.Clock_Tick),
  /** A mutation the user asked for went through. */
  success: () =>
    fire(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      Haptics.AndroidHaptics.Confirm
    ),
  /** A destructive confirm is about to be shown or was accepted. */
  warning: () =>
    fire(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
      Haptics.AndroidHaptics.Long_Press
    ),
  /** A mutation failed or input was rejected. */
  error: () =>
    fire(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
      Haptics.AndroidHaptics.Reject
    ),
};
