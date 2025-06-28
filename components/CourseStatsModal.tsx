import React, { useState } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Card } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { client, courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";
import axios from "axios";

// Tipos para el perfil de usuario
type UserProfile = {
  user_id: string;
  user_type: string;
  name: string;
  bio: string;
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
    tasks: Array<{ date: string; value: number }>;
    exams: Array<{ date: string; value: number }>;
  };
};

// Función para obtener estadísticas de desempeño estudiantil
const fetchCourseStats = async (courseId: string, token: string): Promise<CourseStats> => {
  try {
    // Usar fechas por defecto para el filtro obligatorio
    const startDate = "2024-06-21";
    const endDate = "2026-06-23";
    
    const response = await courseClient.get(`/stats/${courseId}?start=${startDate}&end=${endDate}`, {
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

// Props para el componente modal
type CourseStatsModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
  courseName: string | null;
};

const CourseStatsModal = ({ visible, onDismiss, courseId, courseName }: CourseStatsModalProps) => {
  const { session } = useSession();

  // Consulta para obtener las estadísticas del curso
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['courseStats', courseId],
    queryFn: () => {
      if (!courseId || !session?.token) {
        throw new Error('No courseId or token provided');
      }
      return fetchCourseStats(courseId, session.token);
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
                    <View key={index} style={styles.statItem}>
                      <Text style={styles.statLabel}>{trend.date}:</Text>
                      <Text style={styles.statValue}>{trend.value} tareas</Text>
                    </View>
                  ))}
                  
                  <Text style={styles.sectionSubtitle}>Exámenes por mes:</Text>
                  {stats.trends.exams.map((trend, index) => (
                    <View key={index} style={styles.statItem}>
                      <Text style={styles.statLabel}>{trend.date}:</Text>
                      <Text style={styles.statValue}>{trend.value.toFixed(2)}/100 promedio</Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            </View>
          ) : (
            <Text style={styles.noDataText}>No hay estadísticas disponibles</Text>
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
  closeButton: {
    marginTop: 20,
  },
});

export default CourseStatsModal;
