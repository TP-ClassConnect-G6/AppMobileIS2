import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Paragraph, Chip, List, Card } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Tipo para los exámenes
type Exam = {
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
  };
  published: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

// Función para obtener los exámenes de un curso específico (solo publicados y activos para estudiantes)
const fetchCourseExams = async (courseId: string): Promise<Exam[]> => {
  try {
    const response = await courseClient.get(`/course/${courseId}/exams`);
    console.log("API exams response (student view):", JSON.stringify(response.data, null, 2));
    
    if (Array.isArray(response.data)) {
      // Filtrar exámenes para mostrar solo los publicados y activos a los estudiantes
      const validExams = response.data.filter((exam: Exam) => exam.published === true && exam.is_active === true);
      console.log(`Mostrando ${validExams.length} de ${response.data.length} exámenes (solo publicados y activos)`);
      return validExams;
    } else {
      console.warn('Formato de respuesta inesperado para exámenes:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error al obtener exámenes del curso:', error);
    throw error;
  }
};

// Props para el componente modal
type CourseExamsModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
  courseName: string | null;
};

const CourseExamsModal = ({ visible, onDismiss, courseId, courseName }: CourseExamsModalProps) => {
  // Consulta para obtener los exámenes del curso
  const { data: exams, isLoading, error, refetch } = useQuery({
    queryKey: ['courseExams', courseId],
    queryFn: () => courseId ? fetchCourseExams(courseId) : Promise.reject('No courseId provided'),
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
          <Title style={styles.title}>{courseName ? `Exámenes de ${courseName}` : 'Exámenes del Curso'}</Title>
          <Text style={styles.subtitle}>Se muestran solo exámenes publicados y activos</Text>
          <Divider style={styles.divider} />

          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Cargando exámenes...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error al cargar los exámenes. Por favor, intente nuevamente.</Text>
              <Button mode="contained" onPress={() => refetch()} style={styles.retryButton}>
                Reintentar
              </Button>
            </View>
          ) : !exams || exams.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay exámenes publicados y activos para este curso.
              </Text>
            </View>
          ) : (
            <View>
              {exams.map((exam) => (
                <Card key={exam.id} style={styles.examCard}>
                  <Card.Content>
                    <Title style={styles.examTitle}>{exam.title}</Title>
                    <Paragraph style={styles.examDescription}>{exam.description}</Paragraph>
                    
                    <View style={styles.examInfoRow}>
                      <Text style={styles.examInfoLabel}>Fecha:</Text>
                      <Text style={styles.examInfoValue}>{formatDateString(exam.date)}</Text>
                    </View>
                    
                    <View style={styles.examInfoRow}>
                      <Text style={styles.examInfoLabel}>Duración:</Text>
                      <Text style={styles.examInfoValue}>{exam.duration} minutos</Text>
                    </View>
                    
                    <View style={styles.examInfoRow}>
                      <Text style={styles.examInfoLabel}>Ubicación:</Text>
                      <Text style={styles.examInfoValue}>{exam.location}</Text>
                    </View>
                    
                    <View style={styles.examInfoRow}>
                      <Text style={styles.examInfoLabel}>Libro abierto:</Text>
                      <Text style={styles.examInfoValue}>{exam.additional_info?.open_book ? 'Sí' : 'No'}</Text>
                    </View>
                    
                    {exam.additional_info?.grace_period && (
                      <View style={styles.examInfoRow}>
                        <Text style={styles.examInfoLabel}>Tiempo de tolerancia:</Text>
                        <Text style={styles.examInfoValue}>{exam.additional_info.grace_period} minutos</Text>
                      </View>
                    )}
                    
                    {exam.additional_info?.submission_rules && (
                      <View style={styles.examInfoSection}>
                        <Text style={styles.examInfoLabel}>Reglas de entrega:</Text>
                        <Text style={styles.submissionRules}>{exam.additional_info.submission_rules}</Text>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}

          <Button mode="outlined" onPress={onDismiss} style={styles.closeButton}>
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
  examCard: {
    marginBottom: 16,
    elevation: 2,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  examDescription: {
    marginBottom: 10,
  },
  examInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  examInfoSection: {
    marginTop: 5,
    marginBottom: 5,
  },
  examInfoLabel: {
    fontWeight: 'bold',
    flex: 1,
  },
  examInfoValue: {
    flex: 2,
  },
  submissionRules: {
    marginTop: 5,
    fontStyle: 'italic',
  },
  closeButton: {
    marginTop: 20,
  },
});

export default CourseExamsModal;
