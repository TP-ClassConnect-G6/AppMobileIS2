import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Card, FAB, Portal, Button, ActivityIndicator } from 'react-native-paper';
import { useSession } from '@/contexts/session';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import CreateFeedbackModal from '../../components/CreateFeedbackModal';
import { courseClient } from '@/lib/http';

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

  // Get student's feedbacks
  const { data: feedbacksData, isLoading: feedbacksLoading, refetch: refetchFeedbacks } = useQuery({
    queryKey: ['student-feedbacks', session?.userId],
    queryFn: async () => {
      if (!session?.token || !session?.userId) throw new Error('No access token or user ID');
      
      const response = await courseClient.get(`/feedback/student/${session.userId}`, {
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
  };
  const handleFeedbackCreated = () => {
    setShowCreateModal(false);
    refetchFeedbacks(); // Refrescar la lista de feedbacks
    Alert.alert('Éxito', 'Feedback creado exitosamente');
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
              <Text style={styles.statsText}>
                Total de feedbacks enviados: {totalItems}
              </Text>
            </View>
            {feedbacks.map((feedback: StudentFeedback, index: number) => (
              <Card key={feedback.id} style={styles.feedbackCard}>
                <Card.Content>
                  <View style={styles.feedbackHeader}>
                    <Text style={styles.feedbackTitle}>
                      Feedback #{index + 1}
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
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
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
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});
