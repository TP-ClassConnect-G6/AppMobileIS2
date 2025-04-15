import React, { useState } from "react";
import { StyleSheet, View, Alert } from "react-native";
import { Button, Text } from "react-native-paper";
import * as Location from "expo-location";
import { router } from "expo-router";

export default function RequestLocationScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequestLocation = async () => {
    try {
      // Solicitar permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permiso de ubicación denegado.");
        Alert.alert("Permiso denegado", "No podemos continuar sin tu ubicación.");
        return;
      }

      // Obtener la ubicación actual
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      Alert.alert("Ubicación obtenida", "Gracias por compartir tu ubicación.");
      // Redirigir al usuario al login
      router.push("./");
    } catch (error) {
      console.error("Error al obtener la ubicación:", error);
      setErrorMsg("No se pudo obtener la ubicación.");
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Solicitar Ubicación
      </Text>
      <Text style={styles.description}>
        Para personalizar tu experiencia, necesitamos tu ubicación.
      </Text>
      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
      <Button
        mode="contained"
        onPress={handleRequestLocation}
        style={styles.button}
      >
        Compartir mi ubicación
      </Button>
      <Button
        mode="text"
        onPress={() => router.push("./")} // Omitir y continuar
        style={styles.skipButton}
      >
        Omitir este paso
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
    marginBottom: 16,
  },
  description: {
    textAlign: "center",
    marginBottom: 24,
    fontSize: 16,
    color: "#555",
  },
  button: {
    marginTop: 16,
  },
  skipButton: {
    marginTop: 8,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 16,
  },
});