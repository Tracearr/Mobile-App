/**
 * Server selector component for header
 * Multi-select with checkboxes and server color borders
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
import { Server, ChevronDown, Square, SquareCheck } from 'lucide-react-native';
import { useMediaServer } from '../providers/MediaServerProvider';
import { ACCENT_COLOR, colors } from '../lib/theme';

export function ServerSelector() {
  const {
    servers,
    selectedServerIds,
    selectedServers,
    isMultiServer,
    isAllServersSelected,
    toggleServer,
    selectAllServers,
    selectServer,
    isLoading,
  } = useMediaServer();
  const [modalVisible, setModalVisible] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-row items-center px-3">
        <ActivityIndicator size="small" color={colors.text.muted.dark} />
      </View>
    );
  }

  if (servers.length <= 1) {
    if (servers.length === 1) {
      return (
        <View className="flex-row items-center px-3">
          <Server size={16} color={colors.text.primary.dark} />
          <Text className="ml-2 text-sm font-medium text-white" numberOfLines={1}>
            {servers[0]?.name}
          </Text>
        </View>
      );
    }
    return null;
  }

  const buttonLabel = isMultiServer
    ? `${selectedServerIds.length} Servers`
    : (selectedServers[0]?.name ?? 'Select Server');

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center px-3 py-2"
        activeOpacity={0.7}
      >
        <Server size={16} color={ACCENT_COLOR} />
        <Text className="ml-2 text-sm font-medium text-white" numberOfLines={1}>
          {buttonLabel}
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
          className="flex-1 items-center justify-center bg-black/60"
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            className="w-4/5 max-w-sm overflow-hidden rounded-xl bg-gray-900"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b border-gray-800 px-4 py-3">
              <Text className="text-lg font-semibold text-white">Select Servers</Text>
              <TouchableOpacity
                onPress={() => {
                  if (isAllServersSelected) {
                    selectServer(servers[0]?.id ?? null);
                  } else {
                    selectAllServers();
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: ACCENT_COLOR, fontSize: 13, fontWeight: '500' }}>
                  {isAllServersSelected ? 'Deselect All' : 'All'}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="py-2">
              {servers.map((server) => {
                const isSelected = selectedServerIds.includes(server.id);
                return (
                  <TouchableOpacity
                    key={server.id}
                    onPress={() => toggleServer(server.id)}
                    className="flex-row items-center px-4 py-3"
                    style={{ borderLeftWidth: 2, borderLeftColor: server.color ?? 'transparent' }}
                    activeOpacity={0.7}
                  >
                    {isSelected ? (
                      <SquareCheck size={20} color={ACCENT_COLOR} />
                    ) : (
                      <Square size={20} color={colors.text.muted.dark} />
                    )}
                    <View className="ml-3 flex-1">
                      <Text
                        className="text-base"
                        style={{
                          fontWeight: isSelected ? '500' : '400',
                          color: isSelected ? 'white' : colors.text.muted.dark,
                        }}
                        numberOfLines={1}
                      >
                        {server.name}
                      </Text>
                      <Text className="text-xs text-gray-500 capitalize">{server.type}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View className="border-t border-gray-800 px-4 py-2.5">
              <Text className="text-center text-xs text-gray-500">
                {selectedServerIds.length} of {servers.length} servers selected
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
