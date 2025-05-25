import React from "react";
import { StyleSheet, View, Text, ActivityIndicator, FlatList, RefreshControl, TouchableOpacity, Alert, Platform } from "react-native";
import { Card, Title, Paragraph, Chip, Divider, Button } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "@/contexts/session";
import CourseDetailModal from "@/components/CourseDetailModal";
import { Course } from "./course-list";
import { useNavigation } from "expo-router";
import * as Haptics from 'expo-haptics';

// Función para obtener los cursos favoritos desde la API
const fetchFavoriteCourses = async (userId: string): Promise<Course[]> => {
  if (!userId) return [];
  
  try {
    const params = { user_login: userId };
    const response = await courseClient.get('/favourite-courses', { params });
    
    // Verificar diferentes formatos posibles de respuesta
    let courses: Course[] = [];
    
    if (response.data && Array.isArray(response.data.courses)) {
      courses = response.data.courses;
    } else if (response.data && Array.isArray(response.data)) {
      courses = response.data;
    } else if (response.data && response.data.response && Array.isArray(response.data.response)) {
      courses = response.data.response;
    }
    
    // Marcar todos como favoritos
    return courses.map(course => ({
      ...course,
      isFavourite: true
    }));
  } catch (error) {
    console.error('Error al obtener cursos favoritos:', error);
    return [];
  }
};

// Función para eliminar un curso de favoritos
const removeCourseFromFavorites = async (courseId: string, userId: string): Promise<{ success: boolean, message: string }> => {
  if (!userId || !courseId) return { success: false, message: "Datos de usuario o curso faltantes" };
  
  try {
    // Intentamos eliminar mediante DELETE. Si el backend no soporta DELETE, podemos usar otro método
    const response = await courseClient.delete('/favourite-courses', { 
      data: { user_login: userId, course_id: courseId }
    });
    
    return { success: true, message: "Curso eliminado de favoritos" };
  } catch (error) {
    console.error('Error al eliminar curso de favoritos:', error);
    
    // Plan B: Si DELETE no está soportado, intentamos con un endpoint alternativo
    try {
      const response = await courseClient.post('/remove-favourite-course', { 
        user_login: userId, 
        course_id: courseId 
      });
      return { success: true, message: "Curso eliminado de favoritos" };
    } catch (secondError) {
      console.error('Error en segundo intento de eliminar favorito:', secondError);
      return { success: false, message: "No se pudo eliminar el curso de favoritos" };
    }
  }
};

