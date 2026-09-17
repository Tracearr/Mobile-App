import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { useTerminateSession } from '@/hooks/useTerminateSession';
import { haptics } from '@/lib/haptics';
import { colors } from '@/lib/theme';

interface TerminateSessionDialogProps {
  visible: boolean;
  onClose: () => void;
  sessionId: string;
  mediaTitle: string;
  username: string;
  onTerminated?: () => void;
}

export function TerminateSessionDialog({
  visible,
  onClose,
  sessionId,
  mediaTitle,
  username,
  onTerminated,
}: TerminateSessionDialogProps) {
  const { t } = useTranslation(['pages', 'mobile', 'common']);
  const [reason, setReason] = useState('');
  const terminate = useTerminateSession();

  const close = () => {
    setReason('');
    onClose();
  };

  const confirm = () => {
    terminate.mutate(
      { sessionId, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          haptics.success();
          close();
          Alert.alert(t('mobile:session.streamTerminated'), t('mobile:session.sessionStopped'));
          onTerminated?.();
        },
        onError: (error: Error) => {
          haptics.error();
          Alert.alert(t('mobile:session.failedToTerminate'), error.message);
        },
      }
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable className="flex-1 items-center justify-center bg-black/60" onPress={close}>
          <Pressable
            className="bg-surface border-border w-4/5 max-w-sm overflow-hidden rounded-xl border"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="px-4 pt-4 pb-3">
              <Text accessibilityRole="header" className="text-lg font-semibold">
                {t('pages:terminateStream.title')}
              </Text>
              <Text className="text-muted-foreground mt-1 text-sm">
                {t('pages:terminateStream.stopMedia', { mediaTitle, username })}
              </Text>
            </View>
            <View className="px-4 pb-3">
              <Text className="text-muted-foreground mb-1.5 text-xs font-medium">
                {t('pages:terminateStream.messageLabel')}
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder={t('pages:terminateStream.messagePlaceholder')}
                placeholderTextColor={colors.text.muted.dark}
                accessibilityLabel={t('pages:terminateStream.messageLabel')}
                className="border-border bg-background text-foreground rounded-lg border px-3 py-2.5 text-sm"
                maxLength={500}
                returnKeyType="done"
              />
              <Text className="text-muted-foreground mt-1.5 text-xs">
                {t('pages:terminateStream.messageHint')}
              </Text>
            </View>
            <View className="border-border flex-row border-t">
              <Pressable
                accessibilityRole="button"
                className="min-h-11 flex-1 items-center justify-center"
                onPress={close}
                disabled={terminate.isPending}
              >
                <Text className="text-muted-foreground text-sm font-medium">
                  {t('common:actions.cancel')}
                </Text>
              </Pressable>
              <View className="bg-border w-px" />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: terminate.isPending }}
                className="min-h-11 flex-1 items-center justify-center"
                onPress={confirm}
                disabled={terminate.isPending}
              >
                <Text className="text-danger text-sm font-medium">
                  {terminate.isPending
                    ? t('pages:terminateStream.terminating')
                    : t('common:actions.terminate')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
