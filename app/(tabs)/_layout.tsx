// import { Tabs } from "expo-router";
// import React, { useEffect, useState } from "react";
// import { Platform, Pressable } from "react-native";

// import { HapticTab } from "@/components/HapticTab";
// import { IconSymbol } from "@/components/ui/IconSymbol";
// import TabBarBackground from "@/components/ui/TabBarBackground";
// import { Colors } from "@/constants/Colors";
// import { useColorScheme } from "@/hooks/useColorScheme";
// import { useSession } from "@/contexts/session";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// // Create a client
// const queryClient = new QueryClient();

// // Provide the client to your App

// export default function TabLayout() {
//   const { signOut, session } = useSession();
//   const colorScheme = useColorScheme();
//   const [isTeacherOrAdmin, setIsTeacherOrAdmin] = useState(false);
  
//   // Verificar el tipo de usuario cuando cambia la sesión
//   useEffect(() => {
//     console.log("Validando tipo de usuario:", session?.userType);
//     const userIsTeacherOrAdmin = 
//       session?.userType === 'teacher' || 
//       session?.userType === 'admin';
    
//     setIsTeacherOrAdmin(userIsTeacherOrAdmin);
//   }, [session]);

//   console.log("setIsTeacherOrAdmin:", isTeacherOrAdmin);

//   return (
//     <QueryClientProvider client={queryClient}>
//       <Tabs
//         screenOptions={{
//           tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
//           headerShown: false,
//           tabBarButton: HapticTab,
//           tabBarBackground: TabBarBackground,
//           tabBarStyle: Platform.select({
//             ios: {
//               // Use a transparent background on iOS to show the blur effect
//               position: "absolute",
//             },
//             default: {},
//           }),
//         }}
//       >
//         <Tabs.Screen
//           name="index"
//           options={{
//             title: "Home",
//             tabBarIcon: ({ color }: { color: string }) => (
//               <IconSymbol size={28} name="house.fill" color={color} />
//             ),
//           }}
//         />
//         <Tabs.Screen
//           name="explore"
//           options={{
//             title: "Explore",
//             tabBarIcon: ({ color }: { color: string }) => (
//               <IconSymbol size={28} name="paperplane.fill" color={color} />
//             ),
//           }}
//         />
//         <Tabs.Screen
//           name="profile"
//           options={{
//             title: "Perfil",
//             tabBarIcon: ({ color }: { color: string }) => (
//               <IconSymbol size={28} name="person.fill" color={color} />
//             ),
//           }}
//         />
//         <Tabs.Screen
//           name="course-list"
//           options={{
//             title: "Cursos",
//             tabBarIcon: ({ color }: { color: string }) => (
//               <IconSymbol size={28} name="book.fill" color={color} />
//             ),
//           }}
//         />

//         <Tabs.Screen
//           name="create-course"
//           options={{
//             title: "Crear Curso",
//             tabBarIcon: ({ color }: { color: string }) => (
//               <IconSymbol size={28} name="book-plus.fill" color={color} />
//             ),
//           }}
//         />

//       </Tabs>
//     </QueryClientProvider>
//   );
// }

import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, View, Text } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSession } from "@/contexts/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient();

export default function TabLayout() {
  const { session } = useSession();
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Cuando tengamos la información de la sesión, ya no estamos cargando
    if (session !== undefined) {
      setIsLoading(false);
    }
  }, [session]);
  
  // Mostrar pantalla de carga mientras determinamos el tipo de usuario
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  // Si el usuario es profesor o admin, mostrar el layout completo
  if (session?.userType === 'teacher' || session?.userType === 'admin') {
    console.log("Tipo de usuario:", session.userType);
    return <TeacherTabLayout />;
  }

  console.log("Tipo de usuario:", session?.userType);
  // Si el usuario es estudiante, mostrar el layout limitado
  
  // Por defecto, mostrar el layout de estudiante
  return <StudentTabLayout />;
}

// Layout de pestañas para profesores y administradores
function TeacherTabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <QueryClientProvider client={queryClient}>
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
              <IconSymbol size={28} name="house.fill" color={color} />
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
        />
        <Tabs.Screen
          name="create-course"
          options={{
            title: "Crear Curso",
            tabBarIcon: ({ color }: { color: string }) => (
              <IconSymbol size={28} name="book-plus.fill" color={color} />
            ),
          }}
        />
      </Tabs>
    </QueryClientProvider>
  );
}

// Layout de pestañas para estudiantes
function StudentTabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <QueryClientProvider client={queryClient}>
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
              <IconSymbol size={28} name="house.fill" color={color} />
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
        />
        <Tabs.Screen
          name="create-course"
          options={{
            title: "Crear Curso",
            tabBarIcon: ({ color }: { color: string }) => (
              <IconSymbol size={28} name="book-plus.fill" color={color} />
            ),
            tabBarButton: () => null,
          }}
        />
      </Tabs>
    </QueryClientProvider>
  );
}