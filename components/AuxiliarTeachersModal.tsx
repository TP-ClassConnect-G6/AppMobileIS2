import React, { useState, useEffect } from "react";
import { StyleSheet, View, FlatList, ActivityIndicator } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Chip, List } from "react-native-paper";
import { courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";

type Permission = {
  permission: string;
};

type AuxiliarTeacher = {
  auxiliar: string;
  permissions: Permission[];
};

type AuxiliarTeachersResponse = {
  response: {
    course_id: string;
    auxiliars: AuxiliarTeacher[];
  };
};

// Props para el componente modal
type AuxiliarTeachersModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
  courseName: string | null;
};

const AuxiliarTeachersModal = ({ visible, onDismiss, courseId, courseName }: AuxiliarTeachersModalProps) => {
  const [auxiliarTeachers, setAuxiliarTeachers] = useState<AuxiliarTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useSession();

  // Función para obtener los docentes auxiliares del curso
  const fetchAuxiliarTeachers = async () => {
    if (!courseId || !session?.token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await courseClient.get(`/courses/${courseId}/auxiliars`, {
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      });

      // Manejar la respuesta según su estructura
      if (response.data?.response?.auxiliars) {
        setAuxiliarTeachers(response.data.response.auxiliars);
      } else {
        console.warn('Formato de respuesta inesperado:', response.data);
        setError('Formato de respuesta inesperado');
      }
    } catch (err: any) {
      console.error('Error al obtener docentes auxiliares:', err);
      setError(err.message || 'Error al obtener docentes auxiliares');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar los docentes auxiliares cuando se abre el modal
  useEffect(() => {
    if (visible && courseId) {
      fetchAuxiliarTeachers();
    }
  }, [visible, courseId]);

  // Renderizar un item de la lista de docentes auxiliares
  const renderAuxiliarItem = ({ item }: { item: AuxiliarTeacher }) => (
    <List.Item
      title={item.auxiliar}
      description={() => (
        <View style={styles.permissionsContainer}>
          {item.permissions.map((permission, index) => (
            <Chip 
              key={index} 
              style={styles.permissionChip}
              mode="outlined"
            >
              {permission.permission}
            </Chip>
          ))}
        </View>
      )}
      left={props => <List.Icon {...props} icon="account" />}
    />
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.container}>
          <Title style={styles.title}>
            Docentes Auxiliares{courseName ? ` - ${courseName}` : ''}
          </Title>

          <Divider style={styles.divider} />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Cargando docentes auxiliares...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Error: {error}
              </Text>
              <Button 
                mode="contained" 
                onPress={fetchAuxiliarTeachers}
                style={styles.retryButton}
              >
                Intentar nuevamente
              </Button>
            </View>
          ) : auxiliarTeachers.length === 0 ? (
            <Text style={styles.emptyText}>No hay docentes auxiliares asignados a este curso.</Text>
          ) : (
            <FlatList
              data={auxiliarTeachers}
              renderItem={renderAuxiliarItem}
              keyExtractor={(item) => item.auxiliar}
              ItemSeparatorComponent={() => <Divider />}
              style={styles.list}
            />
          )}

          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              style={styles.addButton} 
              icon="account-plus"
              onPress={() => console.log('Añadir docente auxiliar')}
            >
              Añadir Docente Auxiliar
            </Button>
            <Button 
              mode="outlined" 
              style={styles.closeButton} 
              onPress={onDismiss}
            >
              Cerrar
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    maxHeight: '90%',
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  divider: {
    marginVertical: 15,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
    color: '#666',
  },
  list: {
    maxHeight: 400,
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  permissionChip: {
    marginRight: 5,
    marginBottom: 5,
    backgroundColor: '#f0f0f0',
  },
  buttonContainer: {
    marginTop: 20,
  },
  addButton: {
    marginBottom: 10,
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    marginBottom: 5,
  },
});

export default AuxiliarTeachersModal;
