import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Paragraph, Chip, List } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Tipos para la respuesta detallada del curso
type ScheduleItem = {
  day: string;
  time: string;
};

type RequiredCourse = {
  course_name: string;
};

type CourseDetailResponse = {
  courses: {
    course_name: string;
    description: string;
    date_init: string;
    date_end: string;
    quota: number;
    category: string | null;
    objetives: string | null;
    content: string | null;
    required_courses: RequiredCourse[] | [];
    instructor_profile: string | null;
    modality: string | null;
    schedule: ScheduleItem[] | [];
  }
};

// Función para obtener los detalles de un curso específico
const fetchCourseDetail = async (courseId: string): Promise<CourseDetailResponse> => {
  const response = await courseClient.get(`/courses/${courseId}`);
  return response.data;
};

// Props para el componente modal
type CourseDetailModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
};

const CourseDetailModal = ({ visible, onDismiss, courseId }: CourseDetailModalProps) => {
  // Consulta para obtener los detalles del curso
  const { data: courseDetail, isLoading, error, refetch } = useQuery({
    queryKey: ['courseDetail', courseId],
    queryFn: () => courseId ? fetchCourseDetail(courseId) : Promise.reject('No courseId provided'),
    enabled: !!courseId && visible, // Solo consultar cuando hay un courseId y el modal está visible
    staleTime: 60000, // Datos frescos por 1 minuto
  });

  // Formatear fecha
  const formatDateString = (dateString: string) => {
    try {
      // Si la fecha ya está en formato DD/MM/YY, la devolvemos tal cual
      if (dateString.includes('/')) {
        return dateString;
      }
      
      // Si no, asumimos que es ISO y la formateamos
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Cargando detalles del curso...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Error al cargar los detalles del curso
              </Text>
              <Button mode="contained" onPress={() => refetch()}>
                Intentar nuevamente
              </Button>
            </View>
          ) : courseDetail ? (
            <>
              <Title style={styles.title}>{courseDetail.courses.course_name}</Title>
              
              {courseDetail.courses.category && (
                <Chip 
                  icon="tag" 
                  style={styles.categoryChip}
                >
                  {courseDetail.courses.category}
                </Chip>
              )}
              
              <Divider style={styles.divider} />
              
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <Paragraph style={styles.description}>{courseDetail.courses.description}</Paragraph>
              </View>
              
              <View style={styles.rowContainer}>
                {/* {courseDetail.courses.academic_level && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Nivel académico:</Text>
                    <Text style={styles.infoValue}>{courseDetail.courses.academic_level}</Text>
                  </View>
                )} */}
                
                {courseDetail.courses.modality && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Modalidad:</Text>
                    <Text style={styles.infoValue}>{courseDetail.courses.modality}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.rowContainer}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Fecha inicio:</Text>
                  <Text style={styles.infoValue}>{formatDateString(courseDetail.courses.date_init)}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Fecha fin:</Text>
                  <Text style={styles.infoValue}>{formatDateString(courseDetail.courses.date_end)}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Cupo:</Text>
                <Text style={styles.infoValue}>{courseDetail.courses.quota} estudiantes</Text>
              </View>
              
              <Divider style={styles.divider} />
              
              {courseDetail.courses.objetives && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Objetivos</Text>
                  <Paragraph style={styles.description}>{courseDetail.courses.objetives}</Paragraph>
                </View>
              )}
              
              {courseDetail.courses.content && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Contenido</Text>
                  <Paragraph style={styles.description}>{courseDetail.courses.content}</Paragraph>
                </View>
              )}
              
              {courseDetail.courses.instructor_profile && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Perfil del instructor</Text>
                  <Paragraph style={styles.description}>{courseDetail.courses.instructor_profile}</Paragraph>
                </View>
              )}
              
              <Divider style={styles.divider} />
              
              {courseDetail.courses.schedule && courseDetail.courses.schedule.length > 0 && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Horario</Text>
                  {courseDetail.courses.schedule.map((item, index) => (
                    <View key={index} style={styles.scheduleItem}>
                      <Text style={styles.scheduleDay}>{item.day}:</Text>
                      <Text style={styles.scheduleTime}>{item.time}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {courseDetail.courses.required_courses && courseDetail.courses.required_courses.length > 0 && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Cursos prerequisitos</Text>
                  {courseDetail.courses.required_courses.map((course, index) => (
                    <Text key={index} style={styles.prerequisiteItem}>
                      • {course.course_name}
                    </Text>
                  ))}
                </View>
              )}
              
              <Button 
                mode="outlined" 
                style={styles.closeButton} 
                onPress={onDismiss}
              >
                Cerrar
              </Button>
            </>
          ) : (
            <Text>No se encontraron detalles del curso</Text>
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    maxHeight: '90%',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  divider: {
    marginVertical: 15,
  },
  sectionContainer: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  rowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoItem: {
    marginBottom: 10,
    marginRight: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  scheduleItem: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'center',
  },
  scheduleDay: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
    width: 80,
  },
  scheduleTime: {
    fontSize: 16,
  },
  prerequisiteItem: {
    fontSize: 16,
    marginBottom: 5,
  },
  inscriptionButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  closeButton: {
    marginBottom: 10,
  },
});

export default CourseDetailModal;