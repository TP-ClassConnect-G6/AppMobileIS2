import { router } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import { Button } from "react-native-paper";
import { CenteredView } from "@/components/views/CenteredView";
import { useSession } from "@/contexts/session";

export default function HomeScreen() {
  const { signOut } = useSession();
  return (
    <CenteredView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.welcomeText}>Bienvenido a ClassConnect</Text>
        
        <Button
          mode="contained"
          icon="account"
          onPress={() => router.push("/(tabs)/profile")}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Mi Perfil
        </Button>
        
        <View style={styles.spacer} />
        
        <Button
          mode="outlined"
          icon="logout"
          onPress={signOut}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Cerrar Sesión
        </Button>
      </View>
    </CenteredView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    marginBottom: 50,
  },
  button: {
    marginVertical: 8,
    borderRadius: 8,
  },
  buttonContent: {
    height: 50,
  },
  spacer: {
    height: 16,
  },
});