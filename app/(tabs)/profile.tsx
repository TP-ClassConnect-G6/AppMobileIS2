import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View, Text, Image, ActivityIndicator, Alert, TouchableOpacity, Platform, FlatList } from "react-native";
import { Button, TextInput, Divider } from "react-native-paper";
import { client } from "@/lib/http";
import { useSession } from "@/contexts/session";
import { useForm, Controller } from "react-hook-form";
import * as ImagePicker from 'expo-image-picker';
import { searchLocationByText, formatLocation, NominatimResult } from "@/lib/nominatim";

// Definición del tipo para el perfil de usuario
type UserProfile = {
  user_id?: string;
  name?: string;
  email: string;
  bio?: string;
  phone_number?: string;
  location?: string; // Cambiado a string en lugar de objeto con coordenadas
  user_type: string;
  avatar?: string;
};

// Tipo para los valores del formulario
type FormValues = {
  name: string;
  email: string;
  bio: string;
  phone_number: string;
  location: string;
  user_type: string;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [showLocationResults, setShowLocationResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const { session } = useSession();

  // Configurar React Hook Form
  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      phone_number: "",
      location: "",
      user_type: "student",
    },
  });

  // Función para cargar el perfil del usuario
  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await client.get("/profile");
      console.log("Perfil recibido:", response.data);
      setProfile(response.data);
      setError(null);

      // Una vez que tenemos el perfil, intentamos cargar la foto
      fetchProfilePhoto();
    } catch (err) {
      console.error("Error al obtener el perfil:", err);
      setError("No se pudo cargar el perfil. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener la foto de perfil
  const fetchProfilePhoto = async () => {
    if (!session?.token) return;

    setLoadingPhoto(true);
    try {
      // Hacemos una petición para obtener la foto de perfil con responseType: 'arraybuffer'
      console.log("Headers de autorización:", `Bearer ${session.token}`);
      const response = await client.get("/profile/photo", {
        responseType: "arraybuffer",
        headers: {
          "Authorization": `Bearer ${session.token}`
        }
      });

      // Convertimos los datos binarios a base64 usando una función compatible con React Native
      const base64String = arrayBufferToBase64(response.data);
      const base64Image = `data:image/jpeg;base64,${base64String}`;
      setProfilePhotoUrl(base64Image);
      console.log("Foto de perfil cargada correctamente");
    } catch (err: any) {
      console.error("Error al obtener la foto de perfil:", err);
      // Si es un 404, simplemente no hay foto, no mostramos error
      if (err.response && err.response.status !== 404) {
        setError("No se pudo cargar la foto de perfil.");
      }
    } finally {
      setLoadingPhoto(false);
    }
  };

  // Función auxiliar para convertir ArrayBuffer a base64 en React Native
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Usamos btoa que está disponible en React Native para convertir a base64
    return btoa(binary);
  };

  // Función para actualizar el perfil del usuario
  const onSubmit = async (data: FormValues) => {
    setLoading(true);

    // Convertir los datos del formulario al formato esperado por la API
    const updatedProfile: Partial<UserProfile> = {
      name: data.name,
      email: data.email,
      bio: data.bio,
      phone_number: data.phone_number,
      user_type: data.user_type,
      location: data.location,
    };

    console.log("Enviando actualización:", updatedProfile);

    try {
      const response = await client.patch("/profile", updatedProfile);
      console.log("Respuesta de actualización:", response.data);
      setProfile(response.data);
      setEditing(false);
      setError(null);
      Alert.alert("Éxito", "Perfil actualizado correctamente");
    } catch (err) {
      console.error("Error al actualizar el perfil:", err);
      setError("No se pudo actualizar el perfil. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Función para ejecutar la búsqueda con el texto actual
  const executeSearch = useCallback(async (text: string) => {
    if (text.length < 3) {
      setSearchResults([]);
      setShowLocationResults(false);
      setSearchingLocations(false);
      return;
    }

    setSearchingLocations(true);
    setShowLocationResults(true);
    
    try {
      const results = await searchLocationByText(text);
      // Usamos directamente el texto que recibimos para verificar
      // ya que searchQuery podría haber cambiado durante la búsqueda
      setSearchResults(results);
    } catch (error) {
      console.error('Error buscando ubicaciones:', error);
      setError('Error al buscar ubicaciones. Intente nuevamente.');
    } finally {
      setSearchingLocations(false);
    }
  }, []);

  // Función para manejar la entrada de texto con debounce
  const handleLocationSearch = (text: string) => {
    setSearchQuery(text);
    
    // Si el texto está vacío o es muy corto, limpiamos los resultados inmediatamente
    if (text.length < 3) {
      setSearchResults([]);
      setShowLocationResults(false);
      setSearchingLocations(false);
      
      // Cancelamos cualquier búsqueda pendiente
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
      return;
    }
    
    // Mostrar que estamos realizando una búsqueda
    setShowLocationResults(true);
    
    // Cancelamos cualquier búsqueda pendiente anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Configuramos un nuevo timeout para debounce (300ms)
    const timeout = setTimeout(() => {
      executeSearch(text);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  // Función para seleccionar una ubicación de los resultados
  const handleLocationSelect = (location: NominatimResult, onChange: (value: string) => void) => {
    const formattedLocationString = formatLocation(location);
    onChange(formattedLocationString);
    setShowLocationResults(false);
    setSearchQuery(formattedLocationString);
  };

  // Función para limpiar la ubicación actual
  const clearLocation = (onChange: (value: string) => void) => {
    onChange('');
    setSearchQuery('');
    setSearchResults([]);
    setShowLocationResults(false);
    setSearchingLocations(false);
    
    // Cancelar cualquier búsqueda pendiente
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
  };

  // Función para cancelar la edición y limpiar los campos
  const cancelEditing = () => {
    // Limpiar cualquier búsqueda pendiente
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
    
    reset();
    setSearchQuery('');
    setSearchResults([]);
    setShowLocationResults(false);
    setSearchingLocations(false);
    setEditing(false);
  };

  // Función para seleccionar una imagen de la galería
  const selectImage = async () => {
    try {
      // Solicitar permisos para acceder a la biblioteca de fotos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso para acceder a tus fotos');
        return;
      }
      
      // Lanzar el selector de imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        uploadProfilePhoto(selectedImage.uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // Función para tomar una foto con la cámara
  const takePhoto = async () => {
    try {
      // Solicitar permisos para acceder a la cámara
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso para acceder a la cámara');
        return;
      }
      
      // Lanzar la cámara
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const takenPhoto = result.assets[0];
        uploadProfilePhoto(takenPhoto.uri);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  // Función para subir la foto de perfil al servidor
  const uploadProfilePhoto = async (imageUri: string) => {
    if (!session?.token) {
      Alert.alert('Error', 'Necesitas iniciar sesión para subir una foto');
      return;
    }
    
    setUploadingPhoto(true);
    setError(null);
    
    try {
      // Crear un objeto FormData para enviar la imagen
      const formData = new FormData();
      
      // Obtener el nombre y el tipo de archivo de la URI
      const fileNameMatch = imageUri.match(/[^\/]+$/);
      const fileName = fileNameMatch ? fileNameMatch[0] : 'profile_photo.jpg';
      
      // Determinar el tipo de archivo basado en la extensión
      const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      // Añadir el archivo al FormData
      formData.append('file', {
        uri: imageUri,
        name: fileName,
        type: fileType,
      } as any);  // Necesitamos el 'as any' por el tipado de React Native
      
      console.log('Enviando foto:', formData);
      
      // Enviar la solicitud POST al servidor
      const response = await client.post('/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${session.token}`
        }
      });
      
      console.log('Respuesta del servidor:', response.data);
      
      // Actualizar la foto de perfil en la UI
      // Para mostrar la imagen recién subida, podemos usar la URI local temporalmente
      setProfilePhotoUrl(imageUri);
      
      // También recargamos la foto del servidor para asegurarnos de mostrar la versión más reciente
      setTimeout(() => {
        fetchProfilePhoto();
      }, 1000);
      
      Alert.alert('Éxito', 'Foto de perfil actualizada correctamente');
    } catch (error: any) {
      console.error('Error al subir la foto:', error);
      
      let errorMessage = 'No se pudo subir la foto. Por favor, intenta nuevamente.';
      
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = 'Formato de imagen no válido. Intenta con otra imagen.';
        } else if (error.response.status === 401) {
          errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente.';
        }
      }
      
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setUploadingPhoto(false);
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
        phone_number: profile.phone_number || "",
        location: profile.location || "",
        user_type: profile.user_type || "student",
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

  // Renderizador para el contenido del perfil
  const renderProfileContent = () => {
    return (
      <>
        {loading && <ActivityIndicator style={styles.loadingOverlay} size="small" color="#0000ff" />}

        <View style={styles.avatarContainer}>
          <TouchableOpacity 
            onPress={() => {
              Alert.alert(
                'Foto de perfil',
                '¿Cómo quieres subir tu foto?',
                [
                  {
                    text: 'Cancelar',
                    style: 'cancel',
                  },
                  {
                    text: 'Seleccionar de la galería',
                    onPress: selectImage,
                  },
                  {
                    text: 'Tomar una foto',
                    onPress: takePhoto,
                  },
                ]
              );
            }}
            disabled={uploadingPhoto}
          >
            {loadingPhoto || uploadingPhoto ? (
              <View style={[styles.avatar, styles.avatarLoading]}>
                <ActivityIndicator size="small" color="#0000ff" />
              </View>
            ) : (
              <>
                <Image
                  source={{
                    uri: profilePhotoUrl || profile?.avatar || "https://via.placeholder.com/100",
                  }}
                  style={styles.avatar}
                />
                <View style={styles.editPhotoButton}>
                  <Text style={styles.editPhotoText}>📷</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {!editing ? (
          // Modo de visualización - muestra todos los campos
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile?.name || "Usuario"}</Text>
            <Text style={styles.email}>{profile?.email || session?.userId}</Text>

            {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

            {profile?.phone_number && <Text style={styles.info}>Teléfono: {profile.phone_number}</Text>}

            {profile?.location && <Text style={styles.info}>Ubicación: {profile.location}</Text>}

            <Text style={styles.info}>Tipo de usuario: {profile?.user_type || session?.userType}</Text>

            <Button mode="contained" onPress={() => setEditing(true)} style={styles.editButton}>
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

            {/* Campo de Teléfono */}
            <Controller
              control={control}
              name="phone_number"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Teléfono"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              )}
            />

            {/* Campos para la ubicación - Usando Nominatim API */}
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, value } }) => (
                <View style={styles.autocompleteContainer}>
                  <TextInput
                    label="Buscar ubicación"
                    value={searchQuery !== '' ? searchQuery : value}
                    onChangeText={text => {
                      handleLocationSearch(text);
                      onChange(text); // Actualizar también el valor del formulario
                    }}
                    style={styles.input}
                    placeholder="Escribe al menos 3 caracteres para buscar"
                    right={
                      (searchQuery || value) ? (
                        <TextInput.Icon 
                          icon="close" 
                          onPress={() => clearLocation(onChange)} 
                          forceTextInputFocus={false}
                        />
                      ) : undefined
                    }
                  />
                  
                  {searchingLocations && (
                    <View style={styles.loadingIndicator}>
                      <ActivityIndicator size="small" color="#0000ff" />
                    </View>
                  )}
                  
                  {showLocationResults && searchResults.length > 0 && (
                    <View style={styles.resultsContainer}>
                      <FlatList
                        nestedScrollEnabled
                        data={searchResults}
                        keyExtractor={(item) => item.place_id.toString()}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.resultItem}
                            onPress={() => handleLocationSelect(item, onChange)}
                          >
                            <Text style={styles.resultText}>
                              {item.display_name}
                            </Text>
                            <Divider />
                          </TouchableOpacity>
                        )}
                        style={styles.resultsList}
                      />
                    </View>
                  )}
                  
                  {showLocationResults && searchResults.length === 0 && searchQuery.length >= 3 && !searchingLocations && (
                    <View style={styles.noResults}>
                      <Text style={styles.noResultsText}>No se encontraron resultados</Text>
                    </View>
                  )}
                </View>
              )}
            />

            <View style={styles.buttonGroup}>
              <Button mode="outlined" onPress={cancelEditing} style={styles.cancelButton}>
                Cancelar
              </Button>

              <Button mode="contained" onPress={handleSubmit(onSubmit)} style={styles.saveButton}>
                Guardar
              </Button>
            </View>
          </View>
        )}

        {error && <Text style={styles.errorMessage}>{error}</Text>}
      </>
    );
  };

  // Usamos FlatList en lugar de ScrollView para evitar el error de VirtualizedLists anidadas
  return (
    <FlatList
      data={[{ key: 'profile' }]}
      renderItem={() => renderProfileContent()}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.container}
      ListHeaderComponent={null}
      ListFooterComponent={null}
    />
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
    position: "absolute",
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
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 20,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarLoading: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  editPhotoText: {
    color: 'white',
    fontSize: 14,
  },
  profileInfo: {
    alignItems: "center",
    width: "100%",
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
    width: "80%",
  },
  editForm: {
    width: "100%",
    paddingHorizontal: 10,
  },
  input: {
    marginBottom: 15,
    backgroundColor: "#f5f5f5",
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  locationInput: {
    flex: 1,
    marginRight: 5,
    backgroundColor: "#f5f5f5",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 10,
  },
  userTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  userTypeButton: {
    flex: 1,
    marginRight: 5,
  },
  // Estilos para el componente de autocompletado
  autocompleteContainer: {
    flex: 0,
    position: 'relative',
    marginBottom: 15,
    zIndex: 1,
  },
  resultsContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    zIndex: 10,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderRadius: 4,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 10,
    top: 15,
  },
  noResults: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'white',
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
  },
});
