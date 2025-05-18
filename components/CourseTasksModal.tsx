import React, { useState } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Paragraph, Chip, List, Card } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "@/contexts/session";

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

// Props para el componente modal
type CourseTasksModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
  courseName: string | null;
};

const CourseTasksModal = ({ visible, onDismiss, courseId, courseName }: CourseTasksModalProps) => {
  const { session } = useSession();

  // Consulta para obtener las tareas del curso
  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['courseTasks', courseId],
    queryFn: () => courseId ? fetchCourseTasks(courseId) : Promise.reject('No courseId provided'),
    enabled: !!courseId && visible, // Solo consultar cuando hay un courseId y el modal está visible
    staleTime: 60000, // Datos frescos por 1 minuto
    retry: 1, // Intentar nuevamente 1 vez en caso de error
    retryDelay: 1000, // Esperar 1 segundo entre reintentos
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
              {tasks.map((task) => (
                <Card key={task.id} style={styles.taskCard}>
                  <Card.Content>
                    <Title style={styles.taskTitle}>{task.title}</Title>
                    <Paragraph style={styles.taskDescription}>{task.description}</Paragraph>
                    
                    <View style={styles.taskInfoRow}>
                      <Text style={styles.taskInfoLabel}>Fecha de entrega:</Text>
                      <Text style={styles.taskInfoValue}>{formatDateString(task.due_date)}</Text>
                    </View>
                    
                    <View style={styles.taskInfoRow}>
                      <Text style={styles.taskInfoLabel}>Tipo:</Text>
                      <Text style={styles.taskInfoValue}>{task.extra_conditions.type === 'individual' ? 'Individual' : 'Grupal'}</Text>
                    </View>
                    
                    {task.instructions && (
                      <View style={styles.instructionsContainer}>
                        <Text style={styles.instructionsLabel}>Instrucciones:</Text>
                        <Text style={styles.instructions}>{task.instructions}</Text>
                      </View>
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
  closeButton: {
    marginTop: 20,
  },
});

export default CourseTasksModal;
