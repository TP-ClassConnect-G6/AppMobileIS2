// import { CenteredView } from "@/components/views/CenteredView";
// import { useSession } from "@/contexts/session";
// import { AxiosError } from "axios";
// import { Link, router } from "expo-router";
// import { useState } from "react";
// import { Controller, useForm } from "react-hook-form";
// import { Button, StyleSheet, Text, TextInput, View } from "react-native";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";

// const styles = StyleSheet.create({
//   text: {
//     fontSize: 24,
//     marginBottom: 16,
//   },
//   link: {
//     fontStyle: "italic",
//     marginTop: 16,
//     color: "#007BFF",
//     textDecorationLine: "underline",
//   },
//   input: {
//     width: "100%",
//     padding: 0,
//     margin: 0,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 4,
//   },
//   helperText: {
//     width: "100%",
//     fontSize: 12,
//     color: "#666",
//     marginBottom: 8,
//     textAlign: "left",
//   },
//   error: {
//     borderWidth: 1,
//     borderColor: "red",
//     borderRadius: 4,
//   },
//   button: {
//     width: "100%",
//     padding: 12,
//     backgroundColor: "#007BFF",
//     borderRadius: 4,
//     alignItems: "center",
//   },
// });

// const zodSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// export default function LoginScreen() {
//   const {
//     control,
//     handleSubmit,
//     formState: { errors, isLoading },
//   } = useForm({
//     resolver: zodResolver(zodSchema),
//     defaultValues: {
//       email: "",
//       password: "",
//     },
//   });

//   const [error, setError] = useState<string | undefined>(undefined);
//   const { signInWithPassword } = useSession();

//   const handleLogin = async ({
//     email,
//     password,
//   }: {
//     email: string;
//     password: string;
//   }) => {
//     try {
//       console.log(email, password);
//       await signInWithPassword(email, password);
//     } catch (e) {
//       setError(
//         e instanceof AxiosError && e.response
//           ? e.response.data.error
//           : "Something went wrong"
//       );
//     }
//   };
//   return (
//     <CenteredView>
//       <Text style={styles.text}>Login</Text>
//       {error && <Text style={{ backgroundColor: "red" }}>{error}</Text>}
//       <View style={{ width: "100%" }}>
//         <Controller
//           control={control}
//           render={({ field: { onChange, onBlur, value } }) => (
//             <TextInput
//               style={[styles.input, errors?.email ? styles.error : {}]}
//               placeholder="Username..."
//               editable={!isLoading}
//               onBlur={onBlur}
//               onChangeText={onChange}
//               value={value}
//             />
//           )}
//           name="email"
//         />
//         <Text style={styles.helperText}>{errors?.email?.message}</Text>
//       </View>

//       <View style={{ width: "100%" }}>
//         <Controller
//           control={control}
//           render={({ field: { onChange, onBlur, value } }) => (
//             <TextInput
//               style={[styles.input, errors?.password ? styles.error : {}]}
//               placeholder="Password..."
//               editable={!isLoading}
//               onBlur={onBlur}
//               onChangeText={onChange}
//               value={value}
//               secureTextEntry
//             />
//           )}
//           name="password"
//         />
//         <Text style={styles.helperText}>{errors?.password?.message}</Text>
//       </View>
//       <View style={{ width: "100%" }}>
//         <Button
//           color="green"
//           disabled={isLoading}
//           title={isLoading ? "Loading..." : "Login"}
//           onPress={handleSubmit(handleLogin)}
//         />
//       </View>
//       <Link href="./register">Register</Link>
//     </CenteredView>
//   );
// }
// import { CenteredView } from "@/components/views/CenteredView";
// import { router } from "expo-router";
// import { useState } from "react";
// import { Controller, useForm } from "react-hook-form";
// import { Button, StyleSheet, Text, TextInput, View } from "react-native";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import axios from "axios";

// const styles = StyleSheet.create({
//   text: {
//     fontSize: 24,
//     marginBottom: 16,
//   },
//   input: {
//     width: "100%",
//     padding: 0,
//     margin: 0,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 4,
//   },
//   helperText: {
//     width: "100%",
//     fontSize: 12,
//     color: "#666",
//     marginBottom: 8,
//     textAlign: "left",
//   },
//   error: {
//     borderWidth: 1,
//     borderColor: "red",
//     borderRadius: 4,
//   },
// });

