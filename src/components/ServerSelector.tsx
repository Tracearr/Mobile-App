/**
 * Server selector component for header
 * Tappable button that shows current server, opens modal to switch
 */
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Server, ChevronDown, Check } from 'lucide-react-native';
import { useMediaServer } from '../providers/MediaServerProvider';
import { colors } from '../lib/theme';

export function ServerSelector() {
  const { servers, selectedServer, selectedServerId, selectServer, isLoading } = useMediaServer();
  const [modalVisible, setModalVisible] = useState(false);

  // Don't show if loading or no servers
  if (isLoading) {
    return (
      <View className="flex-row items-center px-3">
        <ActivityIndicator size="small" color={colors.text.muted.dark} />
      </View>
    );
  }

  // Don't show selector if only one server
  if (servers.length <= 1) {
    if (servers.length === 1) {
      return (
        <View className="flex-row items-center px-3">
          <Server size={16} color={colors.text.primary.dark} />
          <Text className="ml-2 text-sm text-white font-medium" numberOfLines={1}>
            {servers[0]?.name}
          </Text>
        </View>
      );
    }
    return null;
  }

  const handleSelect = (serverId: string) => {
    selectServer(serverId);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center px-3 py-2"
        activeOpacity={0.7}
      >
        <Server size={16} color={colors.cyan.core} />
        <Text className="ml-2 text-sm font-medium text-white" numberOfLines={1}>
          {selectedServer?.name ?? 'Select Server'}
        </Text>
        <ChevronDown size={16} color={colors.text.muted.dark} className="ml-1" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/60"
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            className="w-4/5 max-w-sm bg-gray-900 rounded-xl overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="px-4 py-3 border-b border-gray-800">
              <Text className="text-lg font-semibold text-white">Select Server</Text>
            </View>
            <View className="py-2">
              {servers.map((server) => (
                <TouchableOpacity
                  key={server.id}
                  onPress={() => handleSelect(server.id)}
                  className="flex-row items-center justify-between px-4 py-3"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1">
                    <Server
                      size={20}
                      color={
                        server.id === selectedServerId
                          ? colors.cyan.core
                          : colors.text.muted.dark
                      }
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className={`text-base ${
                          server.id === selectedServerId
                            ? 'text-cyan-400 font-medium'
                            : 'text-white'
                        }`}
                        numberOfLines={1}
                      >
                        {server.name}
                      </Text>
                      <Text className="text-xs text-gray-500 capitalize">
                        {server.type}
                      </Text>
                    </View>
                  </View>
                  {server.id === selectedServerId && (
                    <Check size={20} color={colors.cyan.core} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
