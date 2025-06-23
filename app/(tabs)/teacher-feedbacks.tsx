import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text, Card, Button, Menu, Divider, ActivityIndicator, TextInput } from 'react-native-paper';
import { useSession } from '@/contexts/session';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import CreateTeacherFeedbackModal from '@/components/CreateTeacherFeedbackModal';
import { courseClient } from '@/lib/http';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDate } from "date-fns";

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
  const limit = 3;
    // Filtros
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState({
    published_from: null as Date | null,
    published_to: null as Date | null,
    score: '' as string,
  });
  
  // Filtros temporales (para editar antes de aplicar)
  const [tempFilters, setTempFilters] = useState({
    published_from: null as Date | null,
    published_to: null as Date | null,
    score: '' as string,
  });
  
  // Estados para date pickers
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);// Get teacher's courses
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
    queryKey: ['course-feedbacks', selectedCourseId, currentPage, filters],
    queryFn: async () => {
      if (!session?.token || !selectedCourseId) return null;
      
      // Construir parámetros de consulta
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      
      // Agregar filtros si están definidos
      if (filters.published_from) {
        params.append('published_from', formatDate(filters.published_from, 'yyyy-MM-dd'));
      }
      if (filters.published_to) {
        params.append('published_to', formatDate(filters.published_to, 'yyyy-MM-dd'));
      }
      if (filters.score) {
        params.append('score', filters.score);
      }
      
      const response = await courseClient.get(`/feedback/course/${selectedCourseId}?${params.toString()}`, {
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

  // Get course feedback resume
  const { data: feedbackResume, isLoading: resumeLoading } = useQuery({
    queryKey: ['course-feedback-resume', selectedCourseId],
    queryFn: async () => {
      if (!session?.token || !selectedCourseId) return null;
      
      const response = await courseClient.get(`/feedback/course/${selectedCourseId}/resume`, {
        headers: {
          'Authorization': `Bearer ${session.token}`,
        },
      });
      
      return response.data;
    },
    enabled: !!session?.token && !!selectedCourseId,
  });

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
  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    const emptyFilters = {
      published_from: null,
      published_to: null,
      score: '',
    };
    setFilters(emptyFilters);
    setTempFilters(emptyFilters);
    setCurrentPage(1);
  };

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromDatePicker(false);
    if (selectedDate) {
      setTempFilters(prev => ({ ...prev, published_from: selectedDate }));
    }
  };

  const onToDateChange = (event: any, selectedDate?: Date) => {
    setShowToDatePicker(false);
    if (selectedDate) {
      setTempFilters(prev => ({ ...prev, published_to: selectedDate }));
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
                contentStyle={styles.dropdownButtonContent}
              >
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

        {/* Control para mostrar/ocultar filtros */}
        {selectedCourseId && (
          <View style={styles.headerControls}>
            <TouchableOpacity onPress={() => setFiltersVisible(!filtersVisible)} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                {filtersVisible ? "Ocultar filtros ▲" : "Mostrar filtros ▼"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filtros */}
        {filtersVisible && selectedCourseId && (
          <View style={styles.filtersContainer}>
            {/* Filtros de fecha */}
            <Text style={styles.filterSectionTitle}>Filtrar por fecha de publicación:</Text>
            <View style={styles.dateFilterContainer}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Desde:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowFromDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {tempFilters.published_from 
                      ? formatDate(tempFilters.published_from, 'dd/MM/yyyy')
                      : 'Seleccionar fecha'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Hasta:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowToDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {tempFilters.published_to 
                      ? formatDate(tempFilters.published_to, 'dd/MM/yyyy')
                      : 'Seleccionar fecha'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filtro de score */}
            <Text style={styles.filterSectionTitle}>Filtrar por puntuación:</Text>
            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={tempFilters.score}
                onValueChange={(value) => {
                  setTempFilters(prev => ({ ...prev, score: value }));
                }}
                style={styles.picker}
              >
                <Picker.Item label="Todas las puntuaciones" value="" />
                <Picker.Item label="1 estrella" value="1" />
                <Picker.Item label="2 estrellas" value="2" />
                <Picker.Item label="3 estrellas" value="3" />
                <Picker.Item label="4 estrellas" value="4" />
                <Picker.Item label="5 estrellas" value="5" />
              </Picker>
            </View>

            {/* Botones de acción */}
            <View style={styles.filterButtonsContainer}>
              <Button
                mode="contained"
                onPress={applyFilters}
                style={styles.applyFiltersButton}
                icon="check"
              >
                Aplicar filtros
              </Button>
              
              <Button
                mode="outlined"
                onPress={clearFilters}
                style={styles.clearFiltersButton}
                icon="filter-off"
              >
                Limpiar filtros
              </Button>
            </View>
          </View>
        )}
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
          </View>        )}

        {/* Course Feedback Resume */}
        {selectedCourseId && feedbackResume && (
          <View style={styles.resumeContainer}>
            <Text style={styles.resumeTitle}>Resumen de Feedbacks del Curso</Text>
            {resumeLoading ? (
              <View style={styles.resumeLoadingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.resumeLoadingText}>Cargando resumen...</Text>
              </View>
            ) : (
              <View style={styles.resumeContent}>
                <Text style={styles.resumeText}>
                  {feedbackResume.resume || feedbackResume.summary || 'No hay resumen disponible'}
                </Text>
              </View>
            )}
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
      {/* Date Pickers */}
      {showFromDatePicker && (
        <DateTimePicker
          value={tempFilters.published_from || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onFromDateChange}
        />
      )}
      
      {showToDatePicker && (
        <DateTimePicker
          value={tempFilters.published_to || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onToDateChange}
        />
      )}

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
  },  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  resumeContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  resumeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  resumeLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  resumeLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  resumeContent: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  resumeText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    fontStyle: 'italic',
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
    marginBottom: 16,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },  picker: {
    height: 50,
    width: '100%',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  applyFiltersButton: {
    flex: 1,
  },
  clearFiltersButton: {
    flex: 1,
  },
});
