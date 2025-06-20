import React, { useState } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { Card, Title, Paragraph, Chip, Divider, Button, Provider, SegmentedButtons } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "@/contexts/session";

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

// Función para obtener las tareas y exámenes del docente
const fetchTeacherAssignments = async (
  token: string, 
  taskLimit: number = 5, 
  taskPage: number = 1, 
  examLimit: number = 5, 
  examPage: number = 1
): Promise<TeacherAssignmentsResponse> => {
  const response = await courseClient.get('/tasks/gateway', {
    params: {
      taskLimit,
      taskPage,
      examLimit,
      examPage
    },
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data;
};

export default function TeacherAssignmentsScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('tasks');
  const [taskPage, setTaskPage] = useState(1);
  const [examPage, setExamPage] = useState(1);

  // Verificar que el usuario sea docente
  const isTeacher = session?.userType === "teacher" || session?.userType === "administrator";

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-assignments', taskPage, examPage],
    queryFn: () => fetchTeacherAssignments(session?.token || '', 5, taskPage, 5, examPage),
    enabled: !!session?.token && isTeacher,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  // Funciones para manejar la paginación
  const handleTaskPageChange = (newPage: number) => {
    setTaskPage(newPage);
  };

  const handleExamPageChange = (newPage: number) => {
    setExamPage(newPage);
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
});
