import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Platform, Dimensions } from "react-native";
import { Card, Title, Paragraph, Chip, Divider, Button, Provider, SegmentedButtons, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "@/contexts/session";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import TeacherTaskDetailModal from '@/components/TeacherTaskDetailModal';
import TeacherExamDetailModal from '@/components/TeacherExamDetailModal';
import EditExamModal from '@/components/EditExamModal';
import EditTaskModal from '@/components/EditTaskModal';

// Tipo para la respuesta de cursos
type Course = {
  course_id: string;
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  category: string | null;
  message?: string;
};

type CoursesResponse = {
  response: Course[];
};

// Tipos para las tareas y exámenes
type Task = {
  task_id: string;
  title: string;
  due_date: string;
  published: boolean;
  course_id: string;
  submissions_count: number;
};

type Exam = {
  exam_id: string;
  title: string;
  date: string;
  published: boolean;
  course_id: string;
  submissions_count: number;
};

// Tipo detallado para EditExamModal
type DetailedExam = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  location: string;
  owner: string;
  additional_info: {
    open_book: boolean;
    grace_period?: string;
    submission_rules?: string;
    questions?: string;
  };
  published: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

// Tipo detallado para EditTaskModal
type DetailedTask = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  owner: string;
  instructions: string;
  extra_conditions: {
    type: string;
    questions?: string;
  };
  published: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  module_id?: string | null;
};