// const zodSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// export default function LoginScreen() {
//   const {
//     control,
//     handleSubmit,
//     formState: { errors, isLoading },
//   } = useForm({
//     resolver: zodResolver(zodSchema),
//     defaultValues: {
//       email: "",
//       password: "",
//     },
//   });

//   const [error, setError] = useState<string | undefined>(undefined);

//   const handleLogin = async ({
//     email,
//     password,
//   }: {
//     email: string;
//     password: string;
//   }) => {
//     try {
//       const apiUrl = process.env.EXPO_PUBLIC_API_URL; // Leer la URL desde .env
//       if (!apiUrl) {
//         throw new Error("API URL is not defined in .env");
//       }

//       const response = await axios.post(`${apiUrl}/login`, {
//         email,
//         password,
//       });

//       console.log("Inicio de sesión exitoso:", response.data);

//       // Redirigir al área principal de la app
//       router.push("/(tabs)");
//     } catch (e) {
//       //console.error("Ocurrió un error:", e);
//       setError(
//         axios.isAxiosError(e) && e.response
//           ? e.response.data.error || "Error en el inicio de sesión"
//           : "Something went wrong"
//       );
//     }
//   };

//   return (
//     <CenteredView>
//       <Text style={styles.text}>Login</Text>
//       {error && <Text style={{ backgroundColor: "red" }}>{error}</Text>}
//       <View style={{ width: "100%" }}>
//         <Controller
//           control={control}
//           render={({ field: { onChange, onBlur, value } }) => (
//             <TextInput
//               style={[styles.input, errors?.email ? styles.error : {}]}
//               placeholder="Email..."
//               editable={!isLoading}
//               onBlur={onBlur}
//               onChangeText={onChange}
//               value={value}
//             />
//           )}
//           name="email"
//         />
//         <Text style={styles.helperText}>{errors?.email?.message}</Text>
//       </View>

//       <View style={{ width: "100%" }}>
//         <Controller
//           control={control}
//           render={({ field: { onChange, onBlur, value } }) => (
//             <TextInput
//               style={[styles.input, errors?.password ? styles.error : {}]}
//               placeholder="Password..."
//               editable={!isLoading}
//               onBlur={onBlur}
//               onChangeText={onChange}
//               value={value}
//               secureTextEntry
//             />
//           )}
//           name="password"
//         />
//         <Text style={styles.helperText}>{errors?.password?.message}</Text>
//       </View>
//       <View style={{ width: "100%" }}>
//         <Button
//           color="green"
//           disabled={isLoading}
//           title={isLoading ? "Loading..." : "Login"}
//           onPress={handleSubmit(handleLogin)}
//         />
//       </View>
//       <View style={{ width: "100%" }}>
//         <Button
//           color="blue"
//           title="Go to Register"
//           onPress={() => {
//             router.push("/register");
//           }}
//         />
//       </View>
//     </CenteredView>
//   );
// }


















// import React, { useState } from "react";
// import { StyleSheet, View } from "react-native";
// import { Button, Text, TextInput, HelperText, useTheme } from "react-native-paper";
// import { Controller, useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import axios from "axios";
// import { router } from "expo-router";

// const zodSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

// export default function LoginScreen() {
//   const {
//     control,
//     handleSubmit,
//     formState: { errors, isLoading },
//   } = useForm({
//     resolver: zodResolver(zodSchema),
//     defaultValues: {
//       email: "",
//       password: "",
//     },
//   });

//   const [error, setError] = useState<string | undefined>(undefined);
//   const theme = useTheme();

//   const handleLogin = async ({
//     email,
//     password,
//   }: {
//     email: string;
//     password: string;
//   }) => {
//     try {
//       const apiUrl = process.env.EXPO_PUBLIC_API_URL; // Leer la URL desde .env
//       if (!apiUrl) {
//         throw new Error("API URL is not defined in .env");
//       }

//       const response = await axios.post(`${apiUrl}/login`, {
//         email,
//         password,
//       });

