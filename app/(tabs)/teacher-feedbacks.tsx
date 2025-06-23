import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Menu, Divider, ActivityIndicator } from 'react-native-paper';
import { useSession } from '@/contexts/session';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import CreateTeacherFeedbackModal from '@/components/CreateTeacherFeedbackModal';
import { courseClient } from '@/lib/http';

interface TeacherFeedback {
  id: string;
  course_id: string;
  student_id: string | null;
  published_at: string;
  content: string;
  score: number;
}

interface TeacherCourse {
  course_id: string;
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  category: string | null;
}

export default function TeacherFeedbacksScreen() {
  const { session } = useSession();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [coursesDropdownVisible, setCoursesDropdownVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 3;// Get teacher's courses
  const { data: teacherCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['teacher-courses', session?.userId],
    queryFn: async () => {
      if (!session?.token) throw new Error('No access token');
        try {
        // Primero obtenemos la lista básica de cursos
        const response = await courseClient.get(`/courses`, {
          headers: {
            'Authorization': `Bearer ${session?.token}`,
          }
        });
        console.log('Cursos básicos del teacher:', response.data);
        
        const allCourses = response.data?.response || [];
        
        // Ahora filtraremos los cursos donde el teacher actual es el instructor
        const teacherCourses: TeacherCourse[] = [];
        
        for (const course of allCourses) {
          try {
            console.log(course.course_id);
            // Hacer GET para obtener detalles del curso
            const courseDetailResponse: any = await courseClient.get(`/courses/${course.course_id}`, {
              headers: {
                'Authorization': `Bearer ${session?.token}`,
              }
            });
            
            const courseDetail: any = courseDetailResponse.data?.response;
            console.log(`Detalles del curso ${course.course_id}:`, courseDetail);
            // Verificar si el teacher actual es el instructor de este curso
            
            if (courseDetail && courseDetail.teacher === session?.email) {
              // Solo guardamos course_id y course_name
              teacherCourses.push({
                course_id: course.course_id,
                course_name: course.course_name,
                description: course.description,
                date_init: course.date_init,
                date_end: course.date_end,
                quota: course.quota,
                category: course.category
              });
            }
          } catch (error) {
            console.error(`Error obteniendo detalles del curso ${course.course_id}:`, error);
          }
        }
        
        return teacherCourses;
      } catch (error) {
        console.error('Error obteniendo cursos del teacher:', error);
        throw error;
      }
    },
    enabled: !!session?.token,
  });  // Get feedbacks for selected course
  const { data: feedbacksData, isLoading: feedbacksLoading, refetch: refetchFeedbacks } = useQuery({
    queryKey: ['course-feedbacks', selectedCourseId, currentPage],
    queryFn: async () => {
      if (!session?.token || !selectedCourseId) return null;
      
      const response = await courseClient.get(`/feedback/course/${selectedCourseId}?page=${currentPage}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${session.token}`,
        },
      });
      
      return response.data;
    },
    enabled: !!session?.token && !!selectedCourseId,
  });

  const feedbacks = feedbacksData?.items || [];
  const totalPages = feedbacksData?.totalPages || 1;
  const totalItems = feedbacksData?.totalItems || 0;

  const handleCreateFeedback = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };
  const handleFeedbackCreated = () => {
    setShowCreateModal(false);
    refetchFeedbacks();
    Alert.alert('Éxito', 'Feedback creado exitosamente');
  };

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentPage(1); // Reset to first page when changing course
    setCoursesDropdownVisible(false);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  const selectedCourse = teacherCourses?.find((course: TeacherCourse) => course.course_id === selectedCourseId);

  // Calculate statistics
  const averageRating = feedbacks && feedbacks.length > 0 
    ? (feedbacks.reduce((sum: number, feedback: TeacherFeedback) => sum + feedback.score, 0) / feedbacks.length).toFixed(1)
    : 0;
  if (coursesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 16 }}>Cargando cursos...</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Feedbacks de Cursos</Text>
            <Text style={styles.subtitle}>
              Selecciona un curso para ver los feedbacks de los estudiantes
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={handleCreateFeedback}
            style={styles.headerButton}
            icon="plus"
          >
            Nuevo Feedback
          </Button>
        </View>
      </View>

      <View style={styles.content}>
        {/* Course selector */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Seleccionar Curso:</Text>
          <Menu
            visible={coursesDropdownVisible}
            onDismiss={() => setCoursesDropdownVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setCoursesDropdownVisible(true)}
                icon="chevron-down"
                style={styles.dropdownButton}
                contentStyle={styles.dropdownButtonContent}              >
                {selectedCourse ? selectedCourse.course_name : 'Seleccionar curso...'}
              </Button>
            }
          >
            {teacherCourses?.map((course: TeacherCourse) => (
              <Menu.Item
                key={course.course_id}
                onPress={() => handleCourseChange(course.course_id)}
                title={course.course_name}
              />
            ))}
          </Menu>
        </View>
        {/* Statistics */}
        {selectedCourseId && feedbacks && feedbacks.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalItems}</Text>
              <Text style={styles.statLabel}>Total Feedbacks</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{averageRating}</Text>
              <Text style={styles.statLabel}>Promedio Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentPage}/{totalPages}</Text>
              <Text style={styles.statLabel}>Página</Text>
            </View>
          </View>
        )}

        {/* Feedbacks list */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {feedbacksLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={{ marginTop: 16 }}>Cargando feedbacks...</Text>
            </View>
          ) : !selectedCourseId ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Selecciona un curso</Text>
              <Text style={styles.emptySubtitle}>
                Elige un curso del menú desplegable para ver los feedbacks de los estudiantes
              </Text>
            </View>
          ) : feedbacks && feedbacks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No hay feedbacks aún</Text>
              <Text style={styles.emptySubtitle}>
                Los estudiantes aún no han dejado feedbacks para este curso
              </Text>
            </View>
          ) : (
            feedbacks?.map((feedback: TeacherFeedback, index: number) => (
              <Card key={feedback.id || index} style={styles.feedbackCard}>
                <Card.Content>
                  <View style={styles.feedbackHeader}>
                    <Text style={styles.feedbackTitle}>
                      {feedback.student_id || 'Estudiante Anónimo'}
                    </Text>
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingText}>{feedback.score}/5</Text>
                    </View>
                  </View>
                  <Text style={styles.feedbackContent}>
                    {feedback.content}
                  </Text>
                  <Text style={styles.feedbackDate}>
                    {new Date(feedback.published_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>
        {/* Pagination Controls */}
        {selectedCourseId && totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <Button
              mode="outlined"
              disabled={currentPage <= 1}
              onPress={handlePrevPage}
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
              onPress={handleNextPage}
              style={styles.paginationButton}
              icon="chevron-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
            >
              Siguiente
            </Button>
          </View>
        )}
      </View>

      <CreateTeacherFeedbackModal
        visible={showCreateModal}
        onDismiss={handleCloseModal}
        onFeedbackCreated={handleFeedbackCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  headerButton: {
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  selectorContainer: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dropdownButton: {
    justifyContent: 'flex-start',
  },
  dropdownButtonContent: {
    justifyContent: 'flex-start',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  feedbackCard: {
    marginBottom: 15,
    elevation: 2,
    backgroundColor: '#fff',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  ratingContainer: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  feedbackEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  feedbackContent: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    lineHeight: 22,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  feedbackScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196f3',
  },  paginationContainer: {
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
