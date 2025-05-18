import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Paragraph, Chip, List, Card } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "@/contexts/session";
import TaskSubmissionModal from "./TaskSubmissionModal";
import jwtDecode from "jwt-decode";

// Tipo para las tareas
type Task = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  owner: string;
  instructions: string;
  extra_conditions: {
    type: string;
  };
  published: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

// Tipo para las entregas de tareas
type TaskSubmission = {
  id: string;
  task_id: string;
  student_id: string;
  content: string;
  submitted_at: string;
  is_late: boolean;
  file_urls: string[];
  is_active: boolean;
};

// Función para obtener las tareas de un curso específico (solo publicadas y activas para estudiantes)
const fetchCourseTasks = async (courseId: string): Promise<Task[]> => {
  try {
    const response = await courseClient.get(`/course/${courseId}/tasks`);
    console.log("API tasks response (student view):", JSON.stringify(response.data, null, 2));
    
    if (Array.isArray(response.data)) {
      // Filtrar tareas para mostrar solo las publicadas y activas a los estudiantes
      const validTasks = response.data.filter((task: Task) => task.published === true && task.is_active === true);
      console.log(`Mostrando ${validTasks.length} de ${response.data.length} tareas (solo publicadas y activas)`);
      return validTasks;
    } else {
      console.warn('Formato de respuesta inesperado para tareas:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error al obtener tareas del curso:', error);
    throw error;
  }
};

// Función para obtener las entregas de tareas de un estudiante
const fetchStudentTaskSubmissions = async (studentId: string): Promise<TaskSubmission[]> => {
  try {
    const response = await courseClient.get(`/task-submissions?student_id=${studentId}`);
    console.log("API task submissions response:", JSON.stringify(response.data, null, 2));
    
    if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('Formato de respuesta inesperado para entregas de tareas:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error al obtener entregas de tareas del estudiante:', error);
    return []; // Retornamos array vacío en caso de error para evitar bloquear la UI
  }
};

// Props para el componente modal
type CourseTasksModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
  courseName: string | null;
};

