import React, { useState } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert, Platform, Dimensions } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Card, Menu } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
// @ts-ignore
import { LineChart, BarChart } from "react-native-chart-kit";
import { client, courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";
import DateTimePicker from '@react-native-community/datetimepicker';

const screenWidth = Dimensions.get("window").width;

// Tipos para las tendencias de aprendizaje
type LearningTrends = {
  courseId: string;
  period: {
    from: string;
    to: string;
  };
  trends: {
    tasks: Array<{ date: string; createdTasks: number; averageTaskCompletion: number }>;
    exams: Array<{ date: string; averageScore: number }>;
  };
  anomalies: {
    tasks: Array<any>;
    exams: Array<any>;
  };
  recommendations: Array<string>;
};

// Tipos para el perfil de usuario
type UserProfile = {
  user_id: string;
  user_type: string;
  name: string;
  bio: string;
};

// Tipos para las registraciones del curso
type CourseRegistration = {
  registration_id: string;
  course_id: string;
  user_id: string;
  registration_date: string;
  registration_status: string;
};

// Función para obtener tendencias de aprendizaje
const fetchLearningTrends = async (courseId: string, token: string, from: string, to: string, studentId?: string): Promise<LearningTrends> => {
  try {
    let url = `/learning-trends?courseId=${courseId}&from=${from}&to=${to}`;
    if (studentId && studentId.trim()) {
      url += `&studentId=${studentId}`;
    }
    const response = await courseClient.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log("Learning trends response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error al obtener tendencias de aprendizaje:', error);
    throw error;
  }
};

// Función para obtener el perfil de un usuario
const fetchUserProfile = async (userId: string, token: string): Promise<UserProfile> => {
  try {
    const response = await client.get(`/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log("User profile response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error al obtener perfil del usuario:', error);
    throw error;
  }
};

// Función para obtener las registraciones de cursos
const fetchCourseRegistrations = async (token: string): Promise<CourseRegistration[]> => {
  try {
    const response = await courseClient.get('/courses/registrations', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log("Course registrations response:", response.data);
    return response.data.response || [];
  } catch (error) {
    console.error('Error al obtener registraciones del curso:', error);
    throw error;
  }
};

// Props para el componente modal
type LearningTrendsModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
  courseName: string | null;
};

const LearningTrendsModal = ({ visible, onDismiss, courseId, courseName }: LearningTrendsModalProps) => {
  const { session } = useSession();

  // Estados para los filtros
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [showStudentMenu, setShowStudentMenu] = useState(false);

  // Estados para los filtros aplicados
  const [appliedFromDate, setAppliedFromDate] = useState(new Date());
  const [appliedToDate, setAppliedToDate] = useState(new Date());
  const [appliedStudentId, setAppliedStudentId] = useState('');

  // Función para formatear fecha a string YYYY-MM-DD
  const formatDateToString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Consulta para obtener las registraciones del curso
  const { data: registrations } = useQuery({
    queryKey: ['courseRegistrations'],
    queryFn: () => {
      if (!session?.token) {
        throw new Error('No token provided');
      }
      return fetchCourseRegistrations(session.token);
    },
    enabled: !!session?.token && visible,
    staleTime: 300000,
  });

  // Filtrar estudiantes por el curso actual
  const courseStudents = registrations
    ? registrations
        .filter(reg => reg.course_id === courseId && reg.registration_status === 'active')
        .map(reg => reg.user_id)
    : [];

  // Consulta para obtener las tendencias de aprendizaje
  const { data: trends, isLoading, error, refetch } = useQuery({
    queryKey: ['learningTrends', courseId, formatDateToString(appliedFromDate), formatDateToString(appliedToDate), appliedStudentId],
    queryFn: () => {
      if (!courseId || !session?.token) {
        throw new Error('No courseId or token provided');
      }
      return fetchLearningTrends(courseId, session.token, formatDateToString(appliedFromDate), formatDateToString(appliedToDate), appliedStudentId);
    },
    enabled: !!courseId && !!session?.token && visible,
    staleTime: 60000,
    retry: 1,
    retryDelay: 1000,
  });

  const handleError = () => {
    Alert.alert(
      "Error",
      "No se pudieron cargar las tendencias de aprendizaje",
      [
        { text: "Reintentar", onPress: () => refetch() },
        { text: "Cerrar", onPress: onDismiss }
      ]
    );
  };

  if (error) {
    setTimeout(handleError, 100);
  }

  // Funciones para manejar los cambios de fecha
  const onFromDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || fromDate;
    setShowFromPicker(Platform.OS === 'ios');
    setFromDate(currentDate);
  };

  const onToDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || toDate;
    setShowToPicker(Platform.OS === 'ios');
    setToDate(currentDate);
  };

  // Función para aplicar los filtros
  const applyFilters = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setAppliedStudentId(studentId);
  };

  // Preparar datos para los gráficos
  const prepareTasksChartData = () => {
    if (!trends?.trends?.tasks || trends.trends.tasks.length === 0) {
      return {
        labels: ['Sin datos'],
        datasets: [{
          data: [0],
          color: () => '#1976D2',
        }]
      };
    }

    return {
      labels: trends.trends.tasks.map(item => item.date),
      datasets: [{
        data: trends.trends.tasks.map(item => item.createdTasks),
        color: () => '#1976D2',
      }]
    };
  };

  const prepareTaskCompletionChartData = () => {
    if (!trends?.trends?.tasks || trends.trends.tasks.length === 0) {
      return {
        labels: ['Sin datos'],
        datasets: [{
          data: [0],
          color: () => '#4CAF50',
        }]
      };
    }

    return {
      labels: trends.trends.tasks.map(item => item.date),
      datasets: [{
        data: trends.trends.tasks.map(item => Math.round(item.averageTaskCompletion * 100) / 100),
        color: () => '#4CAF50',
      }]
    };
  };

  const prepareExamsChartData = () => {
    if (!trends?.trends?.exams || trends.trends.exams.length === 0) {
      return {
        labels: ['Sin datos'],
        datasets: [{
          data: [0],
          color: () => '#FF6B35',
        }]
      };
    }

    return {
      labels: trends.trends.exams.map(item => item.date),
      datasets: [{
        data: trends.trends.exams.map(item => Math.round(item.averageScore * 100) / 100),
        color: () => '#FF6B35',
      }]
    };
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#1976D2"
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
          <Title style={styles.title}>Tendencias de Aprendizaje</Title>
          {courseName && (
            <Text style={styles.courseName}>{courseName}</Text>
          )}
          
          {/* Filtros */}
          <Card style={styles.filtersCard}>
            <Card.Content>
              <Title style={styles.filtersTitle}>Filtros</Title>
              
              <View style={styles.dateFilterContainer}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Desde:</Text>
                  <Button
                    mode="outlined"
                    onPress={() => setShowFromPicker(true)}
                    style={styles.dateButton}
                    icon="calendar"
                  >
                    {formatDateToString(fromDate)}
                  </Button>
                </View>
                
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Hasta:</Text>
                  <Button
                    mode="outlined"
                    onPress={() => setShowToPicker(true)}
                    style={styles.dateButton}
                    icon="calendar"
                  >
                    {formatDateToString(toDate)}
                  </Button>
                </View>
              </View>
              
              {/* Filtro por estudiante */}
              <View style={styles.studentFilterContainer}>
                <Text style={styles.dateLabel}>Filtrar por estudiante (opcional):</Text>
                <Menu
                  visible={showStudentMenu}
                  onDismiss={() => setShowStudentMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setShowStudentMenu(true)}
                      style={styles.studentDropdownButton}
                      icon="account"
                      contentStyle={styles.dropdownButtonContent}
                    >
                      {studentId ? `${selectedStudentName || 'Cargando...'}` : 'Seleccionar estudiante'}
                    </Button>
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setStudentId('');
                      setSelectedStudentName('');
                      setShowStudentMenu(false);
                    }}
                    title="Todos los estudiantes"
                  />
                  {courseStudents.map((userId) => (
                    <StudentMenuItem
                      key={userId}
                      userId={userId}
                      token={session?.token || ''}
                      onSelect={(id, name) => {
                        setStudentId(id);
                        setSelectedStudentName(name);
                        setShowStudentMenu(false);
                      }}
                    />
                  ))}
                </Menu>
              </View>
              
              <Button
                mode="contained"
                onPress={applyFilters}
                style={styles.applyFiltersButton}
                icon="refresh"
              >
                Aplicar Filtros
              </Button>
            </Card.Content>
          </Card>
          
          <Divider style={styles.divider} />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Cargando tendencias...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error al cargar las tendencias</Text>
              <Button mode="contained" onPress={() => refetch()}>
                Reintentar
              </Button>
            </View>
          ) : trends ? (
            <View style={styles.trendsContainer}>
              {/* Período */}
              <Card style={styles.trendsCard}>
                <Card.Content>
                  <Title style={styles.cardTitle}>Período Analizado</Title>
                  <Text style={styles.periodText}>
                    Desde: {trends.period.from} - Hasta: {trends.period.to}
                  </Text>
                </Card.Content>
              </Card>

              {/* Gráfico de Tareas */}
              <Card style={styles.trendsCard}>
                <Card.Content>
                  <Title style={styles.cardTitle}>Tareas Creadas</Title>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={prepareTasksChartData()}
                      width={Math.max(screenWidth - 80, 300)}
                      height={220}
                      chartConfig={chartConfig}
                      style={styles.chart}
                      yAxisLabel=""
                      yAxisSuffix=" tareas"
                      showValuesOnTopOfBars
                    />
                  </ScrollView>
                </Card.Content>
              </Card>

              {/* Gráfico de Finalización de Tareas */}
              <Card style={styles.trendsCard}>
                <Card.Content>
                  <Title style={styles.cardTitle}>Promedio de Finalización de Tareas</Title>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={prepareTaskCompletionChartData()}
                      width={Math.max(screenWidth - 80, 300)}
                      height={220}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                      }}
                      style={styles.chart}
                      yAxisLabel=""
                      yAxisSuffix=""
                      showValuesOnTopOfBars
                    />
                  </ScrollView>
                </Card.Content>
              </Card>

              {/* Gráfico de Exámenes */}
              <Card style={styles.trendsCard}>
                <Card.Content>
                  <Title style={styles.cardTitle}>Tendencias de Exámenes (Promedio)</Title>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={prepareExamsChartData()}
                      width={Math.max(screenWidth - 80, 300)}
                      height={220}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
                        propsForDots: {
                          r: "6",
                          strokeWidth: "2",
                          stroke: "#FF6B35"
                        }
                      }}
                      style={styles.chart}
                      yAxisLabel=""
                      yAxisSuffix="/100"
                      bezier
                    />
                  </ScrollView>
                </Card.Content>
              </Card>

              {/* Anomalías */}
              <Card style={styles.trendsCard}>
                <Card.Content>
                  <Title style={styles.cardTitle}>Anomalías Detectadas</Title>
                  {trends.anomalies.tasks.length === 0 && trends.anomalies.exams.length === 0 ? (
                    <Text style={styles.noAnomaliesText}>No se detectaron anomalías</Text>
                  ) : (
                    <View>
                      {trends.anomalies.tasks.length > 0 && (
                        <View>
                          <Text style={styles.anomalySubtitle}>Tareas:</Text>
                          {trends.anomalies.tasks.map((anomaly, index) => (
                            <Text key={index} style={styles.anomalyText}>
                              • {JSON.stringify(anomaly)}
                            </Text>
                          ))}
                        </View>
                      )}
                      {trends.anomalies.exams.length > 0 && (
                        <View>
                          <Text style={styles.anomalySubtitle}>Exámenes:</Text>
                          {trends.anomalies.exams.map((anomaly, index) => (
                            <Text key={index} style={styles.anomalyText}>
                              • {JSON.stringify(anomaly)}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </Card.Content>
              </Card>

              {/* Recomendaciones */}
              <Card style={styles.trendsCard}>
                <Card.Content>
                  <Title style={styles.cardTitle}>Recomendaciones</Title>
                  {trends.recommendations.length === 0 ? (
                    <Text style={styles.noRecommendationsText}>No hay recomendaciones disponibles</Text>
                  ) : (
                    trends.recommendations.map((recommendation, index) => (
                      <Text key={index} style={styles.recommendationText}>
                        • {recommendation}
                      </Text>
                    ))
                  )}
                </Card.Content>
              </Card>
            </View>
          ) : (
            <Text style={styles.noDataText}>No hay datos de tendencias disponibles</Text>
          )}

          {/* Date Pickers */}
          {showFromPicker && (
            <DateTimePicker
              testID="fromDatePicker"
              value={fromDate}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onFromDateChange}
            />
          )}
          
          {showToPicker && (
            <DateTimePicker
              testID="toDatePicker"
              value={toDate}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onToDateChange}
            />
          )}

          <Button 
            mode="outlined" 
            style={styles.closeButton} 
            onPress={onDismiss}
          >
            Cerrar
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

// Componente para mostrar un elemento del menú de estudiantes con su nombre
type StudentMenuItemProps = {
  userId: string;
  token: string;
  onSelect: (userId: string, name: string) => void;
};

const StudentMenuItem = ({ userId, token, onSelect }: StudentMenuItemProps) => {
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId, token),
    enabled: !!userId && !!token,
    staleTime: 300000,
    retry: 1,
  });

  const getStudentName = () => {
    if (isLoading) return 'Cargando...';
    if (error) return `Usuario (${userId.substring(0, 8)}...)`;
    return userProfile?.name || 'Usuario desconocido';
  };

  return (
    <Menu.Item
      onPress={() => onSelect(userId, userProfile?.name || userId)}
      title={getStudentName()}
      disabled={isLoading}
    />
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#1976D2',
  },
  courseName: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  divider: {
    marginVertical: 15,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 15,
  },
  trendsContainer: {
    gap: 15,
  },
  trendsCard: {
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#1976D2',
  },
  periodText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noAnomaliesText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  anomalySubtitle: {
    fontWeight: 'bold',
    color: '#D32F2F',
    marginTop: 5,
    marginBottom: 5,
  },
  anomalyText: {
    color: '#D32F2F',
    marginBottom: 3,
  },
  noRecommendationsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  recommendationText: {
    color: '#1976D2',
    marginBottom: 5,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  filtersCard: {
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
  },
  filtersTitle: {
    fontSize: 16,
    marginBottom: 10,
    color: '#1976D2',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#333',
  },
  dateButton: {
    marginBottom: 10,
  },
  studentFilterContainer: {
    marginBottom: 15,
  },
  studentDropdownButton: {
    marginTop: 5,
    justifyContent: 'flex-start',
  },
  dropdownButtonContent: {
    justifyContent: 'flex-start',
  },
  applyFiltersButton: {
    marginTop: 10,
    backgroundColor: '#1976D2',
  },
  closeButton: {
    marginTop: 20,
  },
});

export default LearningTrendsModal;
