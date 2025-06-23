import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text, Card, FAB, Portal, Button, ActivityIndicator, Menu } from 'react-native-paper';
import { useSession } from '@/contexts/session';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import CreateFeedbackModal from '../../components/CreateFeedbackModal';
import { courseClient } from '@/lib/http';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDate } from "date-fns";

interface StudentFeedback {
  id: string;
  course_id: string;
  student_id: string;
  published_at: string;
  content: string;
  score: number;
}

export default function MisFeedbacksScreen() {
  const { session } = useSession();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 3;

  // Filtros
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState({
    course_id: '' as string,
    published_from: null as Date | null,
    published_to: null as Date | null,
    score: '' as string,
  });
  
  // Filtros temporales (para editar antes de aplicar)
  const [tempFilters, setTempFilters] = useState({
    course_id: '' as string,
    published_from: null as Date | null,
    published_to: null as Date | null,
    score: '' as string,
  });
  
  // Estados para date pickers y dropdown
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [courseDropdownVisible, setCourseDropdownVisible] = useState(false);  // Get student's feedbacks with pagination and filters
  const { data: feedbacksData, isLoading: feedbacksLoading, refetch: refetchFeedbacks } = useQuery({
    queryKey: ['student-feedbacks', session?.userId, currentPage, filters],
    queryFn: async () => {
      if (!session?.token || !session?.userId) throw new Error('No access token or user ID');
      
      // Construir parámetros de consulta
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });
      
      // Agregar filtros si están definidos
      if (filters.course_id) {
        params.append('course_id', filters.course_id);
      }
      if (filters.published_from) {
        params.append('published_from', formatDate(filters.published_from, 'yyyy-MM-dd'));
      }
      if (filters.published_to) {
        params.append('published_to', formatDate(filters.published_to, 'yyyy-MM-dd'));
      }
      if (filters.score) {
        params.append('score', filters.score);
      }
      
      const response = await courseClient.get(`/feedback/student/${session.userId}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.token}`,
        },
      });
      
      return response.data;
    },
    enabled: !!session?.token && !!session?.userId,
  });
  const feedbacks = feedbacksData?.items || [];
  const totalItems = feedbacksData?.totalItems || 0;
  const totalPages = feedbacksData?.totalPages || 1;
  const currentPageFromData = feedbacksData?.currentPage || 1;
  console.log('Feedbacks:', feedbacks);

  // Get course names for the feedbacks
  const { data: coursesData } = useQuery({
    queryKey: ['courses-for-feedbacks'],
    queryFn: async () => {
      if (!session?.token) throw new Error('No access token');
      
      const response = await courseClient.get('/courses', {
        headers: {
          'Authorization': `Bearer ${session.token}`,
        },
      });
      
      return response.data?.response || [];
    },
    enabled: !!session?.token && feedbacks.length > 0,
  });

  // Helper function to get course name by ID
  const getCourseName = (courseId: string) => {
    const course = coursesData?.find((c: any) => c.course_id === courseId);
    return course ? course.course_name : `Curso ID: ${courseId}`;
  };

  const handleCreateFeedback = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };  const handleFeedbackCreated = () => {
    setShowCreateModal(false);
    setCurrentPage(1); // Reset to first page when new feedback is created
    refetchFeedbacks(); // Refrescar la lista de feedbacks
    Alert.alert('Éxito', 'Feedback creado exitosamente');
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

  // Funciones para manejar filtros
  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    const emptyFilters = {
      course_id: '',
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

  const handleCourseFilter = (courseId: string) => {
    setTempFilters(prev => ({ ...prev, course_id: courseId }));
    setCourseDropdownVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Mis Feedbacks</Text>
            <Text style={styles.subtitle}>
              Aquí podrás ver todos los feedbacks que has enviado
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

      {/* Control para mostrar/ocultar filtros */}
      <View style={styles.headerControls}>
        <TouchableOpacity onPress={() => setFiltersVisible(!filtersVisible)} style={{ marginBottom: 16, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            {filtersVisible ? "Ocultar filtros ▲" : "Mostrar filtros ▼"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      {filtersVisible && (
        <View style={styles.filtersContainer}>
          {/* Filtro por curso */}
          <Text style={styles.filterSectionTitle}>Filtrar por curso:</Text>
          <Menu
            visible={courseDropdownVisible}
            onDismiss={() => setCourseDropdownVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setCourseDropdownVisible(true)}
                icon="chevron-down"
                style={styles.dropdownButton}
                contentStyle={styles.dropdownButtonContent}
              >
                {tempFilters.course_id 
                  ? getCourseName(tempFilters.course_id)
                  : 'Todos los cursos'
                }
              </Button>
            }
          >
            <Menu.Item
              onPress={() => handleCourseFilter('')}
              title="Todos los cursos"
            />
            {coursesData?.map((course: any) => (
              <Menu.Item
                key={course.course_id}
                onPress={() => handleCourseFilter(course.course_id)}
                title={course.course_name}
              />
            ))}
          </Menu>

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

      <ScrollView style={styles.content}>
        {feedbacksLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Cargando tus feedbacks...</Text>
          </View>
        ) : feedbacks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                Aún no has enviado ningún feedback.
              </Text>
              <Text style={styles.emptySubtext}>
                Usa el botón "Nuevo Feedback" para crear tu primer feedback sobre un curso.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalItems}</Text>
                <Text style={styles.statLabel}>Total Feedbacks</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{feedbacks.length}</Text>
                <Text style={styles.statLabel}>En esta página</Text>
              </View>
              {totalPages > 1 && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{currentPage}/{totalPages}</Text>
                  <Text style={styles.statLabel}>Página</Text>
                </View>
              )}
            </View>
            {feedbacks.map((feedback: StudentFeedback, index: number) => (
              <Card key={feedback.id} style={styles.feedbackCard}>
                <Card.Content>
                  <View style={styles.feedbackHeader}>
                    <Text style={styles.feedbackTitle}>
                      Feedback #{(currentPage - 1) * limit + index + 1}
                    </Text>
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingText}>{feedback.score}/5</Text>
                    </View>
                  </View>
                  <Text style={styles.feedbackContent}>
                    {feedback.content}
                  </Text>
                  <Text style={styles.feedbackCourseId}>
                    Curso: {getCourseName(feedback.course_id)}
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
            ))}
          </>
        )}
        </ScrollView>

      {/* Pagination Controls */}
      {totalPages > 1 && (
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

      <CreateFeedbackModal
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
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  headerButton: {
    backgroundColor: '#6200ea',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  emptyCard: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
  },  feedbackCard: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },  statsContainer: {
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
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  feedbackContent: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  feedbackCourseId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },  feedbackDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 20,
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
  dropdownButton: {
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  dropdownButtonContent: {
    justifyContent: 'flex-start',
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
  },
  picker: {
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
