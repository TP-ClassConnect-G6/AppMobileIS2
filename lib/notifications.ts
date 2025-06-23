import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

export async function getFCMPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions not granted');
    return null;
  }

  const { data: fcmToken } = await Notifications.getDevicePushTokenAsync();
  console.log('🔔 FCM Token:', fcmToken);
  return fcmToken;
}


// useEffect(() => {
  

//   return () => subscription.remove();
// }, []);