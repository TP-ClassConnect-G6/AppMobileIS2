import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Card, FAB, Portal, Button } from 'react-native-paper';
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
  },
  feedbackCard: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
});
