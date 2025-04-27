import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { client } from "@/lib/http";
import { useSession } from "@/contexts/session";

// Definición del tipo para el perfil de usuario
type UserProfile = {
  avatar?: string;
  name?: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  user_type: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [updatedProfile, setUpdatedProfile] = useState<Partial<UserProfile>>({});
  const { session } = useSession();

  // Función para cargar el perfil del usuario
  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await client.get('/profile');
      setProfile(response.data);
      setError(null);
    } catch (err) {
      console.error('Error al obtener el perfil:', err);
      setError('No se pudo cargar el perfil. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar el perfil del usuario
  const updateUserProfile = async () => {
    
    setLoading(true);
    try {
      const response = await client.patch('/profile', updatedProfile);
      setProfile(response.data);
      setEditing(false);
      setError(null);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (err) {
      console.error('Error al actualizar el perfil:', err);
      setError('No se pudo actualizar el perfil. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar el perfil al montar el componente
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Manejar cambios en los campos de edición
   
  const handleInputChange = (field: keyof UserProfile, value: string) => {
    // Mejor explicado: 
    // Crear una copia del perfil actualizado
    //  const newUpdatedProfile = Object.assign({}, updatedProfile);
      
    //  // Actualizar el campo específico con el nuevo valor
    //  if (field === 'name') {
    //    newUpdatedProfile.name = value;
    //  } else if (field === 'phone') {
    //    newUpdatedProfile.phone = value;
    //  } else if (field === 'bio') {
    //    newUpdatedProfile.bio = value;
    //  }

    //Si la sintaxis hubiese dejado: 
    //const newUpdatedProfile = { ...updatedProfile};
    //newUpdatedProfile.field= value;

    // Forma sr je:
    const newUpdatedProfile = { ...updatedProfile, [field]: value };
    setUpdatedProfile(newUpdatedProfile);
  };

  // Si está cargando, mostrar un indicador de carga
  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  // Si hay un error, mostrar un mensaje de error
  if (error && !profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={fetchUserProfile} style={styles.retryButton}>
          Reintentar
        </Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading && <ActivityIndicator style={styles.loadingOverlay} size="small" color="#0000ff" />}
      
      <Image 
        source={{ uri: profile?.avatar || 'https://via.placeholder.com/100' }} 
        style={styles.avatar} 
      />
      
      {!editing ? (
        // Modo de visualización
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{profile?.name || 'Usuario'}</Text>
          <Text style={styles.email}>{profile?.email || session?.userId}</Text>
          
          {profile?.phone && <Text style={styles.info}>Teléfono: {profile.phone}</Text>}
          
          {profile?.bio && <Text style={styles.bio}>Bio: {profile.bio}</Text>}
          
          {profile?.location && (
            <Text style={styles.info}>
              Ubicación: {profile.location.latitude.toFixed(4)}, {profile.location.longitude.toFixed(4)}
            </Text>
          )}
          
          <Text style={styles.info}>Tipo de usuario: {profile?.user_type || session?.userType}</Text>
          
          <Button 
            mode="contained" 
            onPress={() => {
              setUpdatedProfile({});
              setEditing(true);
            }}
            style={styles.editButton}
          >
            Editar Perfil
          </Button>
        </View>
      ) : (
        // Modo de edición
        <View style={styles.editForm}>
          <TextInput
            label="Nombre"
            value={updatedProfile.name !== undefined ? updatedProfile.name : profile?.name || ''}
            onChangeText={(text) => handleInputChange('name', text)}
            style={styles.input}
          />
          
          <TextInput
            label="Teléfono"
            value={updatedProfile.phone !== undefined ? updatedProfile.phone : profile?.phone || ''}
            onChangeText={(text) => handleInputChange('phone', text)}
            style={styles.input}
            keyboardType="phone-pad"
          />
          
          <TextInput
            label="Bio"
            value={updatedProfile.bio !== undefined ? updatedProfile.bio : profile?.bio || ''}
            onChangeText={(text) => handleInputChange('bio', text)}
            style={styles.input}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.buttonGroup}>
            <Button 
              mode="outlined" 
              onPress={() => setEditing(false)}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            
            <Button 
              mode="contained" 
              onPress={updateUserProfile}
              style={styles.saveButton}
            >
              Guardar
            </Button>
          </View>
        </View>
      )}
      
      {error && <Text style={styles.errorMessage}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  errorMessage: {
    color: "red",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  email: {
    fontSize: 16,
    color: "gray",
    marginBottom: 20,
    textAlign: "center",
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  bio: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 20,
  },
  editButton: {
    marginTop: 20,
    width: '80%',
  },
  editForm: {
    width: '100%',
    paddingHorizontal: 10,
  },
  input: {
    marginBottom: 15,
    backgroundColor: "#f5f5f5",
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    marginRight: 5,
  },
  saveButton: {
    flex: 1,
    marginLeft: 5,
  },
});