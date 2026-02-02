import { Pressable, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Menu, Bell } from 'lucide-react-native';
import { colors, spacing } from '@/lib/theme';

function HeaderLeft() {
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={{ padding: spacing.xs }}
    >
      <Menu size={24} color={colors.text.primary.dark} />
    </Pressable>
  );
}

function HeaderRight() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/alerts')} style={{ padding: spacing.xs }}>
      <Bell size={24} color={colors.text.primary.dark} />
    </Pressable>
  );
}

export default function ActivityStack() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text.primary.dark,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background.dark },
        contentStyle: { backgroundColor: colors.background.dark },
        headerTitleAlign: 'center',
        headerLeft: Platform.OS === 'android' ? () => <HeaderLeft /> : undefined,
        headerRight: Platform.OS === 'android' ? () => <HeaderRight /> : undefined,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Activity',
        }}
      />
    </Stack>
  );
}
