import React, { useState } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { Card, Title, Paragraph, Chip, Divider, Button, Provider } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format, formatDate } from "date-fns";
import { es } from "date-fns/locale";
import { TextInput } from "react-native-paper";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSession } from "@/contexts/session";
import { router } from "expo-router";
import EditCourseModal from "@/components/EditCourseModal";
import CourseDetailModal from "@/components/CourseDetailModal";

// Definición del tipo para los cursos
export type Course = {
  course_id: string;
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  category: string | null;
  academic_level?: string;
  objetives?: string | string[];
  syllabus?: string;
  content?: string;
  required_courses?: string[] | { course_name: string }[];
  instructor_profile?: string;
  modality?: string;
  schedule?: { day: string; time: string }[];
  message?: string;
  isFavourite?: boolean;
};

// Tipo para la respuesta de registro en un curso
type CourseRegistrationResponse = {
  response: {
    registration_id: string;
    course_name: string;
    registration_date: string;
    course_date_init: string;
  }
};

// Tipo para la respuesta al marcar un curso como favorito
type FavouriteCourseResponse = {
  message: string;
};

// Función para obtener los cursos desde la API
const fetchCourses = async (filters?: { course_name?: string; category?: string; date_init?: Date | null; date_end?: Date | null }, userId?: string, showOnlyFavorites: boolean = false): Promise<Course[]> => {
  const params: Record<string, string> = {};

  if (filters?.course_name) {
    params.course_name = filters.course_name;
  }
  if (filters?.category) {
    params.category = filters.category;
  }
  if (filters?.date_init) {
    params.date_init = formatDate(filters.date_init, 'yyyy-MM-dd');
  }
  if (filters?.date_end) {
    params.date_end = formatDate(filters.date_end, 'yyyy-MM-dd');
  }
  console.log("userId", userId);

  if (userId) {
    params.user_login = userId;  
  }
  
  try {
    let response;
    let favouriteCourseIds: string[] = [];
    
    // Si el usuario está logueado, obtenemos primero la lista de sus cursos favoritos
    if (userId && !showOnlyFavorites) {
      try {
        const favouriteResponse = await courseClient.get('/favourite-courses', { 
          params: { user_login: userId } 
        });
        
        // Extraer los IDs de los cursos favoritos
        if (favouriteResponse.data && Array.isArray(favouriteResponse.data.response)) {
          favouriteCourseIds = favouriteResponse.data.response.map((course: Course) => course.course_id);
        } else if (favouriteResponse.data && Array.isArray(favouriteResponse.data)) {
          favouriteCourseIds = favouriteResponse.data.map((course: Course) => course.course_id);
        } else if (favouriteResponse.data && favouriteResponse.data.courses && Array.isArray(favouriteResponse.data.courses)) {
          favouriteCourseIds = favouriteResponse.data.courses.map((course: Course) => course.course_id);
        }
        
        console.log("Cursos favoritos cargados:", favouriteCourseIds.length);
      } catch (error) {
        console.error("Error al obtener cursos favoritos:", error);
        // Continuar con la lista vacía de favoritos si hay error
      }
    }
    
    // Si queremos mostrar solo favoritos, usamos el endpoint específico
    if (showOnlyFavorites && userId) {
      response = await courseClient.get('/favourite-courses', { params });
    } else {
      response = await courseClient.get('/courses', { params });
    }
    
    // Función para procesar los cursos y marcar los favoritos
    const processCourses = (courses: any[]) => {
      return courses.map((course: any) => ({
        ...course,
        isFavourite: showOnlyFavorites ? true : favouriteCourseIds.includes(course.course_id)
      }));
    };
    
    // Verificar diferentes formatos posibles de respuesta
    if (response.data && Array.isArray(response.data.courses)) {
      return processCourses(response.data.courses);
    } else if (response.data && Array.isArray(response.data)) {
      return processCourses(response.data);
    } else if (response.data && response.data.response && Array.isArray(response.data.response)) {
      return processCourses(response.data.response);
    } else {
      console.warn('La respuesta del API no tiene el formato esperado:', response.data);
      return []; // Devolver un array vacío para evitar errores
    }
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    return []; // Devolver un array vacío en caso de error
  }
};

