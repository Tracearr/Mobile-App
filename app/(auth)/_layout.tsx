/**
 * Auth layout - for login/pairing screens
 */
import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.dark },
      }}
    >
      <Stack.Screen name="pair" options={{ title: 'Connect to Server' }} />
    </Stack>
  );
}