// Componente principal para mostrar la lista de cursos favoritos
export default function FavoritesScreen() {
  const { session } = useSession();
  const isTeacher = session?.userType === "teacher" || session?.userType === "administrator";
  const queryClient = useQueryClient();

  // Estado para el modal de detalles del curso
  const [detailModalVisible, setDetailModalVisible] = React.useState(false);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(null);
  
  // Efecto para refrescar los favoritos cuando cambia la sesión
  React.useEffect(() => {
    if (session?.userId) {
      console.log('Refrescando lista de favoritos...');
      queryClient.invalidateQueries({ queryKey: ['favorite-courses'] });
    }
  }, [session?.userId, queryClient]);
  
  // Obtener la navegación para poder refrescar cuando se necesite
  const navigation = useNavigation();
  
  // Refrescar la lista cuando la pantalla obtiene el foco
  React.useEffect(() => {
    const refreshOnFocus = navigation.addListener('focus', () => {
      if (session?.userId) {
        console.log('Pantalla de favoritos enfocada, refrescando datos...');
        queryClient.invalidateQueries({ queryKey: ['favorite-courses'] });
      }
    });
    
    return refreshOnFocus;
  }, [navigation, queryClient, session?.userId]);

  // Configuración de la consulta de cursos favoritos
  const { data: favoriteCourses = [], isLoading, error, refetch } = useQuery({
    queryKey: ['favorite-courses'],
    queryFn: () => fetchFavoriteCourses(session?.userId || ''),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: 1000,
    // Solo habilitamos la consulta si hay una sesión activa
    enabled: !!session,
    // Asegurarnos de que siempre devolvemos un array
    select: (data) => Array.isArray(data) ? data : []
  });

  // Función para formatear fechas con manejo correcto de zonas horarias
  const formatDate = (dateString: string) => {
    try {
      // Al agregar 'T12:00:00' nos aseguramos de que la fecha se interprete en medio día
      // para evitar que el cambio de zona horaria afecte el día mostrado
      const dateWithoutTime = dateString.split('T')[0] + 'T12:00:00Z';
      const adjustedDate = new Date(dateWithoutTime);
      
      return format(adjustedDate, 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  // Estado para tracking de operaciones de eliminar favoritos en curso
  const [removingFavorites, setRemovingFavorites] = React.useState<Record<string, boolean>>({});

  // Función para quitar un curso de favoritos
  const handleRemoveFromFavorites = async (courseId: string) => {
    if (!session?.userId) return;
    
    // Proporcionar feedback táctil al pulsar el botón de favorito
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      "Quitar de favoritos",
      "¿Estás seguro que deseas quitar este curso de tus favoritos?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: async () => {
            // Proporcionar feedback táctil de confirmación
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            try {
              // Marcar como en proceso de eliminación
              setRemovingFavorites(prev => ({ ...prev, [courseId]: true }));
              
              const result = await removeCourseFromFavorites(courseId, session.userId);
              
              if (result.success) {
                // Actualizar la lista de favoritos
                queryClient.invalidateQueries({ queryKey: ['favorite-courses'] });
                
                // También invalidar la lista general de cursos para actualizar el estado de favoritos
                queryClient.invalidateQueries({ queryKey: ['courses'] });
                
                // Mensaje de confirmación sutil
                // En lugar de interrumpir con un Alert, podríamos usar un Toast o notificación menos intrusiva
              } else {
                Alert.alert("Error", result.message || "No se pudo quitar de favoritos");
              }
            } catch (error) {
              console.error("Error al quitar de favoritos:", error);
              Alert.alert("Error", "Ocurrió un problema al intentar quitar este curso de favoritos");
            } finally {
              // Quitar marca de eliminación en proceso
              setRemovingFavorites(prev => {
                const updated = { ...prev };
                delete updated[courseId];
                return updated;
              });
            }
          }
        }
      ]
    );
  };

  // Renderizar cada curso como una Card
  const renderCourseCard = ({ item }: { item: Course }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.titleContainer}>
          <Title style={{ flex: 1 }}>{item.course_name}</Title>
          <TouchableOpacity
            onPress={() => handleRemoveFromFavorites(item.course_id)}
            style={styles.favoriteButton}
            disabled={removingFavorites[item.course_id]}
          >
            {removingFavorites[item.course_id] ? (
              <ActivityIndicator size="small" color="#e91e63" style={{ paddingHorizontal: 8 }} />
            ) : (
              <MaterialCommunityIcons
                name="heart"
                size={24}
                color="#e91e63"
                style={{ paddingHorizontal: 8 }}
              />
            )}
          </TouchableOpacity>
        </View>
        <Paragraph>{item.description}</Paragraph>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Inicio:</Text>
            <Text style={styles.infoValue}>{formatDate(item.date_init)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fin:</Text>
            <Text style={styles.infoValue}>{formatDate(item.date_end)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Cupos:</Text>
            <Text style={styles.infoValue}>{item.quota}</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.footerContainer}>
          {item.category && (
            <Chip mode="outlined" style={styles.categoryChip}>
              {item.category}
            </Chip>
          )}

          {item.message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>{item.message}</Text>
            </View>
          )}
        </View>
      </Card.Content>

      <Card.Actions style={styles.cardActions}>
        {/* Botón de Más Información - siempre visible */}
        <Button 
          onPress={() => {
            setSelectedCourseId(item.course_id);
            setDetailModalVisible(true);
          }}
          style={{ width: '100%', marginBottom: 8 }}
          labelStyle={styles.buttonLabel}
          contentStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 12 }}
          icon="information-outline"
        >
          Más información
        </Button>
      </Card.Actions>
    </Card>
  );

  // Si el usuario no ha iniciado sesión
  if (!session) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="login" size={48} color="#999" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyText}>Inicia sesión para ver tus cursos favoritos</Text>
      </View>
    );
  }

  // Si está cargando, mostrar un indicador de carga
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando tus cursos favoritos...</Text>
      </View>
    );
  }

  // Si hay un error, mostrar un mensaje de error
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Error al cargar los cursos favoritos: {(error as Error).message}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Intentar nuevamente
        </Button>
      </View>
    );
  }

  // Renderizar la lista de cursos favoritos
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Mis Cursos Favoritos</Text>
        <MaterialCommunityIcons name="heart" size={28} color="#e91e63" />
      </View>
      
      <FlatList
        data={favoriteCourses}
        keyExtractor={(item) => item.course_id}
        renderItem={renderCourseCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="heart-outline" size={48} color="#999" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No tienes cursos favoritos aún</Text>
            <Text style={styles.hintText}>Busca cursos en la pestaña "Cursos" y marca el corazón para agregarlos a favoritos</Text>
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('course-list')}
              style={{ marginTop: 24 }}
              icon="magnify"
            >
              Explorar cursos
            </Button>
          </View>
        }
      />

      {/* Modal de detalles del curso */}
      <CourseDetailModal
        visible={detailModalVisible}
        onDismiss={() => setDetailModalVisible(false)}
        courseId={selectedCourseId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 20,
    gap: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 4,
  },
  infoContainer: {
    flexDirection: "row",
    marginTop: 10,
    flexWrap: "wrap",
  },
  infoItem: {
    marginRight: 20,
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    marginVertical: 10,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  categoryChip: {
    marginVertical: 5,
  },
  messageContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  messageText: {
    color: "#e67e22",
    fontStyle: "italic",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "500",
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    maxWidth: "80%",
  },
  cardActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    padding: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderRadius: 0,
    elevation: 0,
  },
  buttonLabel: {
    fontSize: 14,
    marginHorizontal: 4,
    paddingLeft: 8,
  },
  favoriteButton: {
    padding: 8,
  },
});
