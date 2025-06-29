import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
            <MaterialCommunityIcons name="home" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="send" size={28} color={color} />
          ),
          href: null, // Ocultar la tab de Explore
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="account" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="course-list"
        options={{
          title: "Cursos",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="book-open" size={28} color={color} />
          ),
        }}
      />      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoritos",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="star" size={28} color={color} />
          ),
          href: !isTeacher ? "/favorites" : null, // Solo mostrar para estudiantes
        }}
      />
      <Tabs.Screen
        name="create-course"
        options={{
          title: "Crear Curso",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="book-plus" size={28} color={color} />
          ),
          href: isTeacher ? "/create-course" : null,
        }}
      />
      <Tabs.Screen
        name="create-exam"
        options={{
          title: "Crear Examen",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="file-document-edit" size={28} color={color} />
          ),
          href: isTeacher ? "/create-exam" : null,
        }}
      />
      <Tabs.Screen
        name="create-task"
        options={{
          title: "Crear Tarea",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="clipboard-check" size={28} color={color} />
          ),
          href: isTeacher ? "/create-task" : null,
        }}
      />
      <Tabs.Screen
        name="teacher-assignments"
        options={{
          title: "Mis Asignaciones",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="briefcase" size={28} color={color} />
          ),
          href: isTeacher ? "/teacher-assignments" : null, // Solo mostrar para docentes
        }}
      />
      <Tabs.Screen
        name="mis-cursos"
        options={{
          title: "Mis Cursos",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="school" size={28} color={color} />
          ),
          href: session?.userType === 'student' ? "/mis-cursos" : null, // Solo mostrar para estudiantes
        }}
      />      <Tabs.Screen
        name="student-assignments"
        options={{
          title: "Mis Tareas/Exámenes",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="clipboard-text" size={28} color={color} />
          ),
          href: session?.userType === 'student' ? "/student-assignments" as any : null, // Solo mostrar para estudiantes
        }}
      />
      <Tabs.Screen
        name="mis-feedbacks"
        options={{
          title: "Mis Feedbacks",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="comment-text" size={28} color={color} />
          ),
          href: session?.userType === 'student' ? "/mis-feedbacks" as any : null, // Solo mostrar para estudiantes
        }}
      />
      <Tabs.Screen
        name="mis-calificaciones"
        options={{
          title: "Mis Calificaciones",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="trophy" size={28} color={color} />
          ),
          href: session?.userType === 'student' ? "/mis-calificaciones" as any : null, // Solo mostrar para estudiantes
        }}
      />
      <Tabs.Screen
        name="teacher-feedbacks"
        options={{
          title: "Feedbacks",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="comment-text-multiple" size={28} color={color} />
          ),
          href: isTeacher ? "/teacher-feedbacks" as any : null, // Solo mostrar para teachers
        }}
      />
      <Tabs.Screen
        name="notification-settings"
        options={{
          title: "Notificaciones",
          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="bell" size={28} color={color} />
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
