---
marp: true
---

# 0. Distribución de aplicaciones

1. Web sites: Arquitectura browser -> server

   1. Multi Page Application
      - static html folder
      - code-splitting: multi bundle, lazy/on-demand loading
      - server side rendering
   2. Single Page Application
      - single bundle: 200MB
   3. Web Assembly

---

2. Progressive Web Application (PWA) (browser without top bar)
3. Native Apps (compiles target device platform/runtime)
   - Android
   - IOS
   - Windows
   - GNU/Linux: Wayland, x11, Xorg, etc
4. Hybrid Apps (correr web site en un app nativa)
   1. Embedded Browser: WebView, Apache Cordova
   2. JS Runtime + Native Components: ionic, react-native, nativescript, lynxjs, (¿flutter?)

---

# 1. React Native

Esta todo en los sitios oficiales:

1. [Basics](https://reactnative.dev/docs/getting-started)
2. [Styling](https://reactnative.dev/docs/style)
3. [New Architecture](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here)
4. [expo](https://docs.expo.dev/get-started/create-a-project/)

Extras:

1. [Mozilla Docs - js](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
2. [Mozilla Docs - css](https://developer.mozilla.org/en-US/docs/Web/CSS)
3. [Mozilla Docs - html](https://developer.mozilla.org/en-US/docs/Web/HTML)

---

# 2. Expo & EAS

1. [Expo Application Services](https://expo.dev/eas)
2. [Expo](https://expo.dev)
3. [Expo Docs](https://docs.expo.dev)

---

# 3. Hands On

---

# 3.1 Proyecto generado

- Android, Web
- File Based Routing
- Deep Linking

# 3.2 Navegación y Login

- se agrega (login) para las pantallas de login
- (login)/\_layout.tsx uso de `<Slot>`
- (login)/index.tsx navegación con Link, y router
- Formularios: loading, validation, error handling
- File Base Routing siempre entre por index

# 3.3 Axios

- npm i axios
- .env
- pegarle al backend en localhost
- axios.create http.ts
- manejo de errores con axios
- npm i lodash @types/lodash (por pinto)

# 3.4 Local Storage

- npx expo install expo-secure-store
  [secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/)
  alternativa (sin encriptar): @react-native-async-storage/async-storage
  ver que se actualizo app.json
- mostrar como entra a la app y pasa a la home
- mostrar como limpiar "cache y storage data"
- getItem vs async?

# 3.5 Session Context

- Context for session
- SplashScreen & initial load
- Route Protection

# 3.6 React Query

- minimal

# 3.7 React Hook Form
