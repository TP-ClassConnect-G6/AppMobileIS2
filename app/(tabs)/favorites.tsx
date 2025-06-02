import React, { useState } from "react";
import { StyleSheet, View, Text, ActivityIndicator, FlatList, RefreshControl, TouchableOpacity, Alert, Platform } from "react-native";
import { Card, Title, Paragraph, Chip, Divider, Button, TextInput, Provider } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format, formatDate } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "@/contexts/session";
import CourseDetailModal from "@/components/CourseDetailModal";
import { Course } from "./course-list";
import { useNavigation } from "expo-router";
import * as Haptics from 'expo-haptics';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// Función para obtener los cursos favoritos desde la API con filtros
const fetchFavoriteCourses = async (
  userId: string, 
  filters?: { 
    course_name?: string; 
    category?: string; 
    academic_level?: string;
    content?: string;
    date_init?: Date | null; 
    date_end?: Date | null;
    page?: number;
    limit?: number;
  }
): Promise<{courses: Course[], pagination?: {total: number, totalPages: number, currentPage: number}}> => {
  if (!userId) return {courses: []};
  
  try {
    // Parámetros base
    const params: Record<string, string | number> = { user_login: userId };
    
    // Añadir filtros si existen
    if (filters) {
      if (filters.course_name) params.course_name = filters.course_name;
      if (filters.category) params.category = filters.category;
      if (filters.academic_level) params.academic_level = filters.academic_level;
      if (filters.content) params.content = filters.content;
      
      // Formatear fechas si existen
      if (filters.date_init) {
        params.date_init = formatDate(filters.date_init, 'yyyy-MM-dd');
      }
      if (filters.date_end) {
        params.date_end = formatDate(filters.date_end, 'yyyy-MM-dd');
      }
      
      // Paginación
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
    }
    
    // Realizar la petición con los filtros
    const response = await courseClient.get('/favourite-courses', { params });
    
    // Verificar diferentes formatos posibles de respuesta
    let courses: Course[] = [];
    let pagination = undefined;
    
    if (response.data && Array.isArray(response.data.courses)) {
      courses = response.data.courses;
      // Extraer información de paginación si existe
      if (response.data.total !== undefined) {
        pagination = {
          total: response.data.total,
          totalPages: response.data.totalPages || 1,
          currentPage: response.data.currentPage || 1
        };
      }
    } else if (response.data && Array.isArray(response.data)) {
      courses = response.data;
    } else if (response.data && response.data.response && Array.isArray(response.data.response)) {
      courses = response.data.response;
    }
    
    // Marcar todos como favoritos
    return {
      courses: courses.map(course => ({
        ...course,
        isFavourite: true
      })),
      pagination
    };
  } catch (error) {
    console.error('Error al obtener cursos favoritos:', error);
    return {courses: []};
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
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  
  // Estados para filtros y paginación
  const [filters, setFilters] = useState({ 
    course_name: '', 
    category: '',
    academic_level: '',
    content: '', 
    date_init: null as Date | null, 
    date_end: null as Date | null,
    page: 1,
    limit: 3
  });
  
  // Estado para los filtros actuales de búsqueda
  const [searchFilters, setSearchFilters] = useState({ 
    course_name: '', 
    category: '',
    academic_level: '',
    content: '', 
    date_init: null as Date | null, 
    date_end: null as Date | null,
    page: 1,
    limit: 3
  });
  
  // Estados para UI de los filtros
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  
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

  // Estado para metadatos de paginación
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    currentPage: 1
  });

  // Configuración de la consulta de cursos favoritos con filtros
  const { data: favoriteCoursesData = {courses: []}, isLoading, error, refetch } = useQuery({
    queryKey: ['favorite-courses', searchFilters],
    queryFn: async () => {
      const result = await fetchFavoriteCourses(session?.userId || '', searchFilters);
      // Procesar los datos de paginación después de la consulta
      if (result.pagination) {
        setPagination(result.pagination);
      }
      return result;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: 1000,
    // Solo habilitamos la consulta si hay una sesión activa
    enabled: !!session
  });
  
  // Extraer cursos del resultado
  const favoriteCourses = favoriteCoursesData.courses || [];

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

  // Función para cambiar página en la paginación
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setSearchFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  // Renderizar la lista de cursos favoritos
  return (
    <Provider>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Mis Cursos Favoritos</Text>
          <MaterialCommunityIcons name="heart" size={28} color="#e91e63" />
        </View>
        
        {/* Control para mostrar/ocultar filtros */}
        <View style={styles.headerControls}>
          <TouchableOpacity onPress={() => setFiltersVisible(!filtersVisible)} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {filtersVisible ? "Ocultar filtros ▲" : "Mostrar filtros ▼"}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Filtros para los cursos favoritos */}
        {filtersVisible && (
          <>
            <TextInput
              label="Buscar por nombre"
              value={filters.course_name}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, course_name: text }))}
              mode="outlined"
              style={{ marginBottom: 16 }}
            />

            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={filters.category}
                onValueChange={(text) => setFilters((prev) => ({ ...prev, category: text }))}
                style={styles.picker}
              >
                <Picker.Item label="Todas las categorías" value="" />
                <Picker.Item label="Art" value="Art" />
                <Picker.Item label="Science" value="Science" />
                <Picker.Item label="Technology" value="Technology" />
              </Picker>
            </View>
            
            <TextInput
              label="Nivel académico"
              value={filters.academic_level}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, academic_level: text }))}
              mode="outlined"
              style={{ marginBottom: 16 }}
            />
            
            <TextInput
              label="Buscar en contenido"
              value={filters.content}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, content: text }))}
              mode="outlined"
              style={{ marginBottom: 16 }}
            />

            <View style={styles.dateFilterContainer}>
              <Button mode="outlined" onPress={() => setShowStartDatePicker(true)}>
                {filters.date_init ? `Desde: ${format(filters.date_init, 'dd/MM/yyyy')}` : "Fecha de inicio"}
              </Button>
              <Button mode="outlined" onPress={() => setShowEndDatePicker(true)}>
                {filters.date_end ? `Hasta: ${format(filters.date_end, 'dd/MM/yyyy')}` : "Fecha de fin"}
              </Button>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={filters.date_init || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    const dateWithInitOfDay = new Date(selectedDate);
                    dateWithInitOfDay.setHours(0, 0, 0, 0);
                    setFilters((prev) => ({ ...prev, date_init: dateWithInitOfDay }));
                  }
                }}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={filters.date_end || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    const dateWithEndOfDay = new Date(selectedDate);
                    dateWithEndOfDay.setHours(23, 59, 59, 999);
                    setFilters((prev) => ({ ...prev, date_end: dateWithEndOfDay }));
                  }
                }}
              />
            )}

            <Button
              mode="contained"
              onPress={() => {
                setSearchFilters({...filters, page: 1}); // Reset a la página 1 al aplicar nuevos filtros
              }}
              style={{ marginTop: 16 }}
            >
              Buscar
            </Button>

            <Button
              mode="outlined"
              onPress={() => {
                const resetFilters = {
                  course_name: '',
                  category: '',
                  academic_level: '',
                  content: '',
                  date_init: null,
                  date_end: null,
                  page: 1,
                  limit: 10
                };
                setFilters(resetFilters);
                setSearchFilters(resetFilters);
              }}
              style={{ marginTop: 16, marginBottom: 16 }}
            >
              Limpiar Filtros
            </Button>
          </>
        )}
      
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
          ListFooterComponent={
            favoriteCourses.length > 0 ? (
              <View style={styles.paginationContainer}>
                <Button
                  mode="outlined"
                  disabled={pagination.currentPage <= 1}
                  onPress={() => handlePageChange(pagination.currentPage - 1)}
                  style={styles.paginationButton}
                  icon="chevron-left"
                >
                  Anterior
                </Button>
                <Text style={styles.paginationText}>
                  Página {pagination.currentPage} de {pagination.totalPages || 1}
                </Text>
                <Button
                  mode="outlined"
                  disabled={!pagination.totalPages || pagination.currentPage >= pagination.totalPages}
                  onPress={() => handlePageChange(pagination.currentPage + 1)}
                  style={styles.paginationButton}
                  icon="chevron-right"
                  contentStyle={{ flexDirection: 'row-reverse' }}
                >
                  Siguiente
                </Button>
              </View>
            ) : null
          }
        />

      {/* Modal de detalles del curso */}
      <CourseDetailModal
        visible={detailModalVisible}
        onDismiss={() => setDetailModalVisible(false)}
        courseId={selectedCourseId}
      />
    </View>
    </Provider>
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
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dropdownContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  paginationButton: {
    marginHorizontal: 8,
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
