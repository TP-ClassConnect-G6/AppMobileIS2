import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSession } from "@/contexts/session";

export default function TabLayout() {
  const { session } = useSession();
  const colorScheme = useColorScheme();
  const isTeacher = session?.userType === 'teacher' || session?.userType === 'admin';
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: { position: "absolute" },
          default: {},
        }),
      }}
    >
      {/* Home - Pantalla principal */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      
      {/* Cursos - Lista y gestión de cursos */}
      <Tabs.Screen
        name="course-list"
        options={{
          title: "Cursos",
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="book" size={24} color={color} />
          ),
        }}
      />
      
      {/* Actividades - Tareas, exámenes, asignaciones */}
      <Tabs.Screen
        name="mis-cursos"
        options={{
          title: isTeacher ? "Gestión" : "Actividades",
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name={isTeacher ? "create" : "list"} size={24} color={color} />
          ),
        }}
      />
      
      {/* Chat - Asistencia AI */}
      <Tabs.Screen
        name="chat-asistencia"
        options={{
          title: "Asistente",
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="chatbubble-ellipses" size={24} color={color} />
          ),
        }}
      />
      
      {/* Perfil - Configuración y perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />

      {/* Pantallas ocultas - accesibles desde las pantallas principales */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Ocultar tab
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          href: null, // Ocultar tab
        }}
      />
      <Tabs.Screen
        name="create-course"
        options={{
          href: null, // Ocultar tab
        }}
      />
      <Tabs.Screen
        name="create-exam"
        options={{
          href: null, // Ocultar tab
        }}
      />
      <Tabs.Screen
        name="create-task"
        options={{
          href: null, // Ocultar tab
        }}
      />
      <Tabs.Screen
        name="teacher-assignments"
        options={{
          href: null, // Ocultar tab
        }}
      />
      <Tabs.Screen
        name="mis-feedbacks"
        options={{
          href: null, // Ocultar tab
        }}
      />
      <Tabs.Screen
        name="teacher-feedbacks"
        options={{
          href: null, // Ocultar tab
        }}
      />
      <Tabs.Screen
        name="notification-settings"
        options={{
          href: null, // Ocultar tab
        }}
      />
    </Tabs>
  );
}
