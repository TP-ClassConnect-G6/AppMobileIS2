import React, { useEffect } from "react";
import { useSession } from "@/contexts/session";
import { Redirect, router } from "expo-router";
import { View, Text, ActivityIndicator } from "react-native";
import { getFCMPushToken } from "@/lib/notifications";

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

export default function App() {
  const { session } = useSession();

  // Usamos useEffect para navegar después de que el componente esté montado
  useEffect(() => {
    console.log("INICIO")

    //Obtener token notificaciones.
    getFCMPushToken().then(token => {
      if (token) {
        console.log("FCM Token:", token);
      }
    });

    let subscription: Notifications.Subscription | undefined;

    // Pequeño delay para asegurar que el Root Layout está montado
    const timer = setTimeout(() => {
      if (session) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(login)");
      }

      subscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log("Notificación recibida:", response);
        const data = response.notification.request.content.data;

        if (data.url) {
          Linking.openURL(data.url); // This will trigger deep link navigation
        }
      });

    }, 100);
    
    return () => clearTimeout(timer);
  }, [session]);

  // Mostramos un indicador de carga mientras se decide la ruta
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={{ marginTop: 10 }}>Cargando...</Text>
    </View>
  );
}