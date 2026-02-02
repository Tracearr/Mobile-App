/**
 * 404 Not Found screen
 */
import { View, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found' }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-card border-border mb-4 h-20 w-20 items-center justify-center rounded-full border">
            <AlertCircle size={32} color={colors.text.muted.dark} />
          </View>
          <Text className="mb-1 text-center text-lg font-semibold">Page Not Found</Text>
          <Text className="text-muted-foreground mb-6 text-center text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </Text>
          <Pressable
            className="bg-primary rounded-lg px-6 py-3"
            onPress={() => router.replace('/index')}
          >
            <Text className="font-semibold text-white">Go Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}
