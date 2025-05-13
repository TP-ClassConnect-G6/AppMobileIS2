import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput, HelperText, useTheme, Dialog, Portal } from "react-native-paper";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "@/contexts/session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import axios from "axios";
import * as Linking from 'expo-linking';
import { client } from "@/lib/http";

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
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { signInWithPassword, signInWithGoogle } = useSession();
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

  // Y luego llamarla directamente:
  const handleGoogleLogin = async () => {
    try {
        await signInWithGoogle();
    } catch (e) {
      // Manejo de errores
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

  // Función para solicitar cambio de contraseña
  const handlePasswordReset = async () => {
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      setError("Por favor ingresa un correo electrónico válido");
      return;
    }
    
    setIsSubmitting(true);
    setError(undefined);
    
    try {
      const response = await client.post('/change_password/request_email', {
        email: recoveryEmail
      });
      
      console.log("Respuesta del servidor:", response.data);
      setResetEmailSent(true);
      
      // Mostrar el mensaje exacto que envía el backend
      setSuccessMessage(response.data?.message || "If the email exists, a password change link has been sent.");
      
      // Ya no cerramos el diálogo automáticamente
      // El usuario debe cerrarlo manualmente
      setIsSubmitting(false);
      
    } catch (error) {
      console.error("Error al solicitar cambio de contraseña:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          setError("El correo electrónico no está registrado en el sistema");
        } else {
          setError(error.response?.data?.message || "Error al solicitar cambio de contraseña");
        }
      } else {
        setError("Error de conexión. Inténtalo más tarde");
      }
      setIsSubmitting(false);
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
        mode="text"
        onPress={() => setForgotPasswordVisible(true)}
        style={styles.forgotPasswordButton}
      >
        Olvidé mi contraseña
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

      <Portal>
        <Dialog visible={forgotPasswordVisible} onDismiss={() => setForgotPasswordVisible(false)}>
          <Dialog.Title>Recuperar contraseña</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Email de recuperación"
              mode="outlined"
              value={recoveryEmail}
              onChangeText={setRecoveryEmail}
              style={styles.input}
            />
            {resetEmailSent && (
              <Text style={styles.successMessage}>
                {successMessage}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setForgotPasswordVisible(false)}>Cancelar</Button>
            <Button
              onPress={handlePasswordReset}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Enviar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  forgotPasswordButton: {
    marginTop: 8,
  },
  registerButton: {
    marginTop: 8,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 16,
  },
  successMessage: {
    color: "green",
    textAlign: "center",
    marginTop: 16,
  },
});