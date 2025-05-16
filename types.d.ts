// Declaración de tipos para Expo Router
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
    | "/(tabs)/edit-course"  // Añadida la nueva ruta
    | "/(tabs)/explore"
    | "/(tabs)/index"
    | "/(tabs)/profile"
    | "/+not-found";
}