// Función para registrarse en un curso
const registerInCourse = async (courseId: string, academicLevel: string, token?: string): Promise<CourseRegistrationResponse> => {
  console.log("Academic Level:", academicLevel);
  
  if (!token) {
    throw new Error("No hay token de sesión disponible. Por favor, inicia sesión nuevamente.");
  }
  
  const response = await courseClient.post(`/courses/${courseId}/registrations`, {
    user_academic_level: academicLevel
  }, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  
  // Manejar diferentes posibles formatos de respuesta
  if (response.data && response.data.response) {
    return response.data;
  } else if (response.data) {
    // Si la respuesta no tiene el formato esperado, intentamos adaptarla
    return {
      response: response.data
    };
  } else {
    // Caso de emergencia, devolver un objeto con estructura mínima
    console.warn("Formato de respuesta inesperado en el registro:", response.data);
    return {
      response: {
        registration_id: "unknown",
        course_name: "Curso",
        registration_date: new Date().toISOString(),
        course_date_init: new Date().toISOString()
      }
    };
  }
};

// Función para eliminar un curso
const deleteCourse = async (courseId: string): Promise<void> => {
  await courseClient.delete(`/courses/${courseId}`);
};



// Función para marcar un curso como favorito
const addFavouriteCourse = async (courseId: string, userId: string): Promise<FavouriteCourseResponse> => {
  const response = await courseClient.post('/favourite-courses', {
    user_login: userId,
    course_id: courseId
  });
  
  return response.data;
};

// Función para quitar un curso de favoritos
const removeFavouriteCourse = async (courseId: string, userId: string): Promise<FavouriteCourseResponse> => {
  // Usar DELETE con query params según el endpoint proporcionado
  const response = await courseClient.delete('/favourite-courses', {
    params: {
      user_login: userId,
      course_id: courseId
    }
  });
  
  return response.data;
};

// Componente principal para mostrar la lista de cursos
export default function CourseListScreen() {
  const { session } = useSession();
  const isTeacher = session?.userType === "teacher" || session?.userType === "administrator";
  const queryClient = useQueryClient();
  
  // Estado para mostrar solo favoritos
  const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);

  const [filters, setFilters] = useState({ 
    course_name: '', 
    category: '', 
    date_init: null as Date | null, 
    date_end: null as Date | null 
  });
  
  const [searchFilters, setSearchFilters] = useState({ 
    course_name: '', 
    category: '', 
    date_init: null as Date | null, 
    date_end: null as Date | null 
  });

  // Estado para el modal de edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Estado para el modal de detalles del curso
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  // Configuración de la consulta de cursos para siempre buscar datos actualizados
  const { data: courses = [], isLoading, error, refetch } = useQuery({
    queryKey: ['courses', searchFilters, showOnlyFavourites], 
    queryFn: () => fetchCourses(searchFilters, session?.userId, showOnlyFavourites),
    staleTime: 0, // Considera los datos obsoletos inmediatamente
    gcTime: 0, // No guarda en caché los resultados (reemplaza a cacheTime)
    refetchOnWindowFocus: true, // Actualiza al enfocar la ventana
    retry: 2, // Reintentar la consulta hasta 2 veces en caso de error
    retryDelay: 1000, // Esperar 1 segundo entre reintentos
    // Asegurarnos de que siempre devolvemos un array
    select: (data) => Array.isArray(data) ? data : []
  });

  // Función para actualizar forzosamente la lista de cursos
  const handleCourseUpdate = (updatedCourseData?: Partial<Course>) => {
    // Si tenemos un curso seleccionado y datos para actualizar, actualizamos manualmente la caché
    if (selectedCourse && updatedCourseData) {
      // Obtener los datos actuales de la caché
      const currentData = queryClient.getQueryData<Course[]>(['courses', searchFilters]);
      
      if (currentData) {
        // Crear una nueva lista con el curso actualizado
        const updatedData = currentData.map(course => 
          course.course_id === selectedCourse.course_id 
            ? { ...course, ...updatedCourseData } 
            : course
        );
        
        // Actualizar la caché con los nuevos datos
        queryClient.setQueryData(['courses', searchFilters], updatedData);
      }
    }
    
    // Además invalidamos completamente la caché y forzamos un refetch
    queryClient.invalidateQueries({ queryKey: ['courses'] });
    refetch();
  };

  // Función para manejar la eliminación de un curso
  const handleDeleteCourse = (courseId: string, courseName: string) => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro de que deseas eliminar el curso "${courseName}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCourse(courseId);
              // Actualizamos la caché tras eliminar
              queryClient.invalidateQueries({ queryKey: ['courses'] });
              refetch();
              Alert.alert("Éxito", "Curso eliminado correctamente");
            } catch (error: any) {
              console.error("Error al eliminar el curso:", error);
              
              // Mejor manejo de errores con información detallada
              let errorMessage = "No se pudo eliminar el curso. Inténtalo de nuevo.";
              
              if (error.response) {
                console.log("Detalles del error:", {
                  status: error.response.status,
                  data: error.response.data
                });
                
                // Mensajes específicos basados en el código o la respuesta
                if (error.response.status === 500) {
                  errorMessage = "Error en el servidor. Es posible que este curso tenga estudiantes inscritos u otros registros asociados que impiden su eliminación.";
                } else if (error.response.status === 403) {
                  errorMessage = "No tienes permisos para eliminar este curso.";
                } else if (error.response.status === 404) {
                  errorMessage = "El curso no se encontró en el servidor.";
                }
                
                // Si el servidor devuelve un mensaje de error específico, úsalo
                if (error.response.data && error.response.data.message) {
                  errorMessage = error.response.data.message;
                }
              }
              
              Alert.alert(
                "Error", 
                errorMessage
              );
            }
          }
        }
      ]
    );
  };

  // Función para formatear fechas con manejo correcto de zonas horarias
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Ajustar la fecha para evitar problemas de zona horaria
      // Al agregar 'T12:00:00' nos aseguramos de que la fecha se interprete en medio día
      // para evitar que el cambio de zona horaria afecte el día mostrado
      const dateWithoutTime = dateString.split('T')[0] + 'T12:00:00Z';
      const adjustedDate = new Date(dateWithoutTime);
      
      return format(adjustedDate, 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  // Renderizar cada curso como una Card
  const renderCourseCard = ({ item }: { item: Course }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.titleContainer}>
          <Title style={{ flex: 1 }}>{item.course_name}</Title>
          {!isTeacher && (
            <TouchableOpacity
              onPress={() => {
                try {
                  if (!session || !session.userId) {
                    Alert.alert("Error", "Necesitas iniciar sesión para marcar favoritos");
                    return;
                  }
                  
                  // Si ya es favorito, permitimos quitarlo
                  if (item.isFavourite) {
                    // Mostrar alerta de confirmación para quitar de favoritos
                    Alert.alert(
                      "Quitar de favoritos",
                      `¿Estás seguro de que deseas quitar "${item.course_name}" de tus favoritos?`,
                      [
                        { 
                          text: "Cancelar", 
                          style: "cancel" 
                        },
                        {
                          text: "Confirmar",
                          style: "default",
                          onPress: async () => {
                            try {
                              await removeFavouriteCourse(item.course_id, session.userId);
                              // Actualizar el estado local del curso
                              queryClient.setQueryData(['courses', searchFilters, showOnlyFavourites], 
                                (oldData: Course[] | undefined) => 
                                  oldData?.map(course => 
                                    course.course_id === item.course_id 
                                      ? { ...course, isFavourite: false } 
                                      : course
                                  )
                              );
                              // Invalidar consultas de favoritos para actualizar la pestaña de favoritos
                              queryClient.invalidateQueries({ queryKey: ['favorite-courses'] });
                              // Mostrar mensaje de confirmación de éxito
                              Alert.alert(
                                "Curso eliminado de favoritos",
                                `"${item.course_name}" ha sido eliminado de tus favoritos.`,
                                [{ text: "OK" }]
                              );
                            } catch (error) {
                              console.error("Error al quitar favorito:", error);
                              Alert.alert("Error", "No se pudo quitar el curso de favoritos. Inténtalo de nuevo.");
                            }
                          }
                        }
                      ]
                    );
                  } else {
                    // Mostrar alerta de confirmación para agregar a favoritos
                    Alert.alert(
                      "Confirmar favorito",
                      `¿Estás seguro de que deseas marcar "${item.course_name}" como favorito?`,
                      [
                        { 
                          text: "Cancelar", 
                          style: "cancel" 
                        },
                        {
                          text: "Confirmar",
                          style: "default",
                          onPress: async () => {
                            try {
                              await addFavouriteCourse(item.course_id, session.userId);
                              // Actualizar el estado local del curso como favorito
                              queryClient.setQueryData(['courses', searchFilters, showOnlyFavourites], 
                                (oldData: Course[] | undefined) => 
                                  oldData?.map(course => 
                                    course.course_id === item.course_id 
                                      ? { ...course, isFavourite: true } 
                                      : course
                                  )
                              );
                              // Invalidar consultas de favoritos para actualizar la pestaña de favoritos
                              queryClient.invalidateQueries({ queryKey: ['favorite-courses'] });
                              // Mostrar mensaje de confirmación de éxito
                              Alert.alert(
                                "Curso agregado a favoritos",
                                `"${item.course_name}" ha sido agregado exitosamente a tus favoritos.`,
                                [{ text: "OK" }]
                              );
                            } catch (error) {
                              console.error("Error al agregar favorito:", error);
                              Alert.alert("Error", "No se pudo agregar el curso a favoritos. Inténtalo de nuevo.");
                            }
                          }
                        }
                      ]
                    );
                  }
                } catch (error) {
                  console.error("Error al manejar favorito:", error);
                  Alert.alert("Error", "Ocurrió un error inesperado. Inténtalo de nuevo más tarde.");
                }
              }}
              style={styles.favoriteButton}
            >
              <MaterialCommunityIcons
                name={item.isFavourite ? "heart" : "heart-outline"}
                size={24}
                color={item.isFavourite ? "#e91e63" : "#999"}
                style={{ paddingHorizontal: 8 }}
              />
            </TouchableOpacity>
          )}
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
        {/* Botón de inscripción, solo visible para estudiantes */}
        {!isTeacher && (
          <Button 
            mode="contained"
            disabled={item.message === "Enrolled in course" || item.message === "enrolled in course" || item.quota === 0}
            style={[(item.message === "Enrolled in course" || item.message === "enrolled in course") ? styles.enrolledButton : {}, { width: '100%', marginBottom: 8 }]}
            labelStyle={styles.buttonLabel}
            contentStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 12 }}
            icon="account-check-outline"
            onPress={() => {
              // Verificar que el usuario está logueado
              if (!session) {
                Alert.alert("Error", "Necesitas iniciar sesión para inscribirte en este curso");
                return;
              }

              // Obtener el email del usuario desde la sesión
              let token = session.token;
              // El nivel académico se puede pedir al usuario o usar un valor predeterminado
              // Usaremos "Primary School" como nivel académico predeterminado o el del curso si está disponible
              const academicLevel = item.academic_level || "Primary School";

              Alert.alert(
                "Confirmar inscripción",
                `¿Estás seguro de que deseas inscribirte en el curso "${item.course_name}"?`,
                [
                  { text: "Cancelar", style: "cancel" },
                  { 
                    text: "Inscribirse", 
                    onPress: async () => {                    
                      try {
                        const response = await registerInCourse(item.course_id, academicLevel, token);
                        // Acceder a los datos de la respuesta de forma segura
                        const courseName = response.response?.course_name || item.course_name;
                        const courseStart = response.response?.course_date_init || item.date_init;
                        
                        Alert.alert(
                          "Inscripción exitosa", 
                          `Te has inscrito correctamente en el curso "${courseName}". \nFecha de inicio: ${formatDate(courseStart)}`
                        );
                        // Refrescar la lista para mostrar cambios en el curso (como los cupos disponibles)
                        refetch();
                      } catch (error: any) {
                        console.error("Error al inscribirse en el curso:", error);
                        
                        let errorMessage = "No se pudo completar la inscripción. Inténtalo de nuevo.";
                        
                        if (error.response) {
                          if (error.response.status === 400) {
                            errorMessage = "No se pudo inscribir. Verifica que cumplas con todos los requisitos del curso.";
                          } else if (error.response.status === 409) {
                            errorMessage = error.response.data.detail;
                          } else if (error.response.data && error.response.data.message) {
                            errorMessage = error.response.data.message;
                          }
                        }
                        
                        Alert.alert("Error", errorMessage);
                      }
                    }
                  }
                ]
              );
            }}        >
            {(item.message === "enrolled in course" || item.message === "Enrolled in course") ? "Ya inscrito" : "Inscribirse"}
          </Button>
        )}
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
        {isTeacher && (
          <View style={styles.teacherButtonsContainer}>
            <Button 
              mode="outlined" 
              icon="pencil"
              style={[styles.actionButton, styles.actionButtonFlex]}
              labelStyle={styles.buttonLabel}
              contentStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 12 }}
              onPress={() => {
                setSelectedCourse(item);
                setEditModalVisible(true);
              }}
            >
              Editar
            </Button>
            <Button 
              mode="outlined" 
              icon="delete"
              style={[styles.actionButton, styles.deleteButton, styles.actionButtonFlex]}
              labelStyle={styles.buttonLabel}
              contentStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 12 }}
              onPress={() => handleDeleteCourse(item.course_id, item.course_name)}
            >
              Eliminar
            </Button>
          </View>
        )}
      </Card.Actions>
    </Card>
  );

  // Si está cargando, mostrar un indicador de carga
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando cursos...</Text>
      </View>
    );
  }

  // Si hay un error, mostrar un mensaje de error
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Error al cargar los cursos: {(error as Error).message}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Intentar nuevamente
        </Button>
      </View>
    );
  }

  // Renderizar la lista de cursos
  return (
    <Provider>
      <View style={styles.container}>
        <Text style={styles.header}>Cursos Disponibles</Text>

        <View style={styles.headerControls}>
          <TouchableOpacity onPress={() => setFiltersVisible(!filtersVisible)} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {filtersVisible ? "Ocultar filtros ▲" : "Mostrar filtros ▼"}
            </Text>
          </TouchableOpacity>

          {/* <Button
            mode="outlined"
            icon={showOnlyFavourites ? "heart" : "heart-outline"}
            onPress={() => {
              setShowOnlyFavourites(!showOnlyFavourites);
            }}
            style={{ marginBottom: 16 }}
            labelStyle={{ fontSize: 14 }}
            contentStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 8 }}
            color={showOnlyFavourites ? "#e91e63" : "#999"}
          >
            {showOnlyFavourites ? "Mostrando favoritos" : "Mostrar favoritos"}
          </Button> */}
        </View>

        {filtersVisible && (
          <>
            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={filters.category}
                onValueChange={(text) => setFilters((prev) => ({ ...prev, category: text }))}
                style={styles.picker}
              >
                <Picker.Item label="Todas las categorías" value={null} />
                <Picker.Item label="Art" value="Art" />
                {/* <Picker.Item label="Diseño" value="Diseño" />
            <Picker.Item label="Marketing" value="Marketing" />
            <Picker.Item label="Negocios" value="Negocios" /> */}
              </Picker>
            </View>

            <TextInput
              label="Buscar por nombre"
              value={filters.course_name}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, course_name: text }))}
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
              onPress={() => setSearchFilters(filters)}
              style={{ marginTop: 16 }}
            >
              Buscar
            </Button>

            <Button
              mode="outlined"
              onPress={() => {
                setFilters({
                  course_name: '',
                  category: '',
                  date_init: null,
                  date_end: null
                });
                setSearchFilters({
                  course_name: '',
                  category: '',
                  date_init: null,
                  date_end: null
                });
              }
            }
            style={{ marginTop: 16 }}
            >
              Limpiar Filtros
            </Button>
          </>
        )}
        <FlatList
          data={courses}
          keyExtractor={(item) => item.course_id}
          renderItem={renderCourseCard}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled={true}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay cursos disponibles</Text>
            </View>
          }
        />

        {/* Modal de edición de curso */}
        <EditCourseModal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          course={selectedCourse}
          onSuccess={handleCourseUpdate}
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
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  favoriteButton: {
    margin: 0,
    padding: 0,
    minWidth: 40,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 20,
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
    height: 200,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
  },
  dropdownContainer: {
    marginHorizontal: 16,
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
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    marginHorizontal: 4,
    paddingHorizontal: 8,
    minWidth: 100,
  },
  deleteButton: {
    backgroundColor: "#ffebee",
    borderColor: "#f44336",
  },
  enrolledButton: {
    backgroundColor: "#e0e0e0",
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
  actionButtonFlex: {
    flex: 1,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  buttonLabel: {
    fontSize: 14,  // Tamaño de fuente más grande
    marginHorizontal: 4,
    paddingLeft: 8,  // Espacio adicional para evitar que se pise con los iconos
  },
  teacherButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 0,
    gap: 8,
  },
});