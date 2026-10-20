import { useLocalSearchParams, useRouter } from 'expo-router';
import { ViolationDetail } from '@/screens/ViolationDetail';

export default function ViolationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <ViolationDetail id={id} onBack={() => router.back()} />;
}
