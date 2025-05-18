import React, { useState } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Paragraph, Chip, List, Card } from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import EditTaskModal from "./EditTaskModal";

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

// Función para obtener las tareas de un curso específico (todos, incluso los no publicados)
const fetchCourseTasks = async (courseId: string): Promise<Task[]> => {
  try {
    const response = await courseClient.get(`/course/${courseId}/tasks`);
    console.log("API tasks response (teacher view):", JSON.stringify(response.data, null, 2));
    
    if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('Formato de respuesta inesperado para tareas:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error al obtener tareas del curso:', error);
    throw error;
  }
};

// Función para publicar una tarea
const publishTask = async (taskId: string): Promise<any> => {
  try {
    const response = await courseClient.put(`/tasks/${taskId}/publish`, { published: true });
    console.log("Tarea publicada exitosamente:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error al publicar tarea:', error);
    throw error;
  }
};

// Función para eliminar una tarea
const deleteTask = async (taskId: string): Promise<any> => {
  try {
    const response = await courseClient.delete(`/tasks/${taskId}`);
    console.log("Tarea eliminada exitosamente:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    throw error;
  }
};

// Props para el componente modal
type TeacherTasksModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
  courseName: string | null;
};

const TeacherTasksModal = ({ visible, onDismiss, courseId, courseName }: TeacherTasksModalProps) => {
  const queryClient = useQueryClient();
  const [publishingTaskId, setPublishingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Consulta para obtener las tareas del curso (todas para los profesores)
  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['teacherCourseTasks', courseId],
    queryFn: () => courseId ? fetchCourseTasks(courseId) : Promise.reject('No courseId provided'),
    enabled: !!courseId && visible, 
    staleTime: 60000, // Datos frescos por 1 minuto
    retry: 1, // Intentar nuevamente 1 vez en caso de error
    retryDelay: 1000, // Esperar 1 segundo entre reintentos
  });

  // Mutación para publicar una tarea
  const publishMutation = useMutation({
    mutationFn: publishTask,
    onMutate: (taskId) => {
      setPublishingTaskId(taskId);
    },
    onSuccess: () => {
      // Invalidar consultas para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['teacherCourseTasks', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courseTasks', courseId] });
      
      setPublishingTaskId(null);
      Alert.alert("Éxito", "La tarea ha sido publicada exitosamente.");
    },
    onError: (error) => {
      console.error("Error al publicar tarea:", error);
      Alert.alert("Error", "No se pudo publicar la tarea. Inténtelo nuevamente.");
      setPublishingTaskId(null);
    }
  });
  
  // Mutación para eliminar una tarea
  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onMutate: (taskId) => {
      setDeletingTaskId(taskId);
    },
    onSuccess: () => {
      // Invalidar consultas para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['teacherCourseTasks', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courseTasks', courseId] });
      
      setDeletingTaskId(null);
      Alert.alert("Éxito", "La tarea ha sido eliminada exitosamente.");
    },
    onError: (error) => {
      console.error("Error al eliminar tarea:", error);
      Alert.alert("Error", "No se pudo eliminar la tarea. Inténtelo nuevamente.");
      setDeletingTaskId(null);
    }
  });

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

  // Manejar la publicación de una tarea
  const handlePublishTask = (task: Task) => {
    Alert.alert(
      "Publicar tarea",
      `¿Está seguro de que desea publicar la tarea "${task.title}"? Una vez publicada estará visible para todos los estudiantes.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Publicar",
          onPress: () => {
            publishMutation.mutate(task.id);
          }
        }
      ]
    );
  };
  
  // Manejar la eliminación de una tarea
  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      "Eliminar tarea",
      `¿Está seguro de que desea eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(task.id);
          }
        }
      ]
    );
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
          <Text style={styles.subtitle}>Vista de profesor - Tareas activas</Text>
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
              <Text style={styles.emptyText}>No hay tareas para este curso.</Text>
            </View>
          ) : tasks.filter(task => task.is_active).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay tareas activas para este curso.</Text>
            </View>
          ) : (
            <View>
              {tasks.filter(task => task.is_active).map((task) => (
                <Card key={task.id} style={[styles.taskCard, !task.published && styles.unpublishedTaskCard]}>
                  <Card.Content>
                    <View style={styles.headerRow}>
                      <Title style={styles.taskTitle}>{task.title}</Title>
                      <Chip 
                        mode="outlined" 
                        style={task.published ? styles.publishedChip : styles.unpublishedChip}
                      >
                        {task.published ? "Publicado" : "No publicado"}
                      </Chip>
                    </View>
                    
                    <Paragraph style={styles.taskDescription}>{task.description}</Paragraph>
                    
                    <View style={styles.taskInfoRow}>
                      <Text style={styles.taskInfoLabel}>Fecha de entrega:</Text>
                      <Text style={styles.taskInfoValue}>{formatDateString(task.due_date)}</Text>
                    </View>
                    
                    <View style={styles.taskInfoRow}>
                      <Text style={styles.taskInfoLabel}>Tipo:</Text>
                      <Text style={styles.taskInfoValue}>{task.extra_conditions?.type || 'No especificado'}</Text>
                    </View>
                    
                    {task.instructions && (
                      <View style={styles.taskInfoSection}>
                        <Text style={styles.taskInfoLabel}>Instrucciones:</Text>
                        <Text style={styles.instructions}>{task.instructions}</Text>
                      </View>
                    )}
                    
                    <View style={styles.buttonRow}>
                      {/* Botón para editar la tarea */}
                      <Button 
                        mode="outlined" 
                        style={styles.actionButton}
                        icon="pencil"
                        onPress={() => {
                          setSelectedTask(task);
                          setEditModalVisible(true);
                        }}
                      >
                        Editar
                      </Button>
                      
                      {/* Botón para eliminar la tarea */}
                      <Button 
                        mode="outlined" 
                        style={styles.deleteButton}
                        icon="delete"
                        onPress={() => handleDeleteTask(task)}
                        loading={deletingTaskId === task.id}
                        disabled={deletingTaskId !== null || publishingTaskId !== null}
                      >
                        Eliminar
                      </Button>
                    </View>
                    
                    {/* Botón de publicar, solo para tareas no publicadas */}
                    {!task.published && (
                      <Button 
                        mode="contained" 
                        style={styles.publishButton} 
                        onPress={() => handlePublishTask(task)}
                        loading={publishingTaskId === task.id}
                        disabled={publishingTaskId !== null || deletingTaskId !== null}
                      >
                        Publicar tarea
                      </Button>
                    )}
                  </Card.Content>
                </Card>
              ))}
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

      {/* Modal de edición de tarea */}
      {selectedTask && (
        <EditTaskModal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          task={selectedTask}
          courseId={courseId}
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
  unpublishedTaskCard: {
    borderWidth: 1,
    borderColor: '#FFA500',
    backgroundColor: '#FFFAF0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  publishedChip: {
    backgroundColor: '#E8F5E9',
  },
  unpublishedChip: {
    backgroundColor: '#FFF3E0',
  },
  taskDescription: {
    marginBottom: 10,
  },
  taskInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  taskInfoSection: {
    marginTop: 5,
    marginBottom: 5,
  },
  taskInfoLabel: {
    fontWeight: 'bold',
    flex: 1,
  },
  taskInfoValue: {
    flex: 2,
  },
  instructions: {
    marginTop: 5,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: '#D32F2F',
  },
  editButton: {
    marginTop: 15,
    marginBottom: 8,
  },
  publishButton: {
    marginTop: 8,
    backgroundColor: '#E65100',
  },
  closeButton: {
    marginTop: 20,
  },
});

export default TeacherTasksModal;