//       console.log("Inicio de sesión exitoso:", response.data);
//       router.push("/(tabs)"); // Redirigir al área principal de la app
//     } catch (e) {
//       //console.error("Ocurrió un error:", e);
//       setError(
//         axios.isAxiosError(e) && e.response
//           ? e.response.data.error || "Error en el inicio de sesión"
//           : "Something went wrong"
//       );
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text variant="headlineMedium" style={styles.title}>
//         Login
//       </Text>
//       {error && <Text style={styles.error}>{error}</Text>}

//       <Controller
//         control={control}
//         name="email"
//         render={({ field: { onChange, onBlur, value } }) => (
//           <TextInput
//             label="Email"
//             mode="outlined"
//             style={styles.input}
//             onBlur={onBlur}
//             onChangeText={onChange}
//             value={value}
//             error={!!errors.email}
//           />
//         )}
//       />
//       <HelperText type="error" visible={!!errors.email}>
//         {errors.email?.message}
//       </HelperText>

//       <Controller
//         control={control}
//         name="password"
//         render={({ field: { onChange, onBlur, value } }) => (
//           <TextInput
//             label="Password"
//             mode="outlined"
//             secureTextEntry
//             style={styles.input}
//             onBlur={onBlur}
//             onChangeText={onChange}
//             value={value}
//             error={!!errors.password}
//           />
//         )}
//       />
//       <HelperText type="error" visible={!!errors.password}>
//         {errors.password?.message}
//       </HelperText>

//       <Button
//         mode="contained"
//         onPress={handleSubmit(handleLogin)}
//         loading={isLoading}
//         disabled={isLoading}
//         style={styles.button}
//       >
//         Login
//       </Button>
//       <Button
//         mode="text"
//         onPress={() => router.push("/register")}
//         style={styles.registerButton}
//       >
//         Go to Register
//       </Button>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     padding: 16,
//     backgroundColor: "#fff",
//   },
//   title: {
//     textAlign: "center",
//     marginBottom: 24,
//   },
//   input: {
//     marginBottom: 16,
//   },
//   button: {
//     marginTop: 16,
//   },
//   registerButton: {
//     marginTop: 8,
//   },
//   error: {
//     color: "red",
//     textAlign: "center",
//     marginBottom: 16,
//   },
// });



import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput, HelperText, useTheme } from "react-native-paper";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "@/contexts/session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";

const zodSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function LoginScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isLoading },
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [error, setError] = useState<string | undefined>(undefined);
  const { signInWithPassword } = useSession();
  const theme = useTheme();

  const handleLogin = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    try {
      await signInWithPassword(email, password);
    } catch (e) {
      //console.error("Ocurrió un error:", e);
      setError(
        e instanceof Error ? e.message : "Something went wrong"
      );
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await WebBrowser.openBrowserAsync(
        "https://usuariosis2-production.up.railway.app/login/google"
      );
      console.log("Google Login Result:", result);
    } catch (e) {
      console.error("Error during Google login:", e);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      const result = await WebBrowser.openBrowserAsync(
        "https://usuariosis2-production.up.railway.app/login/facebook"
      );
      console.log("Facebook Login Result:", result);
    } catch (e) {
      console.error("Error during Facebook login:", e);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Login
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Email"
            mode="outlined"
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={!!errors.email}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.email}>
        {errors.email?.message}
      </HelperText>

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Password"
            mode="outlined"
            secureTextEntry
            style={styles.input}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={!!errors.password}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.password}>
        {errors.password?.message}
      </HelperText>

      <Button
        mode="contained"
        onPress={handleSubmit(handleLogin)}
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
      >
        Login
      </Button>

      <Button
        mode="contained"
        onPress={handleGoogleLogin}
        style={[styles.button, { backgroundColor: "#DB4437" }]}
      >
        Login with Google
      </Button>

      <Button
        mode="contained"
        onPress={handleFacebookLogin}
        style={[styles.button, { backgroundColor: "#4267B2" }]}
      >
        Login with Facebook
      </Button>
      
      <Button
        mode="text"
        onPress={() => router.push("/register")}
        style={styles.registerButton}
      >
        Go to Register
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
  registerButton: {
    marginTop: 8,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 16,
  },
});