type TeacherAssignmentsResponse = {
  courses_tasks: {
    tasks: {
      items: Task[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    };
    exams: {
      items: Exam[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    };
  };
};

// Función para obtener la lista de cursos
const fetchCourses = async (token: string): Promise<Course[]> => {
  try {
    const response = await courseClient.get('/courses/', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data.response || [];
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    return [];
  }
};

// Función para obtener las tareas y exámenes del docente
const fetchTeacherAssignments = async (
  token: string, 
  taskLimit: number = 5, 
  taskPage: number = 1, 
  examLimit: number = 5, 
  examPage: number = 1,
  filters?: {
    course_id?: string;
    title?: string;
    due_date?: Date | null;
    date?: Date | null;
    published?: boolean | null;
  }
): Promise<TeacherAssignmentsResponse> => {
  // Parámetros base
  const params: Record<string, string | number | boolean> = {
    taskLimit,
    taskPage,
    examLimit,
    examPage
  };

  // Añadir filtros si existen
  if (filters) {
    if (filters.course_id) params.course_id = filters.course_id;
    if (filters.title) params.title = filters.title;
    if (filters.published !== null && filters.published !== undefined) params.published = filters.published;
    
    // Formatear fechas si existen
    if (filters.due_date) {
      params.due_date = format(filters.due_date, 'yyyy-MM-dd');
    }
    if (filters.date) {
      params.date = format(filters.date, 'yyyy-MM-dd');
    }
  }

  // Siempre filtrar por elementos activos únicamente
  params.is_active = true;

  const response = await courseClient.get('/tasks/gateway', {
    params,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data;
};

// Función para eliminar una tarea
const deleteTask = async (token: string, taskId: string): Promise<void> => {
  await courseClient.delete(`/tasks/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

// Función para eliminar un examen
const deleteExam = async (token: string, examId: string): Promise<void> => {
  await courseClient.delete(`/exams/${examId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

export default function TeacherAssignmentsScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('tasks');
  const [taskPage, setTaskPage] = useState(1);
  const [examPage, setExamPage] = useState(1);

  // Estados para filtros
  const [filters, setFilters] = useState({
    course_id: '',
    title: '',
    due_date: null as Date | null,
    date: null as Date | null,
    published: null as boolean | null,
  });

  // Hook para detectar pantallas pequeñas
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      const { width } = Dimensions.get('window');
      setIsSmallScreen(width < 400); // Considerar pantallas menores a 400px como pequeñas
    };

    updateLayout();
    const subscription = Dimensions.addEventListener('change', updateLayout);
    
    return () => subscription?.remove();
  }, []);

  // Estados para los filtros actuales de búsqueda
  const [searchFilters, setSearchFilters] = useState({
    course_id: '',
    title: '',
    due_date: null as Date | null,
    date: null as Date | null,
    published: null as boolean | null,
  });

  // Estados para UI de los filtros
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Estados para los modales de detalle
  const [taskDetailVisible, setTaskDetailVisible] = useState(false);
  const [examDetailVisible, setExamDetailVisible] = useState(false);
  const [editExamVisible, setEditExamVisible] = useState(false);
  const [editTaskVisible, setEditTaskVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedExamForEdit, setSelectedExamForEdit] = useState<DetailedExam | null>(null);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<DetailedTask | null>(null);

  // Verificar que el usuario sea docente
  const isTeacher = session?.userType === "teacher" || session?.userType === "administrator";

  // Consulta para obtener la lista de cursos
  const { data: coursesData } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => fetchCourses(session?.token || ''),
    enabled: !!session?.token && isTeacher,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const courses = coursesData || [];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-assignments', taskPage, examPage, searchFilters],
    queryFn: () => fetchTeacherAssignments(session?.token || '', 5, taskPage, 5, examPage, searchFilters),
    enabled: !!session?.token && isTeacher,
    staleTime: 0, // Los datos siempre se consideran obsoletos
    gcTime: 0, // No mantener cache
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Siempre refetch al montar
  });

  // Funciones para manejar la paginación
  const handleTaskPageChange = (newPage: number) => {
    setTaskPage(newPage);
  };

  const handleExamPageChange = (newPage: number) => {
    setExamPage(newPage);
  };

  // Función para aplicar filtros
  const applyFilters = () => {
    setSearchFilters(filters);
    setTaskPage(1);
    setExamPage(1);
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    const resetFilters = {
      course_id: '',
      title: '',
      due_date: null,
      date: null,
      published: null,
    };
    setFilters(resetFilters);
    setSearchFilters(resetFilters);
    setTaskPage(1);
    setExamPage(1);
  };

  // Función para eliminar una tarea
  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro de que deseas eliminar la tarea "${taskTitle}"?`,
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
              console.log('Eliminando tarea con ID:', taskId);
              await deleteTask(session?.token || '', taskId);
              console.log('Tarea eliminada exitosamente');
              
              // Invalidar todas las queries relacionadas
              console.log('Invalidando queries...');
              await queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
              await queryClient.refetchQueries({ queryKey: ['teacher-assignments'] });
              console.log('Queries invalidadas y refetch completado');
              
              Alert.alert("Éxito", "Tarea eliminada correctamente");
            } catch (error) {
              console.error("Error al eliminar tarea:", error);
              Alert.alert("Error", "No se pudo eliminar la tarea");
            }
          }
        }
      ]
    );
  };

  // Función para eliminar un examen
  const handleDeleteExam = async (examId: string, examTitle: string) => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro de que deseas eliminar el examen "${examTitle}"?`,
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
              await deleteExam(session?.token || '', examId);
              
              // Invalidar todas las queries relacionadas
              await queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
              await queryClient.refetchQueries({ queryKey: ['teacher-assignments'] });
              
              Alert.alert("Éxito", "Examen eliminado correctamente");
            } catch (error) {
              console.error("Error al eliminar examen:", error);
              Alert.alert("Error", "No se pudo eliminar el examen");
            }
          }
        }
      ]
    );
  };

  // Función para obtener los detalles del examen para editar
  const fetchExamDetailsForEdit = async (examId: string): Promise<DetailedExam | null> => {
    if (!session?.token) return null;
    
    try {
      const response = await courseClient.get(`/exams/${examId}`, {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching exam details for edit:", error);
      Alert.alert("Error", "No se pudieron cargar los detalles del examen");
      return null;
    }
  };

  // Función para obtener los detalles de la tarea para editar
  const fetchTaskDetailsForEdit = async (taskId: string): Promise<DetailedTask | null> => {
    if (!session?.token) return null;
    
    try {
      const response = await courseClient.get(`/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching task details for edit:", error);
      Alert.alert("Error", "No se pudieron cargar los detalles de la tarea");
      return null;
    }
  };

  // Función para manejar la edición de un examen
  const handleEditExam = async (examId: string) => {
    const examDetails = await fetchExamDetailsForEdit(examId);
    if (examDetails) {
      setSelectedExamForEdit(examDetails);
      setEditExamVisible(true);
    }
  };

  // Función para manejar la edición de una tarea
  const handleEditTask = async (taskId: string) => {
    const taskDetails = await fetchTaskDetailsForEdit(taskId);
    if (taskDetails) {
      setSelectedTaskForEdit(taskDetails);
      setEditTaskVisible(true);
    }
  };

  // Función para renderizar los controles de paginación
  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (page: number) => void) => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <Button
          mode="outlined"
          disabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          style={styles.paginationButton}
          icon="chevron-left"
        >
          Anterior
        </Button>
        <Text style={styles.paginationText}>
          Página {currentPage} de {totalPages}
        </Text>
        <Button
          mode="outlined"
          disabled={currentPage >= totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          style={styles.paginationButton}
          icon="chevron-right"
          contentStyle={{ flexDirection: 'row-reverse' }}
        >
          Siguiente
        </Button>
      </View>
    );
  };

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  // Función para determinar el color del estado
  const getStatusColor = (published: boolean) => {
    return published ? '#4caf50' : '#ff9800';
  };

  // Función para determinar si la fecha ya pasó
  const isOverdue = (dateString: string) => {
    const date = new Date(dateString);
    return date < new Date();
  };

  // Renderizar tarjeta de tarea
  const renderTaskCard = ({ item }: { item: Task }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.titleContainer}>
          <Title style={{ flex: 1 }}>{item.title}</Title>
          <Chip 
            mode="flat" 
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.published) }]}
            textStyle={{ color: 'white', fontSize: 12 }}
          >
            {item.published ? 'Publicada' : 'Borrador'}
          </Chip>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fecha límite:</Text>
            <Text style={[
              styles.infoValue, 
              isOverdue(item.due_date) && { color: '#f44336' }
            ]}>
              {formatDate(item.due_date)}
              {isOverdue(item.due_date) && ' (Vencida)'}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Entregas:</Text>
            <Text style={styles.infoValue}>{item.submissions_count}</Text>
          </View>
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <View style={styles.buttonContainer}>
          {/* Botón "Ver detalles" arriba */}
          <Button 
            mode="outlined"
            onPress={() => {
              setSelectedTaskId(item.task_id);
              setTaskDetailVisible(true);
            }}
            style={styles.fullWidthButton}
            icon="eye"
            compact={isSmallScreen}
          >
            {isSmallScreen ? '' : 'Ver detalles'}
          </Button>
          
          {/* Botones "Editar" y "Eliminar" abajo, uno al lado del otro */}
          <View style={styles.bottomButtonsRow}>
            <Button 
              mode="outlined"
              onPress={() => handleEditTask(item.task_id)}
              style={[styles.halfWidthButton, isSmallScreen && styles.compactButton]}
              icon="pencil"
              compact={isSmallScreen}
            >
              {isSmallScreen ? '' : 'Editar'}
            </Button>
            <Button 
              mode="outlined"
              onPress={() => handleDeleteTask(item.task_id, item.title)}
              style={[styles.halfWidthButton, styles.deleteButton, isSmallScreen && styles.compactButton]}
              icon="delete"
              buttonColor="#f44336"
              textColor="white"
              compact={isSmallScreen}
            >
              {isSmallScreen ? '' : 'Eliminar'}
            </Button>
          </View>
        </View>
      </Card.Actions>
    </Card>
  );

  // Renderizar tarjeta de examen
  const renderExamCard = ({ item }: { item: Exam }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.titleContainer}>
          <Title style={{ flex: 1 }}>{item.title}</Title>
          <Chip 
            mode="flat" 
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.published) }]}
            textStyle={{ color: 'white', fontSize: 12 }}
          >
            {item.published ? 'Publicado' : 'Borrador'}
          </Chip>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fecha del examen:</Text>
            <Text style={[
              styles.infoValue,
              isOverdue(item.date) && { color: '#f44336' }
            ]}>
              {formatDate(item.date)}
              {isOverdue(item.date) && ' (Finalizado)'}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Entregas:</Text>
            <Text style={styles.infoValue}>{item.submissions_count}</Text>
          </View>
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <View style={styles.buttonContainer}>
          {/* Botón "Ver detalles" arriba */}
          <Button 
            mode="outlined"
            onPress={() => {
              setSelectedExamId(item.exam_id);
              setExamDetailVisible(true);
            }}
            style={styles.fullWidthButton}
            icon="eye"
            compact={isSmallScreen}
          >
            {isSmallScreen ? '' : 'Ver detalles'}
          </Button>
          
          {/* Botones "Editar" y "Eliminar" abajo, uno al lado del otro */}
          <View style={styles.bottomButtonsRow}>
            <Button 
              mode="outlined"
              onPress={() => handleEditExam(item.exam_id)}
              style={[styles.halfWidthButton, isSmallScreen && styles.compactButton]}
              icon="pencil"
              compact={isSmallScreen}
            >
              {isSmallScreen ? '' : 'Editar'}
            </Button>
            <Button 
              mode="outlined"
              onPress={() => handleDeleteExam(item.exam_id, item.title)}
              style={[styles.halfWidthButton, styles.deleteButton, isSmallScreen && styles.compactButton]}
              icon="delete"
              buttonColor="#f44336"
              textColor="white"
              compact={isSmallScreen}
            >
              {isSmallScreen ? '' : 'Eliminar'}
            </Button>
          </View>
        </View>
      </Card.Actions>
    </Card>
  );

  // Si no es docente, mostrar mensaje
  if (!isTeacher) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="account-alert" size={64} color="#999" />
        <Text style={styles.errorText}>
          Esta sección está disponible solo para docentes
        </Text>
      </View>
    );
  }

  // Si está cargando, mostrar indicador
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando asignaciones...</Text>
      </View>
    );
  }

  // Si hay un error, mostrar mensaje de error
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#f44336" />
        <Text style={styles.errorText}>
          Error al cargar las asignaciones: {(error as Error).message}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Intentar nuevamente
        </Button>
      </View>
    );
  }

  const tasks = data?.courses_tasks?.tasks?.items || [];
  const exams = data?.courses_tasks?.exams?.items || [];

  return (
    <Provider>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Mis Tareas y Exámenes</Text>
          <MaterialCommunityIcons 
            name={activeTab === 'tasks' ? 'clipboard-list' : 'file-document'} 
            size={28} 
            color="#2196f3" 
          />
        </View>

        {/* Botones de navegación entre pestañas */}
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: 'tasks',
              label: `Tareas (${data?.courses_tasks?.tasks?.totalItems || 0})`,
              icon: 'clipboard-list',
            },
            {
              value: 'exams',
              label: `Exámenes (${data?.courses_tasks?.exams?.totalItems || 0})`,
              icon: 'file-document',
            },
          ]}
          style={styles.segmentedButtons}
        />

        {/* Control para mostrar/ocultar filtros */}
        <View style={styles.headerControls}>
          <TouchableOpacity onPress={() => setFiltersVisible(!filtersVisible)} style={{ marginBottom: 16 }}>
            <Text style={styles.filterToggleText}>
              {filtersVisible ? "Ocultar filtros ▲" : "Mostrar filtros ▼"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        {filtersVisible && (
          <>
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Seleccionar curso:</Text>
              <Picker
                selectedValue={filters.course_id}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, course_id: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Todos los cursos" value="" />
                {courses.map((course) => (
                  <Picker.Item 
                    key={course.course_id} 
                    label={course.course_name} 
                    value={course.course_id} 
                  />
                ))}
              </Picker>
            </View>

            <TextInput
              label="Buscar por título"
              value={filters.title}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, title: text }))}
              mode="outlined"
              style={styles.filterInput}
            />

            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Estado de publicación:</Text>
              <Picker
                selectedValue={filters.published}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, published: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Todos los estados" value={null} />
                <Picker.Item label="Publicado" value={true} />
                <Picker.Item label="Borrador" value={false} />
              </Picker>
            </View>

            <View style={styles.dateFilterContainer}>
              <Button mode="outlined" onPress={() => setShowDueDatePicker(true)}>
                {filters.due_date ? `Fecha límite: ${format(filters.due_date, 'dd/MM/yyyy')}` : "Fecha límite"}
              </Button>
              <Button mode="outlined" onPress={() => setShowDatePicker(true)}>
                {filters.date ? `Fecha examen: ${format(filters.date, 'dd/MM/yyyy')}` : "Fecha examen"}
              </Button>
            </View>

            {showDueDatePicker && (
              <DateTimePicker
                value={filters.due_date || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDueDatePicker(false);
                  if (selectedDate) {
                    setFilters((prev) => ({ ...prev, due_date: selectedDate }));
                  }
                }}
              />
            )}

            {showDatePicker && (
              <DateTimePicker
                value={filters.date || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setFilters((prev) => ({ ...prev, date: selectedDate }));
                  }
                }}
              />
            )}

            <Button
              mode="contained"
              onPress={applyFilters}
              style={styles.filterButton}
            >
              Aplicar filtros
            </Button>

            <Button
              mode="outlined"
              onPress={clearFilters}
              style={styles.filterButton}
            >
              Limpiar filtros
            </Button>
          </>
        )}

        {/* Lista de tareas */}
        {activeTab === 'tasks' && (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.task_id}
            renderItem={renderTaskCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="clipboard-list" size={64} color="#999" />
                <Text style={styles.emptyText}>No hay tareas disponibles</Text>
              </View>
            }
            ListFooterComponent={
              tasks.length > 0 ? renderPagination(
                data?.courses_tasks?.tasks?.currentPage || 1,
                data?.courses_tasks?.tasks?.totalPages || 1,
                handleTaskPageChange
              ) : null
            }
          />
        )}

        {/* Lista de exámenes */}
        {activeTab === 'exams' && (
          <FlatList
            data={exams}
            keyExtractor={(item) => item.exam_id}
            renderItem={renderExamCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="file-document" size={64} color="#999" />
                <Text style={styles.emptyText}>No hay exámenes disponibles</Text>
              </View>
            }
            ListFooterComponent={
              exams.length > 0 ? renderPagination(
                data?.courses_tasks?.exams?.currentPage || 1,
                data?.courses_tasks?.exams?.totalPages || 1,
                handleExamPageChange
              ) : null
            }
          />
        )}
      </View>

      {/* Modales de detalle */}
      <TeacherTaskDetailModal
        visible={taskDetailVisible}
        onDismiss={() => setTaskDetailVisible(false)}
        taskId={selectedTaskId}
        onTaskDeleted={async () => {
          await queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
          await queryClient.refetchQueries({ queryKey: ['teacher-assignments'] });
        }}
      />

      <TeacherExamDetailModal
        visible={examDetailVisible}
        onDismiss={() => setExamDetailVisible(false)}
        examId={selectedExamId}
        onExamDeleted={async () => {
          await queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
          await queryClient.refetchQueries({ queryKey: ['teacher-assignments'] });
        }}
      />

      <EditExamModal
        visible={editExamVisible}
        onDismiss={() => {
          setEditExamVisible(false);
          setSelectedExamForEdit(null);
        }}
        exam={selectedExamForEdit}
        courseId={selectedExamForEdit?.course_id || null}
      />

      <EditTaskModal
        visible={editTaskVisible}
        onDismiss={() => {
          setEditTaskVisible(false);
          setSelectedTaskForEdit(null);
        }}
        task={selectedTaskForEdit}
        courseId={selectedTaskForEdit?.course_id || null}
      />
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
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
  segmentedButtons: {
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusChip: {
    marginLeft: 8,
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
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  actionButton: {
    flex: 1,
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
    fontSize: 16,
    marginVertical: 20,
    textAlign: "center",
    color: "#666",
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
    marginTop: 16,
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
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterToggleText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterInput: {
    marginBottom: 16,
  },
  dropdownContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#f5f5f5',
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
  filterButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 8,
  },
  fullWidthButton: {
    width: '100%',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },  halfWidthButton: {
    flex: 1,
    minWidth: 0, // Permitir que flex maneje el ancho
  },
  detailButton: {
    flex: 1,
    minWidth: 60,
    maxWidth: 110,
  },
  compactButton: {
    minWidth: 48,
    maxWidth: 48,
    paddingHorizontal: 0,
  },
  deleteButton: {
    // No agregar flex aquí para evitar conflictos con halfWidthButton
    backgroundColor: '#f44336',
  },
});
