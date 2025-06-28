import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface ChatHeaderProps {
  onClearChat: () => void;
  onRefreshHistory: () => void;
  isOnline: boolean;
  messagesCount: number;
  isSyncing: boolean;
}

export default function ChatHeader({ 
  onClearChat, 
  onRefreshHistory, 
  isOnline, 
  messagesCount, 
  isSyncing 
}: ChatHeaderProps) {
  const colorScheme = useColorScheme();

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
            Chat de Asistencia
          </Text>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isOnline ? '#4caf50' : '#f44336' }
          ]} />
        </View>
        <Text style={[styles.subtitle, { color: Colors[colorScheme ?? 'light'].text }]}>
          {isOnline 
            ? `${messagesCount} mensajes • ${isSyncing ? 'Sincronizando...' : 'En línea'}` 
            : 'Sin conexión'
          }
        </Text>
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          onPress={onRefreshHistory}
          style={[
            styles.actionButton, 
            { backgroundColor: Colors[colorScheme ?? 'light'].tint + '20' }
          ]}
          disabled={isSyncing}
        >
          <Ionicons 
            name={isSyncing ? "sync" : "refresh"} 
            size={18} 
            color={Colors[colorScheme ?? 'light'].tint} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={onClearChat}
          style={[
            styles.actionButton, 
            { backgroundColor: Colors[colorScheme ?? 'light'].tint + '20' }
          ]}
        >
          <Ionicons 
            name="trash-outline" 
            size={18} 
            color={Colors[colorScheme ?? 'light'].tint} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  leftContent: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
