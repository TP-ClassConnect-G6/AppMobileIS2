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
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");
  const [verificationPin, setVerificationPin] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const theme = useTheme();

  const handleRegister = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setError(undefined);
    setSuccessMessage(undefined);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL; // Leer la URL desde .env
      if (!apiUrl) {
        throw new Error("API URL is not defined in .env");
      }      const response = await axios.post(`${apiUrl}/register`, {
        email,
        password,
      });      console.log("Registro exitoso:", response.data);

      // Mostrar mensaje de éxito y activar verificación por PIN
      setSuccessMessage(response.data.message);
      setRegisteredEmail(email);
      setShowPinVerification(true);

    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 409) {
          setError("El usuario ya está registrado.");
        } else if (e.code === "ECONNREFUSED") {
            setError("No se pudo conectar al servidor. Verifica tu conexión.");
        } else {
          setError(e.response?.data?.error || "Error en el registro");
        }
      } else {
        console.error("Error desconocido:", e);
        setError(e instanceof Error ? e.message : "Something went wrong");
      }    }
  };

  const handlePinVerification = async () => {
    if (!verificationPin || verificationPin.length !== 6) {
      setError("Por favor ingresa un PIN de 6 dígitos");
      return;
    }

    setError(undefined);
    setIsVerifying(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error("API URL is not defined in .env");
      }

      const response = await axios.post(`${apiUrl}/confirm_registration`, {
        email: registeredEmail,
        verification_pin: verificationPin,
      });

      console.log("Verificación exitosa:", response.data);
      setSuccessMessage("¡Registro completado exitosamente! Redirigiendo al login...");

      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push("/(login)");
      }, 2000);

    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 400) {
          setError("PIN de verificación incorrecto o expirado");
        } else if (e.response?.status === 404) {
          setError("Usuario no encontrado");
        } else if (e.code === "ECONNREFUSED") {
          setError("No se pudo conectar al servidor. Verifica tu conexión.");
        } else {
          setError(e.response?.data?.error || "Error en la verificación");
        }
      } else {
        console.error("Error desconocido:", e);
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    } finally {
      setIsVerifying(false);
    }
  };
  return (
    <View style={styles.container}>
      {!showPinVerification ? (
        // Formulario de registro
        <>
          <Text variant="headlineMedium" style={styles.title}>
            Register
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
          {successMessage && <Text style={styles.success}>{successMessage}</Text>}
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
        </>
      ) : (
        // Formulario de verificación por PIN
        <>
          <Text variant="headlineMedium" style={styles.title}>
            Verificar Email
          </Text>
          <Text style={styles.instructions}>
            Hemos enviado un código de verificación de 6 dígitos a:
          </Text>
          <Text style={styles.emailText}>{registeredEmail}</Text>
          <Text style={styles.instructions}>
            Por favor ingresa el código para completar tu registro:
          </Text>
          
          {error && <Text style={styles.error}>{error}</Text>}
          {successMessage && <Text style={styles.success}>{successMessage}</Text>}
          
          <TextInput
            label="Código de verificación (6 dígitos)"
            mode="outlined"
            style={styles.input}
            value={verificationPin}
            onChangeText={setVerificationPin}
            keyboardType="numeric"
            maxLength={6}
            placeholder="123456"
          />

          <Button
            mode="contained"
            onPress={handlePinVerification}
            loading={isVerifying}
            disabled={isVerifying || verificationPin.length !== 6}
            style={styles.button}
          >
            Verificar
          </Button>
          
          <Button
            mode="text"
            onPress={() => {
              setShowPinVerification(false);
              setSuccessMessage(undefined);
              setError(undefined);
              setVerificationPin("");
            }}
            style={styles.goBackButton}
          >
            Volver al registro
          </Button>
        </>
      )}
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
  },  success: {
    color: "green",
    textAlign: "center",
    marginBottom: 16,
  },
  instructions: {
    textAlign: "center",
    marginBottom: 12,
    fontSize: 16,
    color: "#666",
  },
  emailText: {
    textAlign: "center",
    marginBottom: 16,
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196f3",
  },
});