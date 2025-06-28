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
          href: null, // Ocultar la tab de Explore
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
      />
      <Tabs.Screen
        name="teacher-assignments"
        options={{
          title: "Mis Asignaciones",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="briefcase.fill" color={color} />
          ),
          href: isTeacher ? "/teacher-assignments" : null, // Solo mostrar para docentes
        }}
      />
      <Tabs.Screen
        name="mis-cursos"
        options={{
          title: "Mis Cursos",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="backpack.circle.fill" color={color} />
          ),
          href: session?.userType === 'student' ? "/mis-cursos" : null, // Solo mostrar para estudiantes
        }}
      />      <Tabs.Screen
        name="student-assignments"
        options={{
          title: "Mis Tareas/Exámenes",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="clipboard.fill" color={color} />
          ),
          href: session?.userType === 'student' ? "/student-assignments" as any : null, // Solo mostrar para estudiantes
        }}
      />
      <Tabs.Screen
        name="mis-feedbacks"
        options={{
          title: "Mis Feedbacks",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="chat.bubble.fill" color={color} />
          ),
          href: session?.userType === 'student' ? "/mis-feedbacks" as any : null, // Solo mostrar para estudiantes
        }}
      />
      <Tabs.Screen
        name="teacher-feedbacks"
        options={{
          title: "Feedbacks",
          tabBarIcon: ({ color }: { color: string }) => (
            <IconSymbol size={28} name="teacher.feedback.fill" color={color} />
          ),
          href: isTeacher ? "/teacher-feedbacks" as any : null, // Solo mostrar para teachers
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
      <Tabs.Screen
        name="chat-asistencia"
        options={{
          title: "Asistencia",
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="chatbubble-ellipses" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
