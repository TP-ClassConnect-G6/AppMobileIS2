import React from "react";
import { StyleSheet, View, Text, Image, ScrollView } from "react-native";

const mockUserProfile = {
  avatar: "https://via.placeholder.com/100", // Imagen de ejemplo
  first_name: "John",
  last_name: "Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  address: "123 Main Street, Springfield",
};

export default function ProfileScreen() {
  const user = mockUserProfile; // Datos simulados

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: user.avatar }} style={styles.avatar} />
      <Text style={styles.name}>
        {user.first_name} {user.last_name}
      </Text>
      <Text style={styles.email}>{user.email}</Text>
      <Text style={styles.info}>Teléfono: {user.phone}</Text>
      <Text style={styles.info}>Dirección: {user.address}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: "gray",
    marginBottom: 16,
  },
  info: {
    fontSize: 14,
    color: "black",
    marginBottom: 8,
  },
});