const CourseTasksModal = ({ visible, onDismiss, courseId, courseName }: CourseTasksModalProps) => {
  const { session } = useSession();
  const [studentId, setStudentId] = useState<string>("");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  
  // Estado para el modal de envío de tarea
  const [submissionModalVisible, setSubmissionModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Extraer el ID del estudiante del token JWT
  useEffect(() => {
    if (session?.token) {
      try {
        const decodedToken: any = jwtDecode(session.token);
        // Asumimos que el ID del usuario está en el token como "sub", "id" o similar
        const userId = decodedToken.sub || decodedToken.id || session.userId;
        setStudentId(userId);
        console.log("ID del estudiante extraído:", userId);
      } catch (error) {
        console.error("Error al decodificar el token:", error);
      }
    }
  }, [session]);

  // Obtener las entregas del estudiante cuando se abre el modal y tenemos su ID
  useEffect(() => {
    const loadSubmissions = async () => {
      if (studentId && visible) {
        const submissions = await fetchStudentTaskSubmissions(studentId);
        // Crear un array con los IDs de tareas ya completadas
        const completedTaskIds = submissions
          .filter(sub => sub.is_active)
          .map(sub => sub.task_id);
        setCompletedTasks(completedTaskIds);
        console.log("Tareas ya completadas:", completedTaskIds);
      }
    };
    
    loadSubmissions();
  }, [studentId, visible]);

  // Verificar si una tarea ya fue completada
  const isTaskCompleted = (taskId: string): boolean => {
    return completedTasks.includes(taskId);
  };

  // Función para recargar las entregas después de enviar una tarea
  const refreshSubmissions = async () => {
    if (studentId) {
      const submissions = await fetchStudentTaskSubmissions(studentId);
      const completedTaskIds = submissions
        .filter(sub => sub.is_active)
        .map(sub => sub.task_id);
      setCompletedTasks(completedTaskIds);
    }
  };

  // Consulta para obtener las tareas del curso
  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['courseTasks', courseId],
    queryFn: () => courseId ? fetchCourseTasks(courseId) : Promise.reject('No courseId provided'),
    enabled: !!courseId && visible, // Solo consultar cuando hay un courseId y el modal está visible
    staleTime: 60000, // Datos frescos por 1 minuto
    retry: 1, // Intentar nuevamente 1 vez en caso de error
    retryDelay: 1000, // Esperar 1 segundo entre reintentos
  });

  // Función para abrir el modal de envío de tarea
  const openSubmissionModal = (task: Task) => {
    setSelectedTask(task);
    setSubmissionModalVisible(true);
  };

  // Formatear fecha
  const formatDateString = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return format(date, 'dd/MM/yyyy', { locale: es });
    } catch (e) {
      return dateString;
    }
  };
  // Verificar si una tarea está vencida
  const isTaskOverdue = (dueDate: string): boolean => {
    try {
      // Obtener la fecha actual y establecer horas, minutos, segundos y ms a cero
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      // Convertir la fecha de entrega a objeto Date y establecer horas, minutos, segundos y ms a cero
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      
      // Comparar si la fecha actual es mayor que la fecha de entrega
      return now > due;
    } catch (e) {
      console.error('Error al verificar si la tarea está vencida:', e);
      return false;
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Title style={styles.title}>{courseName ? `Tareas de ${courseName}` : 'Tareas del Curso'}</Title>
          <Text style={styles.subtitle}>Solo tareas publicadas</Text>
          <Divider style={styles.divider} />

          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Cargando tareas...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error al cargar las tareas. Por favor, intente nuevamente.</Text>
              <Button mode="contained" onPress={() => refetch()} style={styles.retryButton}>
                Reintentar
              </Button>
            </View>
          ) : !tasks || tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay tareas disponibles para este curso.</Text>
            </View>
          ) : (
            <View>
              {tasks.map((task) => {
                const isOverdue = isTaskOverdue(task.due_date);
                const isCompleted = isTaskCompleted(task.id);
                
                return (
                  <Card key={task.id} style={styles.taskCard}>
                    <Card.Content>
                      <Title style={styles.taskTitle}>{task.title}</Title>
                      <Paragraph style={styles.taskDescription}>{task.description}</Paragraph>
                      
                      <View style={styles.taskInfoRow}>
                        <Text style={styles.taskInfoLabel}>Fecha de entrega:</Text>
                        <Text 
                          style={[
                            styles.taskInfoValue, 
                            isOverdue && !isCompleted && styles.overdueText
                          ]}
                        >
                          {formatDateString(task.due_date)} {isOverdue && !isCompleted && "(Vencida)"}
                        </Text>
                      </View>
                      
                      <View style={styles.taskInfoRow}>
                        <Text style={styles.taskInfoLabel}>Tipo:</Text>
                        <Text style={styles.taskInfoValue}>
                          {task.extra_conditions.type === 'individual' ? 'Individual' : 'Grupal'}
                        </Text>
                      </View>
                      
                      {task.instructions && (
                        <View style={styles.instructionsContainer}>
                          <Text style={styles.instructionsLabel}>Instrucciones:</Text>
                          <Text style={styles.instructions}>{task.instructions}</Text>
                        </View>
                      )}
                      
                      {/* Botón para completar la tarea */}
                      <Button 
                        mode="contained" 
                        onPress={() => openSubmissionModal(task)}
                        style={[styles.completeButton, isCompleted && styles.completedButton]}
                        icon={isCompleted ? "check-circle" : "file-document-edit-outline"}
                        disabled={isCompleted}
                      >
                        {isCompleted ? 'Tarea Completada' : 'Completar Tarea'}
                      </Button>
                      
                      {isCompleted && (
                        <Text style={styles.completedText}>
                          Ya has enviado una respuesta para esta tarea
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          )}

          <Button 
            mode="outlined" 
            onPress={onDismiss} 
            style={styles.closeButton}
          >
            Cerrar
          </Button>
        </ScrollView>
      </Modal>

      {/* Modal para enviar respuestas de tarea */}
      {selectedTask && (
        <TaskSubmissionModal
          visible={submissionModalVisible}
          onDismiss={() => {
            setSubmissionModalVisible(false);
            refreshSubmissions();
          }}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
          dueDate={selectedTask.due_date}
        />
      )}
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  divider: {
    marginVertical: 10,
  },
  loaderContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    marginTop: 10,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  taskCard: {
    marginBottom: 16,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  taskDescription: {
    marginBottom: 10,
  },
  taskInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  taskInfoLabel: {
    fontWeight: 'bold',
    flex: 1,
  },
  taskInfoValue: {
    flex: 2,
  },
  overdueText: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  instructionsContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  instructionsLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  instructions: {
    fontStyle: 'italic',
  },
  completeButton: {
    marginTop: 15,
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
  completedText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#757575',
    fontSize: 12,
    marginTop: 5,
  },
  closeButton: {
    marginTop: 20,
  },
});

export default CourseTasksModal;
