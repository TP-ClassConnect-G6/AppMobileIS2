import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { Text, Title, Card, Button, Chip, Divider, Paragraph, Provider } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from "@/contexts/session";
import { courseClient } from "@/lib/http";
import { router } from "expo-router";
import CourseDetailModal from "@/components/CourseDetailModal";

// Types
interface Schedule {
  day: string;
  time: string;
}

interface Course {
  course_id: string;
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  max_quota: number;
  academic_level: string;
  category: string | null;
  objetives: string;
  content: string;
  required_courses: any[];
  teacher: string;
  instructor_profile: string;
  modality: string;
  schedule: Schedule[];
  course_status: string;
  status: string;
  current_page: number;
  total_pages: number;
}

interface CourseHistory {
  active_courses: Course[];
  ended_courses: Course[];
  active_pages: number;
  ended_pages: number;
}

export default function MisCursosScreen() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courseHistory, setCourseHistory] = useState<CourseHistory | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [endedPage, setEndedPage] = useState(1);
  const [activeLimit] = useState(3); // Fixed limit as requested
  const [endedLimit] = useState(3); // Fixed limit as requested
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourseHistory();
  }, [activePage, endedPage]);

  const fetchCourseHistory = async () => {
    if (!session?.token) {
      Alert.alert("Error", "Debes iniciar sesión para ver tus cursos");
      return;
    }

    try {
      setLoading(true);
      const response = await courseClient.get(
        `/courses/history?active_limit=${activeLimit}&active_page=${activePage}&ended_limit=${endedLimit}&ended_page=${endedPage}`,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 && response.data && response.data.response) {
        setCourseHistory(response.data.response);
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }
    } catch (error) {
      console.error("Error al obtener el historial de cursos:", error);
      Alert.alert(
        "Error", 
        "No se pudieron cargar tus cursos. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourseHistory();
  };

  const navigateToCourseDetail = (courseId: string) => {
    router.push({
      pathname: "/(tabs)/course-list",
      params: { courseId }
    });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getCourseStatusText = (status: string) => {
    switch (status) {
      case 'studiying':
        return 'Cursando';
      case 'approved':
        return 'Aprobado';
      case 'disapproved':
        return 'Desaprobado';
      default:
        return status;
    }
  };

  const getCourseStatusColor = (status: string) => {
    switch (status) {
      case 'studiying':
        return styles.statusStudying;
      case 'approved':
        return styles.statusApproved;
      case 'disapproved':
        return styles.statusDisapproved;
      default:
        return {};
    }
  };

  const renderCourseItem = (course: Course) => {
    return (
      <Card 
        style={styles.courseCard} 
        key={course.course_id}
        onPress={() => navigateToCourseDetail(course.course_id)}
      >
        <Card.Content>
          <Title style={styles.courseTitle}>{course.course_name}</Title>
          
          <View style={styles.courseInfo}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="account-tie" size={16} color="#666" />
              <Text style={styles.infoText}>{course.teacher}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="calendar-range" size={16} color="#666" />
              <Text style={styles.infoText}>
                {formatDate(course.date_init)} - {formatDate(course.date_end)}
              </Text>
            </View>
            
            {course.modality && (
              <View style={styles.infoItem}>
                <MaterialCommunityIcons 
                  name={course.modality === 'virtual' ? "laptop" : "school"} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.infoText}>
                  {course.modality === 'virtual' ? 'Virtual' : 'Presencial'}
                </Text>
              </View>
            )}
          </View>
          
          <Paragraph numberOfLines={2} style={styles.courseDescription}>
            {course.description}
          </Paragraph>
          
          {course.schedule && course.schedule.length > 0 && (
            <View style={styles.scheduleContainer}>
              <Text style={styles.sectionTitle}>Horarios:</Text>
              <View style={styles.scheduleList}>
                {course.schedule.map((item, index) => (
                  <Chip key={index} style={styles.scheduleChip} icon="clock-outline">
                    {item.day} {item.time}
                  </Chip>
                ))}
              </View>
            </View>
          )}
          
          <View style={styles.statusContainer}>
            <Chip 
              mode="outlined" 
              style={[styles.statusChip, getCourseStatusColor(course.status)]}
            >
              {getCourseStatusText(course.status)}
            </Chip>
            
            {course.category && (
              <Chip mode="outlined" style={styles.categoryChip}>
                {course.category}
              </Chip>
            )}
          </View>
          </Card.Content>
        <Card.Actions style={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          padding: 10,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: '#eee',
          borderRadius: 0,
          elevation: 0,
        }}>
          <Button 
            onPress={() => {
              setSelectedCourseId(course.course_id);
              setDetailModalVisible(true);
            }}
            style={{ width: '100%', marginBottom: 8 }}
            contentStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 12 }}
            icon="information-outline"
          >
            Más información
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  const renderPagination = (
    currentPage: number, 
    totalPages: number, 
    setPageFunction: React.Dispatch<React.SetStateAction<number>>
  ) => {
    return (
      <View style={styles.paginationContainer}>
        <Button 
          mode="outlined" 
          disabled={currentPage <= 1}
          onPress={() => setPageFunction(prev => Math.max(1, prev - 1))}
          icon="chevron-left"
        >
          Anterior
        </Button>
        
        <Text style={styles.pageInfo}>
          Página {currentPage} de {totalPages || 1}
        </Text>
        
        <Button 
          mode="outlined" 
          disabled={currentPage >= totalPages}
          onPress={() => setPageFunction(prev => prev + 1)}
          icon="chevron-right"
          contentStyle={{ flexDirection: 'row-reverse' }}
        >
          Siguiente
        </Button>
      </View>
    );
  };

  if (loading && !courseHistory) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando tus cursos...</Text>
      </View>
    );
  }
  return (
    <Provider>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Title style={styles.screenTitle}>Mis Cursos</Title>
        <Text style={styles.screenDescription}>
          Aquí puedes ver todos tus cursos activos y finalizados
        </Text>

        {/* Active Courses Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="book-open-variant" size={24} color="#333" />
            <Title style={styles.sectionTitle}>Cursos Activos</Title>
          </View>
          
          {loading ? (
            <ActivityIndicator style={styles.sectionLoading} />
          ) : courseHistory && courseHistory.active_courses.length > 0 ? (
            <>
              {courseHistory.active_courses.map(renderCourseItem)}
              {renderPagination(activePage, courseHistory.active_pages, setActivePage)}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="book-open-page-variant" size={48} color="#ccc" />
              <Text style={styles.emptyMessage}>No tienes cursos activos actualmente</Text>
            </View>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Ended Courses Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="book-check" size={24} color="#333" />
            <Title style={styles.sectionTitle}>Cursos Finalizados</Title>
          </View>
          
          {loading ? (
            <ActivityIndicator style={styles.sectionLoading} />
          ) : courseHistory && courseHistory.ended_courses.length > 0 ? (
            <>
              {courseHistory.ended_courses.map(renderCourseItem)}
              {renderPagination(endedPage, courseHistory.ended_pages, setEndedPage)}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="book-check-outline" size={48} color="#ccc" />
              <Text style={styles.emptyMessage}>No tienes cursos finalizados</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Modal de detalles del curso */}
      <CourseDetailModal
        visible={detailModalVisible}
        onDismiss={() => setDetailModalVisible(false)}
        courseId={selectedCourseId}
      />
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 8,
  },
  screenDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  courseCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  courseInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  courseDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  scheduleContainer: {
    marginVertical: 8,
  },
  scheduleList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  scheduleChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
  },
  statusContainer: {
    flexDirection: "row",
    marginTop: 8,
    flexWrap: "wrap",
  },
  statusChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#e8f5e9",
  },
  statusStudying: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
  },
  statusApproved: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4caf50",
  },
  statusDisapproved: {
    backgroundColor: "#ffebee",
    borderColor: "#f44336",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  pageInfo: {
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },  sectionLoading: {
    padding: 20,
  },
  cardActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    padding: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderRadius: 0,
    elevation: 0,
  },
  buttonLabel: {
    fontSize: 14,
    marginHorizontal: 4,
    paddingLeft: 8,
  },
});
