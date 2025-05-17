import React, { useState } from "react";
import { StyleSheet, View, Alert } from "react-native";
import { Button, Text } from "react-native-paper";
import * as Location from "expo-location";
import { router } from "expo-router";
import axios from "axios";
import { useSession } from "@/contexts/session";
import { client } from "@/lib/http";

export default function RequestLocationScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequestLocation = async () => {

    try {
      // console.log("Headers de autorización:", client.defaults.headers.common["Authorization"]);
      // console.log("URL base del cliente:", client.defaults.baseURL);

      //Solicitar permisos de ubicación
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permiso de ubicación denegado.");
        Alert.alert("Permiso denegado", "No podemos continuar sin tu ubicación.");
        return;
      }
      //Obtener la ubicación actual
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      console.log("Ubicación actual:", currentLocation);
      console.log("Url completa:", client.defaults.baseURL + "/profile");

      // Obtener ciudad y país usando geocodificación inversa
      let locationString = "";
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        if (geocode.length > 0) {
          const { city, region, country } = geocode[0];
          locationString = [city, region, country].filter(Boolean).join(", ");
          console.log("Ubicación convertida:", locationString);
        }
      } catch (geocodeError) {
        console.error("Error al convertir coordenadas:", geocodeError);
        // Si falla la geocodificación, continuamos con las coordenadas
        locationString = `${currentLocation.coords.latitude}, ${currentLocation.coords.longitude}`;
      }
      
      const response = await client.patch("/profile", {
        location: locationString || "Ubicación desconocida"
      });

      router.push("/(tabs)");

    } catch (error) {
      console.error("Error al hacer el patch", error);
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
      
      {/* <Button
        mode="text"
        onPress={() => router.push("./")} // Omitir y continuar
        style={styles.skipButton}
      >
        Omitir este paso
      </Button> */}
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
  // skipButton: {
  //   marginTop: 8,
  // },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 16,
  },
});