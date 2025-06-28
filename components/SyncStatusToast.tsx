import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface SyncStatusToastProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onHide?: () => void;
}

export default function SyncStatusToast({ 
  visible, 
  message, 
  type, 
  duration = 3000, 
  onHide 
}: SyncStatusToastProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide?.();
      });
    }
  }, [visible, fadeAnim, duration, onHide]);

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'info':
      default:
        return Colors[colorScheme ?? 'light'].tint;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          opacity: fadeAnim,
          backgroundColor: getBackgroundColor(),
        }
      ]}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
