// // import { CenteredView } from "@/components/views/CenteredView";
// // import { router } from "expo-router";
// // import { Button, Text, View } from "react-native";

// // export default function RegisterScreen() {
// //   return (
// //     <CenteredView>
// //       <Text>Under Construction </Text>
// //       <Button
// //         title="Go Back"
// //         onPress={() => {
// //           router.back();
// //         }}
// //       />
// //     </CenteredView>
// //   );
// // }
// import { CenteredView } from "@/components/views/CenteredView";
// import { useSession } from "@/contexts/session";
// import { AxiosError } from "axios";
// import { router } from "expo-router";
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
//   confirmPassword: z.string().min(6),
// }).refine((data) => data.password === data.confirmPassword, {
//   message: "Passwords must match",
//   path: ["confirmPassword"],
// });

// export default function RegisterScreen() {
//   const {
//     control,
//     handleSubmit,
//     formState: { errors, isLoading },
//   } = useForm({
//     resolver: zodResolver(zodSchema),
//     defaultValues: {
//       email: "",
//       password: ""
//     },
//   });

//   const [error, setError] = useState<string | undefined>(undefined);
//   //const { signUpWithPassword } = useSession();

//   const handleRegister = async ({
//     email,
//     password,
//   }: {
//     email: string;
//     password: string;
//   }) => {
//     try {
//       const response = await fetch("https://usuariosis2-production.up.railway.app/register", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           email: email,
//           password: password,
//         }),
//       });
  
//       const data = await response.json();
  
//       if (!response.ok) {
//         // Si el servidor responde con error, lo lanzamos
//         throw new Error(data.error || 'Error en el registro');
//       }
  
//       console.log('Registro exitoso:', data);
//     } catch (error) {
//       console.error('Ocurrió un error:', error);
//     }

//     try {
//       console.log(email, password);
//       //await signUpWithPassword(email, password);


//       router.push("./login");
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
//       <Text style={styles.text}>Register</Text>
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
//           title={isLoading ? "Loading..." : "Register"}
//           onPress={handleSubmit(handleRegister)}
//         />
//       </View>
//       <Button
//         title="Go Back"
//         onPress={() => {
//           router.back();
//         }}
//       />
//     </CenteredView>
//   );
// }


//CON FETCH

// import { CenteredView } from "@/components/views/CenteredView";
// import { router } from "expo-router";
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

// export default function RegisterScreen() {
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

//   const handleRegister = async ({
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

//       const response = await fetch(`${apiUrl}/register`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           email,
//           password,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Error en el registro");
//       }

//       console.log("Registro exitoso:", data);
//       router.push("./login"); // Redirigir al login
//     } catch (e) {
//       console.error("Ocurrió un error:", e);
//       setError(e instanceof Error ? e.message : "Something went wrong");
//     }
//   };

//   return (
//     <CenteredView>
//       <Text style={styles.text}>Register</Text>
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
//           title={isLoading ? "Loading..." : "Register"}
//           onPress={handleSubmit(handleRegister)}
//         />
//       </View>
//       <Button
//         title="Go Back"
//         onPress={() => {
//           router.back();
//         }}
//       />
//     </CenteredView>
//   );
// }


//CON AXIOS
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

// export default function RegisterScreen() {
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

//   const handleRegister = async ({
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

//       const response = await axios.post(`${apiUrl}/register`, {
//         email,
//         password,
//       });

//       console.log("Registro exitoso:", response.data);
//       router.push("./"); // Redirigir al login
//     } catch (e) {
//       console.error("Ocurrió un error:", e);
//       setError(
//         axios.isAxiosError(e) && e.response
//           ? e.response.data.error || "Error en el registro"
//           : "Something went wrong"
//       );
//     }
//   };

//   return (
//     <CenteredView>
//       <Text style={styles.text}>Register</Text>
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
//           title={isLoading ? "Loading..." : "Register"}
//           onPress={handleSubmit(handleRegister)}
//         />
//       </View>
//       <Button
//         title="Go Back"
//         onPress={() => {
//           router.back();
//         }}
//       />
//     </CenteredView>
//   );
// }

import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput, HelperText, useTheme } from "react-native-paper";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { router } from "expo-router";

const zodSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function RegisterScreen() {
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
  const theme = useTheme();

  const handleRegister = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL; // Leer la URL desde .env
      if (!apiUrl) {
        throw new Error("API URL is not defined in .env");
      }

      const response = await axios.post(`${apiUrl}/register`, {
        email,
        password,
      });

      console.log("Registro exitoso:", response.data);
      router.push("./"); // Redirigir al login
    } catch (e) {
      //console.error("Ocurrió un error:", e);
      setError(
        axios.isAxiosError(e) && e.response
          ? e.response.data.error || "Error en el registro"
          : "Something went wrong"
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Register
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
        onPress={handleSubmit(handleRegister)}
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
      >
        Register
      </Button>
      <Button
        mode="text"
        onPress={() => router.back()}
        style={styles.goBackButton}
      >
        Go Back
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
  goBackButton: {
    marginTop: 8,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 16,
  },
});