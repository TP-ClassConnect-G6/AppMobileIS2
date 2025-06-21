import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Card, FAB, Portal } from 'react-native-paper';
import { useSession } from '@/contexts/session';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateFeedbackModal from '../../components/CreateFeedbackModal';

export default function MisFeedbacksScreen() {
  const { session } = useSession();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Placeholder data para mostrar la estructura
  // TODO: Implementar endpoint para obtener feedbacks del estudiante
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
        <Text style={styles.title}>Mis Feedbacks</Text>
        <Text style={styles.subtitle}>
          Aquí podrás ver todos los feedbacks que has enviado
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {feedbacks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                Aún no has enviado ningún feedback.
              </Text>
              <Text style={styles.emptySubtext}>
                Usa el botón "+" para crear tu primer feedback sobre un curso.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          feedbacks.map((feedback, index) => (
            <Card key={index} style={styles.feedbackCard}>
              <Card.Content>
                {/* TODO: Mostrar datos reales del feedback */}
                <Text>Feedback #{index + 1}</Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <Portal>
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleCreateFeedback}
          label="Nuevo Feedback"
        />
      </Portal>

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
  },
  feedbackCard: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ea',
  },
});
