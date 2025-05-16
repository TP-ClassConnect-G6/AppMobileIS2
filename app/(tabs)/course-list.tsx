import React, { useState } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { Card, Title, Paragraph, Chip, Divider, Button, Provider } from "react-native-paper";
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

// Función para obtener los cursos desde la API
const fetchCourses = async (filters?: { course_name?: string; category?: string; date_init?: Date | null; date_end?: Date | null }, userId?: string): Promise<Course[]> => {
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

  const response = await courseClient.get('/courses', { params });
  return response.data.courses;
};

// Función para registrarse en un curso
const registerInCourse = async (courseId: string, email: string, academicLevel: string): Promise<CourseRegistrationResponse> => {
  console.log("Academic Level:", academicLevel);
  const response = await courseClient.post(`/courses/${courseId}/registrations`, {
    user_login: email,
    role: "student",
    user_academic_level: academicLevel
  });
  
  return response.data;
};

// Función para eliminar un curso
const deleteCourse = async (courseId: string): Promise<void> => {
  await courseClient.delete(`/courses/${courseId}`);
};

// Componente principal para mostrar la lista de cursos
export default function CourseListScreen() {
  const { session } = useSession();
  const isTeacher = session?.userType === "teacher" || session?.userType === "administrator";
  const queryClient = useQueryClient();

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
  const { data: courses, isLoading, error, refetch } = useQuery({
    queryKey: ['courses', searchFilters], 
    queryFn: () => fetchCourses(searchFilters,session?.userId),
    staleTime: 0, // Considera los datos obsoletos inmediatamente
    gcTime: 0, // No guarda en caché los resultados (reemplaza a cacheTime)
    refetchOnWindowFocus: true, // Actualiza al enfocar la ventana
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
        <Title>{item.course_name}</Title>
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

      <Card.Actions>
        <Button 
          mode="contained"
          disabled={item.message === "Enrolled in course"|| item.quota === 0}
          style={item.message === "Enrolled in course" ? styles.enrolledButton : {}}
          onPress={() => {
            // Verificar que el usuario está logueado
            if (!session) {
              Alert.alert("Error", "Necesitas iniciar sesión para inscribirte en este curso");
              return;
            }

            // Obtener el email del usuario desde la sesión
            let userEmail = session.userId;
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
                      const response = await registerInCourse(item.course_id, userEmail, academicLevel);
                      Alert.alert(
                        "Inscripción exitosa", 
                        `Te has inscrito correctamente en el curso "${response.response.course_name}". \nFecha de inicio: ${formatDate(response.response.course_date_init)}`
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
                          errorMessage = "Ya estás inscrito en este curso.";
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
          }}
        >
          {item.message === "enrolled in course" ? "Ya inscrito" : "Inscribirse"}
        </Button>
        <Button 
          onPress={() => {
            setSelectedCourseId(item.course_id);
            setDetailModalVisible(true);
          }}
        >
          Más información
        </Button>
        {isTeacher && (
          <>
            <Button 
              mode="outlined" 
              icon="pencil"
              style={styles.actionButton}
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
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteCourse(item.course_id, item.course_name)}
            >
              Eliminar
            </Button>
          </>
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

        <TouchableOpacity onPress={() => setFiltersVisible(!filtersVisible)} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            {filtersVisible ? "Ocultar filtros ▲" : "Mostrar filtros ▼"}
          </Text>
        </TouchableOpacity>

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
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: "#ffebee",
    borderColor: "#f44336",
  },
  enrolledButton: {
    backgroundColor: "#e0e0e0",
  },
});