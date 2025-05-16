import React, { useState, useEffect } from "react";
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
import * as LocalAuthentication from 'expo-local-authentication';

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
  const { signInWithPassword, signInWithGoogle, signInWithBiometric } = useSession();
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
        await signInWithGoogle();
    } catch (e) {
      console.error("Error en el inicio de sesión con Google:", e);
      setError("Error al iniciar sesión con Google");
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

  const handleBiometricAuth = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setError("Este dispositivo no soporta autenticación biométrica");
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setError("No hay huellas digitales registradas en este dispositivo");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autenticar con huella digital",
        cancelLabel: "Cancelar",
        disableDeviceFallback: true,
      });

      if (result.success) {
        console.log("Autenticación biométrica exitosa");
        const resultSession = await signInWithBiometric();
        if (!resultSession) {
          setError("Autenticación biométrica fallida");
        }
      } else {
        setError("Autenticación biométrica fallida");
      }
    } catch (error) {
      console.error(error);
      setError("Error en la autenticación biométrica");
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
        mode="contained"
        onPress={handleBiometricAuth}
        style={[styles.button, { backgroundColor: "#009688" }]}
        icon="fingerprint"
      >
        Login with Fingerprint
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