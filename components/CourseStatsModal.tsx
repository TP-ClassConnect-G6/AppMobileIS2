import React, { useState } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert, Platform, Linking } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Card, TextInput, Menu } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { client, courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";
import DateTimePicker from '@react-native-community/datetimepicker';
import LearningTrendsModal from './LearningTrendsModal';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

// Tipos para las estadísticas de desempeño estudiantil
type CourseStats = {
  courseId: string;
  period: {
    start: string;
    end: string;
  };
  averageScore: number;
  totalTasks: number;
  averageTaskCompletion: number;
  studentBreakdown: Record<string, number>;
  trends: {
    tasks: Array<{ date: string; createdTasks: number; averageTaskCompletion: number }>;
    exams: Array<{ date: string; averageScore: number }>;
  };
};

// Función para obtener estadísticas de desempeño estudiantil
const fetchCourseStats = async (courseId: string, token: string, startDate: string, endDate: string, studentId?: string): Promise<CourseStats> => {
  try {
    let url = `/stats/${courseId}?start=${startDate}&end=${endDate}`;
    if (studentId && studentId.trim()) {
      url += `&studentId=${studentId}`;
    }
    const response = await courseClient.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log("Course stats response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error al obtener estadísticas del curso:', error);
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

// Tipos para las tendencias de aprendizaje (para PDF)
type LearningTrendsForPDF = {
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

// Función para obtener tendencias de aprendizaje para PDF
const fetchLearningTrendsForPDF = async (courseId: string, token: string, from: string, to: string, studentId?: string): Promise<LearningTrendsForPDF> => {
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
    console.log("Learning trends for PDF response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error al obtener tendencias de aprendizaje para PDF:', error);
    throw error;
  }
};

// Props para el componente modal
type CourseStatsModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
  courseName: string | null;
};

const CourseStatsModal = ({ visible, onDismiss, courseId, courseName }: CourseStatsModalProps) => {
  const { session } = useSession();

  // Estados para los filtros de fecha
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [studentId, setStudentId] = useState(''); // Filtro opcional por estudiante
  const [selectedStudentName, setSelectedStudentName] = useState(''); // Nombre del estudiante seleccionado
  const [showStudentMenu, setShowStudentMenu] = useState(false); // Estado para mostrar el menú desplegable

  // Estados para los filtros aplicados (que se usan en la query)
  const [appliedStartDate, setAppliedStartDate] = useState(new Date());
  const [appliedEndDate, setAppliedEndDate] = useState(new Date());
  const [appliedStudentId, setAppliedStudentId] = useState('');

  // Estado para el modal de tendencias de aprendizaje
  const [learningTrendsModalVisible, setLearningTrendsModalVisible] = useState(false);

  // Estado para indicar si se está descargando el PDF
  const [downloadingPDF, setDownloadingPDF] = useState(false);

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
    staleTime: 300000, // 5 minutos de cache
  });

  // Filtrar estudiantes por el curso actual
  const courseStudents = registrations
    ? registrations
        .filter(reg => reg.course_id === courseId && reg.registration_status === 'active')
        .map(reg => reg.user_id)
    : [];

  // Consulta para obtener las estadísticas del curso
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['courseStats', courseId, formatDateToString(appliedStartDate), formatDateToString(appliedEndDate), appliedStudentId],
    queryFn: () => {
      if (!courseId || !session?.token) {
        throw new Error('No courseId or token provided');
      }
      return fetchCourseStats(courseId, session.token, formatDateToString(appliedStartDate), formatDateToString(appliedEndDate), appliedStudentId);
    },
    enabled: !!courseId && !!session?.token && visible,
    staleTime: 60000,
    retry: 1,
    retryDelay: 1000,
  });

  const handleError = () => {
    Alert.alert(
      "Error",
      "No se pudieron cargar las estadísticas del curso",
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
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startDate;
    setShowStartPicker(Platform.OS === 'ios');
    setStartDate(currentDate);
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || endDate;
    setShowEndPicker(Platform.OS === 'ios');
    setEndDate(currentDate);
  };

  // Función para aplicar los filtros
  const applyFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedStudentId(studentId);
  };

  // Función para generar PDF de estadísticas y tendencias
  const handleDownloadPDF = async () => {
    try {
      if (!courseId || !session?.token) {
        Alert.alert('Error', 'No hay datos suficientes para generar el PDF');
        return;
      }

      // Establecer estado de carga
      setDownloadingPDF(true);

      // Obtener tendencias de aprendizaje usando los filtros aplicados
      const learningTrends = await fetchLearningTrendsForPDF(
        courseId, 
        session.token, 
        formatDateToString(appliedStartDate), 
        formatDateToString(appliedEndDate), 
        appliedStudentId
      );

      // Obtener nombre del estudiante si hay filtro aplicado
      let studentName = '';
      if (appliedStudentId) {
        try {
          const userProfile = await fetchUserProfile(appliedStudentId, session.token);
          studentName = userProfile.name || userProfile.user_id;
        } catch (profileError) {
          console.warn('No se pudo obtener el perfil del estudiante:', profileError);
          studentName = appliedStudentId.substring(0, 8) + '...';
        }
      }

      // Preparar datos de tareas para el HTML
      const tasksHtml = learningTrends.trends.tasks.map((task, index) => `
        <div class="trend-item">
          <div class="trend-date">${task.date}</div>
          <div class="trend-details">
            <div class="trend-stat">
              <span class="stat-label">Tareas creadas:</span>
              <span class="stat-value">${task.createdTasks}</span>
            </div>
            <div class="trend-stat">
              <span class="stat-label">Promedio completadas:</span>
              <span class="stat-value">${task.averageTaskCompletion.toFixed(2)}</span>
            </div>
          </div>
        </div>
      `).join('');

      // Preparar datos de exámenes para el HTML
      const examsHtml = learningTrends.trends.exams.map((exam, index) => `
        <div class="trend-item">
          <div class="trend-date">${exam.date}</div>
          <div class="trend-details">
            <div class="trend-stat">
              <span class="stat-label">Promedio de calificaciones:</span>
              <span class="stat-value">${exam.averageScore.toFixed(2)}/100</span>
            </div>
          </div>
        </div>
      `).join('');

      // Preparar estadísticas generales (si están disponibles)
      let generalStatsHtml = '';
      if (stats) {
        generalStatsHtml = `
          <div class="section">
            <h2 class="section-title">📊 Resumen General</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Período:</div>
                <div class="stat-value">${stats.period.start} - ${stats.period.end}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Promedio de calificaciones:</div>
                <div class="stat-value">${stats.averageScore.toFixed(2)}/100</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total de tareas:</div>
                <div class="stat-value">${stats.totalTasks}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Promedio de finalización:</div>
                <div class="stat-value">${stats.averageTaskCompletion.toFixed(2)}</div>
              </div>
            </div>
          </div>
        `;
      }

      // Preparar recomendaciones
      const recommendationsHtml = learningTrends.recommendations.length > 0 ? `
        <div class="section">
          <h2 class="section-title">💡 Recomendaciones</h2>
          <ul class="recommendations-list">
            ${learningTrends.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      ` : '';

      // Generar HTML para el PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Reporte de Estadísticas - ${courseName || 'Curso'}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 40px;
              line-height: 1.6;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2196f3;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              color: #2196f3;
              font-size: 28px;
              font-weight: bold;
              margin: 0;
            }
            .subtitle {
              color: #666;
              font-size: 16px;
              margin-top: 5px;
            }
            .filter-info {
              background-color: #f0f7ff;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 25px;
              border-left: 4px solid #2196f3;
            }
            .section {
              margin-bottom: 30px;
              padding: 20px;
              background-color: #f9f9f9;
              border-radius: 8px;
              border-left: 4px solid #2196f3;
              page-break-inside: avoid;
            }
            .section-title {
              color: #2196f3;
              font-size: 20px;
              font-weight: bold;
              margin: 0 0 15px 0;
              page-break-after: avoid;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-top: 15px;
            }
            .stat-card {
              background-color: white;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e0e0e0;
            }
            .stat-label {
              font-weight: bold;
              color: #2196f3;
              margin-bottom: 5px;
              font-size: 14px;
            }
            .stat-value {
              color: #333;
              font-size: 16px;
              font-weight: 600;
            }
            .trend-item {
              background-color: white;
              padding: 15px;
              margin-bottom: 15px;
              border-radius: 8px;
              border: 1px solid #e0e0e0;
              page-break-inside: avoid;
            }
            .trend-date {
              font-weight: bold;
              color: #2196f3;
              font-size: 16px;
              margin-bottom: 10px;
            }
            .trend-details {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }
            .trend-stat {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px;
              background-color: #f5f5f5;
              border-radius: 5px;
            }
            .recommendations-list {
              list-style-type: disc;
              padding-left: 20px;
            }
            .recommendations-list li {
              margin-bottom: 8px;
              color: #333;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Reporte de Estadísticas y Tendencias</h1>
            <p class="subtitle">${courseName || 'Curso'}</p>
          </div>

          <div class="filter-info">
            <h3 style="margin: 0 0 10px 0; color: #2196f3;">📋 Filtros Aplicados</h3>
            <p><strong>Período:</strong> ${formatDateToString(appliedStartDate)} - ${formatDateToString(appliedEndDate)}</p>
            ${studentName ? `<p><strong>Estudiante:</strong> ${studentName}</p>` : '<p><strong>Estudiante:</strong> Todos los estudiantes</p>'}
          </div>

          ${generalStatsHtml}

          <div class="section">
            <h2 class="section-title">📈 Tendencias de Tareas</h2>
            ${tasksHtml || '<p>No hay datos de tendencias de tareas disponibles.</p>'}
          </div>

          <div class="section">
            <h2 class="section-title">📊 Tendencias de Exámenes</h2>
            ${examsHtml || '<p>No hay datos de tendencias de exámenes disponibles.</p>'}
          </div>

          ${recommendationsHtml}

          <div class="footer">
            <p>Documento generado el ${format(new Date(), 'dd MMMM yyyy - HH:mm', { locale: es })}</p>
            <p>ClassConnect - Sistema de Gestión Académica</p>
          </div>
        </body>
        </html>
      `;

      // Generar PDF usando expo-print
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      // Verificar si se puede compartir archivos
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        // Usar expo-sharing para abrir el archivo con otras aplicaciones
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Reporte de Estadísticas - ${courseName || 'Curso'}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        // Fallback para plataformas que no soportan sharing
        if (Platform.OS === 'android') {
          try {
            const contentUri = await FileSystem.getContentUriAsync(uri);
            await Linking.openURL(contentUri);
          } catch (linkError) {
            Alert.alert(
              'PDF Generado', 
              `El PDF se ha generado exitosamente.\nUbicación: ${uri}`
            );
          }
        } else {
          Alert.alert(
            'PDF Generado', 
            `El PDF se ha generado exitosamente para el curso: ${courseName || 'Curso'}`
          );
        }
      }
    } catch (error) {
      console.error('Error al generar PDF:', error);
      Alert.alert(
        'Error', 
        `No se pudo generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      // Limpiar estado de carga
      setDownloadingPDF(false);
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
          <Title style={styles.title}>Estadísticas de Desempeño Estudiantil</Title>
          {courseName && (
            <Text style={styles.courseName}>{courseName}</Text>
          )}
          
          {/* Filtros de fecha */}
          <Card style={styles.filtersCard}>
            <Card.Content>
              <Title style={styles.filtersTitle}>Filtros</Title>
              
              <View style={styles.dateFilterContainer}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Fecha de inicio:</Text>
                  <Button
                    mode="outlined"
                    onPress={() => setShowStartPicker(true)}
                    style={styles.dateButton}
                    icon="calendar"
                  >
                    {formatDateToString(startDate)}
                  </Button>
                </View>
                
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Fecha de fin:</Text>
                  <Button
                    mode="outlined"
                    onPress={() => setShowEndPicker(true)}
                    style={styles.dateButton}
                    icon="calendar"
                  >
                    {formatDateToString(endDate)}
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
              
              <Button
                mode="outlined"
                onPress={() => setLearningTrendsModalVisible(true)}
                style={styles.trendsButton}
                icon="trending-up"
              >
                Ver Tendencias de Aprendizaje
              </Button>
              
              <Button
                mode="contained"
                onPress={handleDownloadPDF}
                style={styles.downloadButton}
                icon={downloadingPDF ? "loading" : "download"}
                loading={downloadingPDF}
                disabled={downloadingPDF}
              >
                {downloadingPDF ? "Generando PDF..." : "Descargar Reporte PDF"}
              </Button>
            </Card.Content>
          </Card>
          
          <Divider style={styles.divider} />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Cargando estadísticas...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error al cargar las estadísticas</Text>
              <Button mode="contained" onPress={() => refetch()}>
                Reintentar
              </Button>
            </View>
          ) : stats ? (
            <View style={styles.statsContainer}>
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Title style={styles.cardTitle}>Resumen General</Title>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Período:</Text>
                    <Text style={styles.statValue}>
                      {stats.period.start} - {stats.period.end}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Promedio de calificaciones:</Text>
                    <Text style={styles.statValue}>
                      {stats.averageScore.toFixed(2)}/100
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total de tareas:</Text>
                    <Text style={styles.statValue}>{stats.totalTasks}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Promedio de finalización de tareas:</Text>
                    <Text style={styles.statValue}>
                      {stats.averageTaskCompletion.toFixed(2)}
                    </Text>
                  </View>
                </Card.Content>
              </Card>

              <Card style={styles.statsCard}>
                <Card.Content>
                  <Title style={styles.cardTitle}>Desglose por Estudiante</Title>
                  {Object.entries(stats.studentBreakdown).map(([studentId, completion]) => (
                    <StudentItem
                      key={studentId}
                      studentId={studentId}
                      completion={completion}
                      token={session?.token || ''}
                    />
                  ))}
                </Card.Content>
              </Card>

              <Card style={styles.statsCard}>
                <Card.Content>
                  <Title style={styles.cardTitle}>Tendencias</Title>
                  <Text style={styles.sectionSubtitle}>Tareas por mes:</Text>
                  {stats.trends.tasks.map((trend, index) => (
                    <View key={index}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{trend.date} - Tareas creadas:</Text>
                        <Text style={styles.statValue}>{trend.createdTasks}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{trend.date} - Promedio completadas:</Text>
                        <Text style={styles.statValue}>{trend.averageTaskCompletion.toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}
                  
                  <Text style={styles.sectionSubtitle}>Exámenes por mes:</Text>
                  {stats.trends.exams.map((trend, index) => (
                    <View key={index} style={styles.statItem}>
                      <Text style={styles.statLabel}>{trend.date}:</Text>
                      <Text style={styles.statValue}>{trend.averageScore.toFixed(2)}/100 promedio</Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            </View>
          ) : (
            <Text style={styles.noDataText}>No hay estadísticas disponibles</Text>
          )}

          {/* Date Pickers */}
          {showStartPicker && (
            <DateTimePicker
              testID="startDatePicker"
              value={startDate}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onStartDateChange}
            />
          )}
          
          {showEndPicker && (
            <DateTimePicker
              testID="endDatePicker"
              value={endDate}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={onEndDateChange}
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
      
      {/* Modal de Tendencias de Aprendizaje */}
      <LearningTrendsModal
        visible={learningTrendsModalVisible}
        onDismiss={() => setLearningTrendsModalVisible(false)}
        courseId={courseId}
        courseName={courseName}
      />
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
    staleTime: 300000, // 5 minutos de cache
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

// Componente para mostrar información de un estudiante con su nombre
type StudentItemProps = {
  studentId: string;
  completion: number;
  token: string;
};

const StudentItem = ({ studentId, completion, token }: StudentItemProps) => {
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ['userProfile', studentId],
    queryFn: () => fetchUserProfile(studentId, token),
    enabled: !!studentId && !!token,
    staleTime: 300000, // 5 minutos de cache
    retry: 1,
  });

  const getStudentName = () => {
    if (isLoading) return 'Cargando...';
    if (error) return `Usuario (${studentId.substring(0, 8)}...)`;
    return userProfile?.name || 'Usuario desconocido';
  };

  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>
        {getStudentName()}:
      </Text>
      <Text style={styles.statValue}>{completion} tareas completadas</Text>
    </View>
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
  statsContainer: {
    gap: 15,
  },
  statsCard: {
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#1976D2',
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  statLabel: {
    flex: 1,
    fontWeight: '500',
    color: '#333',
  },
  statValue: {
    flex: 1,
    textAlign: 'right',
    color: '#666',
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontWeight: 'bold',
    color: '#1976D2',
    marginTop: 10,
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
  trendsButton: {
    marginTop: 10,
    borderColor: '#FF6B35',
  },
  downloadButton: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    marginTop: 20,
  },
});

export default CourseStatsModal;
