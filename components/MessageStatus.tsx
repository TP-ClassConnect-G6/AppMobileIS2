import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface MessageStatusProps {
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export default function MessageStatus({ isUser, timestamp, status = 'sent' }: MessageStatusProps) {
  const colorScheme = useColorScheme();
  
  if (!isUser) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <IconSymbol name="clock" size={12} color="#999" />;
      case 'error':
        return <IconSymbol name="exclamationmark.circle" size={12} color="#f44336" />;
      case 'sent':
      default:
        return <IconSymbol name="checkmark" size={12} color="#4caf50" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Enviando...';
      case 'error':
        return 'Error';
      case 'sent':
      default:
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <View style={styles.container}>
      {getStatusIcon()}
      <Text style={[
        styles.text,
        { 
          color: status === 'error' ? '#f44336' : '#999',
        }
      ]}>
        {getStatusText()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  text: {
    fontSize: 11,
    marginLeft: 4,
  },
});
