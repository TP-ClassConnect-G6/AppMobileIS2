import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useSession } from '@/contexts/session';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateTeacherFeedbackModal from '@/components/CreateTeacherFeedbackModal';

export default function TeacherFeedbacksScreen() {
  const { session } = useSession();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Placeholder data para mostrar la estructura
  // TODO: Implementar endpoint para obtener feedbacks del teacher
  const feedbacks: any[] = [
    // Placeholder - será reemplazado cuando se implemente el endpoint
  ];

  const handleCreateFeedback = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };

  const handleFeedbackCreated = () => {
    setShowCreateModal(false);
    // TODO: Refrescar la lista de feedbacks
    Alert.alert('Éxito', 'Feedback creado exitosamente');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Feedbacks de Estudiantes</Text>
            <Text style={styles.subtitle}>
              Aquí podrás ver y crear feedbacks para tus estudiantes
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {feedbacks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No hay feedbacks aún</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primer feedback para un estudiante usando el botón de arriba
            </Text>
          </View>
        ) : (
          feedbacks.map((feedback, index) => (
            <Card key={index} style={styles.feedbackCard}>
              <Card.Content>
                <Text style={styles.feedbackTitle}>
                  Feedback para {feedback.studentName}
                </Text>
                <Text style={styles.feedbackCourse}>
                  Curso: {feedback.courseName}
                </Text>
                <Text style={styles.feedbackContent}>
                  {feedback.content}
                </Text>
                <Text style={styles.feedbackScore}>
                  Calificación: {feedback.score}/5
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

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
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  feedbackCourse: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  feedbackContent: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    lineHeight: 22,
  },
  feedbackScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196f3',
  },
});
