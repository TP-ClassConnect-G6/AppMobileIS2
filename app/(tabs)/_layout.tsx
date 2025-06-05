import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
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
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="house.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="course-list"
        options={{
          title: "Cursos",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="book.fill" color={color} />
          ),
        }}
      />      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoritos",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="star.circle.fill" color={color} />
          ),
          href: !isTeacher ? "/favorites" : null, // Solo mostrar para estudiantes
        }}
      />
      <Tabs.Screen
        name="create-course"
        options={{
          title: "Crear Curso",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="book-plus.fill" color={color} />
          ),
          href: isTeacher ? "/create-course" : null,
        }}
      />
      <Tabs.Screen
        name="create-exam"
        options={{
          title: "Crear Examen",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="doc.text.fill" color={color} />
          ),
          href: isTeacher ? "/create-exam" : null,
        }}
      />
      <Tabs.Screen
        name="create-task"
        options={{
          title: "Crear Tarea",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="checklist.fill" color={color} />
          ),
          href: isTeacher ? "/create-task" : null,
        }}
      />      <Tabs.Screen
        name="mis-cursos"
        options={{
          title: "Mis Cursos",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="backpack.circle.fill" color={color} />
          ),
          href: session?.userType === 'student' ? "/mis-cursos" : null, // Solo mostrar para estudiantes
        }}
      />
      <Tabs.Screen
        name="notification-settings"
        options={{
          title: "Notificaciones",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="bell.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
