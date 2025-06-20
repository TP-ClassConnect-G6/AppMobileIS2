// Declaración de tipos para Expo Router
import { PathConfigMap } from 'expo-router/build/types';

declare module 'expo-router' {
  // Extender las rutas conocidas para incluir edit-course
  export type AppRoutePaths = 
    | "/"
    | "/_sitemap"
    | "/(login)"
    | "/(login)/register"
    | "/register"
    | "/(login)/requestLocation"
    | "/(tabs)"
    | "/(tabs)/course-list"
    | "/(tabs)/create-course"
    | "/(tabs)/create-exam"
    | "/(tabs)/create-task"
    | "/(tabs)/edit-course"  // Añadida la nueva ruta
    | "/(tabs)/teacher-assignments"  // Nueva pestaña para docentes
    | "/(tabs)/favorites"
    | "/(tabs)/mis-cursos"
    | "/(tabs)/notification-settings"
    | "/(tabs)/explore"
    | "/(tabs)/index"
    | "/(tabs)/profile"
    | "/favorites"
    | "/create-course"
    | "/create-exam"
    | "/create-task"
    | "/teacher-assignments"
    | "/mis-cursos"
    | "/notification-settings"
    | "/+not-found";
}