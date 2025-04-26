import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput, HelperText, useTheme } from "react-native-paper";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "@/contexts/session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import axios from "axios";
import * as Linking from 'expo-linking';

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
      // setError(
      //   e instanceof Error ? e.message : "Something went wrong"
      // );
      if (axios.isAxiosError(e)) {
        if (e.code === "ECONNREFUSED") {
          setError("No se pudo conectar al servidor. Verifica tu conexión.");
        } else if (e.response?.status === 401) {
          setError("Credenciales inválidas. Inténtalo de nuevo.");
        } else if (e.response?.status === 404) {
          setError("El usuario no está registrado. Por favor, regístrate.");
        } else {
          setError(e.response?.data?.error || "Error en el inicio de sesión");
        }
      } else {
        setError("Something went wrong");
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {

      const redirectUri = Linking.createURL('redirect'); // Ej: myapp://redirect

      const loginUrl = `https://usuariosis2-production.up.railway.app/login/google?redirect_uri=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);

      console.log('despues', result);

      // Luego, si result.url tiene el token, podés procesarlo así:
      if (result.type === 'success' && result.url) {
        const params = new URLSearchParams(result.url.split('?')[1]);
        const token = params.get('token');
        const expiresIn = params.get('expires_in');
        const userId = params.get('user_id');
        const userType = params.get('user_type');
        // Guardá lo que necesites en storage o contexto
      }

      
      if (result.type === 'success' && result.url) {
        //const urlParams = new URLSearchParams(new URL(result.url).search);
        const params = new URLSearchParams(result.url.split("?")[1]);
        const token = params.get("token");

        if (!token) {
          throw new Error("No se recibió un token JWT en la redirección");
        }
        router.push("/(tabs)");
   
      } else {
        console.warn("El login fue cancelado o no se recibió el token.");
      }

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