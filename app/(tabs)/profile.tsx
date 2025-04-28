import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Image, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { client } from "@/lib/http";
import { useSession } from "@/contexts/session";
import { useForm, Controller } from "react-hook-form";


// Definición del tipo para el perfil de usuario
type UserProfile = {
  user_id?: string;
  name?: string;
  email: string;
  bio?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  user_type: string;
  avatar?: string;
}

// Tipo para los valores del formulario
type FormValues = {
  name: string;
  email: string;
  bio: string;
  latitude: string;
  longitude: string;
  user_type: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const { session } = useSession();

  // Configurar React Hook Form
  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      latitude: "",
      longitude: "",
      user_type: "student"
    }
  });

  // Función para cargar el perfil del usuario
  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await client.get('/profile');
      console.log("Perfil recibido:", response.data);
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
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    
    // Convertir los datos del formulario al formato esperado por la API
    const updatedProfile: Partial<UserProfile> = {
      name: data.name,
      email: data.email,
      bio: data.bio,
      user_type: data.user_type,
      location: {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude)
      }
    };
    
    console.log("Enviando actualización:", updatedProfile);
    
    try {
      const response = await client.patch('/profile', updatedProfile);
      console.log("Respuesta de actualización:", response.data);
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

  // Actualizar los valores predeterminados del formulario cuando se carga el perfil
  useEffect(() => {
    if (profile && editing) {
      reset({
        name: profile.name || "",
        email: profile.email || "",
        bio: profile.bio || "",
        latitude: profile.location ? String(profile.location.latitude) : "",
        longitude: profile.location ? String(profile.location.longitude) : "",
        user_type: profile.user_type || "student"
      });
    }
  }, [profile, editing, reset]);


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
        // Modo de visualización - muestra todos los campos
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{profile?.name || 'Usuario'}</Text>
          <Text style={styles.email}>{profile?.email || session?.userId}</Text>
          
          {profile?.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
          
          {profile?.location && (
            <Text style={styles.info}>
              Ubicación: {profile.location.latitude.toFixed(4)}, {profile.location.longitude.toFixed(4)}
            </Text>
          )}
          
          <Text style={styles.info}>Tipo de usuario: {profile?.user_type || session?.userType}</Text>
          
          <Button 
            mode="contained" 
            onPress={() => setEditing(true)}
            style={styles.editButton}
          >
            Editar Perfil
          </Button>
        </View>
      ) : (
        // Modo de edición usando React Hook Form
        <View style={styles.editForm}>
          {/* Campo de Nombre */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Nombre"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
              />
            )}
          />
          
          {/* Campo de Email
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Correo Electrónico"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                keyboardType="email-address"
              />
            )}
          /> */}
          
          {/* Campo de Biografía */}
          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Biografía"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                multiline
                numberOfLines={3}
              />
            )}
          />
          
          {/* Campos para la ubicación */}
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <View style={styles.locationContainer}>
            <Controller
              control={control}
              name="latitude"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Latitud"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  style={styles.locationInput}
                  keyboardType="numeric"
                />
              )}
            />
            <Controller
              control={control}
              name="longitude"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Longitud"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  style={styles.locationInput}
                  keyboardType="numeric"
                />
              )}
            />
          </View>
          
          
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
              onPress={handleSubmit(onSubmit)}
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
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  locationInput: {
    flex: 1,
    marginRight: 5,
    backgroundColor: "#f5f5f5",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userTypeButton: {
    flex: 1,
    marginRight: 5,
  },
});