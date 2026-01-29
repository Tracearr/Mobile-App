import { Stack } from 'expo-router/stack';
import { colors } from '@/lib/theme';

export default function ActivityStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.dark },
        headerTintColor: colors.text.primary.dark,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background.dark },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Activity',
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
