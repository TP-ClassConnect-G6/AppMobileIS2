import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Text, Switch, Card, Title, Button, Divider } from "react-native-paper";
import { useSession } from "@/contexts/session";
import { NotificationPreferences, getUserNotificationPreferences, updateUserNotificationPreferences } from "@/lib/notifications-config";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function NotificationSettingsScreen() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    fetchNotificationPreferences();
  }, []);

  const fetchNotificationPreferences = async () => {
    if (!session?.token) {
      Alert.alert("Error", "Debes iniciar sesión para configurar las notificaciones");
      return;
    }

    try {
      setLoading(true);
      const prefs = await getUserNotificationPreferences(session.token);
      setPreferences(prefs);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      Alert.alert(
        "Error", 
        "No se pudieron cargar las preferencias de notificación. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!session?.token || !preferences) {
      return;
    }

    try {
      setSaving(true);
      await updateUserNotificationPreferences(session.token, preferences);
      Alert.alert("Éxito", "Preferencias de notificación actualizadas correctamente");
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      Alert.alert(
        "Error", 
        "No se pudieron guardar las preferencias de notificación. Por favor, intenta nuevamente."
      );
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (
    category: keyof NotificationPreferences,
    type: "email" | "push",
    value: boolean
  ) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      [category]: {
        ...preferences[category],
        [type]: value,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando preferencias...</Text>
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se pudieron cargar las preferencias</Text>
        <Button mode="contained" onPress={fetchNotificationPreferences}>
          Intentar nuevamente
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Title style={styles.title}>Configuración de Notificaciones</Title>
      <Text style={styles.description}>
        Personaliza cómo deseas recibir notificaciones de la aplicación.
      </Text>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Title style={styles.categoryTitle}>Categoría</Title>
            <View style={styles.typeContainer}>
              <View style={styles.typeColumn}>
                <MaterialCommunityIcons name="email-outline" size={24} color="#555" />
                <Text style={styles.typeText}>Email</Text>
              </View>
              <View style={styles.typeColumn}>
                <MaterialCommunityIcons name="bell-outline" size={24} color="#555" />
                <Text style={styles.typeText}>Push</Text>
              </View>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Sesión */}
          <View style={styles.preferenceRow}>
            <View style={styles.categoryContainer}>
              <MaterialCommunityIcons name="account-outline" size={24} color="#555" />
              <Text style={styles.categoryText}>Sesión</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={preferences.session.email}
                onValueChange={(value) => updatePreference("session", "email", value)}
              />
              <Switch
                value={preferences.session.push}
                onValueChange={(value) => updatePreference("session", "push", value)}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Cursos */}
          <View style={styles.preferenceRow}>
            <View style={styles.categoryContainer}>
              <MaterialCommunityIcons name="school-outline" size={24} color="#555" />
              <Text style={styles.categoryText}>Cursos</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={preferences.courses.email}
                onValueChange={(value) => updatePreference("courses", "email", value)}
              />
              <Switch
                value={preferences.courses.push}
                onValueChange={(value) => updatePreference("courses", "push", value)}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Foro */}
          <View style={styles.preferenceRow}>
            <View style={styles.categoryContainer}>
              <MaterialCommunityIcons name="forum-outline" size={24} color="#555" />
              <Text style={styles.categoryText}>Foro</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={preferences.foro.email}
                onValueChange={(value) => updatePreference("foro", "email", value)}
              />
              <Switch
                value={preferences.foro.push}
                onValueChange={(value) => updatePreference("foro", "push", value)}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Permisos */}
          <View style={styles.preferenceRow}>
            <View style={styles.categoryContainer}>
              <MaterialCommunityIcons name="key-outline" size={24} color="#555" />
              <Text style={styles.categoryText}>Permisos</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={preferences.permissions.email}
                onValueChange={(value) => updatePreference("permissions", "email", value)}
              />
              <Switch
                value={preferences.permissions.push}
                onValueChange={(value) => updatePreference("permissions", "push", value)}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Otros */}
          <View style={styles.preferenceRow}>
            <View style={styles.categoryContainer}>
              <MaterialCommunityIcons name="dots-horizontal" size={24} color="#555" />
              <Text style={styles.categoryText}>Otros</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={preferences.other.email}
                onValueChange={(value) => updatePreference("other", "email", value)}
              />
              <Switch
                value={preferences.other.push}
                onValueChange={(value) => updatePreference("other", "push", value)}
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        style={styles.saveButton}
        onPress={handleSavePreferences}
        loading={saving}
        disabled={saving}
      >
        Guardar preferencias
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  typeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 120,
  },
  typeColumn: {
    alignItems: "center",
    width: 50,
  },
  typeText: {
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryText: {
    fontSize: 16,
    marginLeft: 12,
  },
  switchContainer: {
    flexDirection: "row",
    width: 120,
    justifyContent: "space-between",
  },
  saveButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
});
