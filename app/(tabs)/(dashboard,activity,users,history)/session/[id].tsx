import { useLocalSearchParams, useRouter } from 'expo-router';
import { SessionDetail } from '@/screens/SessionDetail';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <SessionDetail id={id} onBack={() => router.back()} />;
}
