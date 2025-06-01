import React, { useState, useEffect } from "react";
import { StyleSheet, View, FlatList, ActivityIndicator, Alert } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Chip, List, Dialog, TextInput, Checkbox } from "react-native-paper";
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
  
  // Estados para el formulario de añadir docente auxiliar
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [auxiliarEmail, setAuxiliarEmail] = useState('');
  const [auxiliarId, setAuxiliarId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createTaskPermission, setCreateTaskPermission] = useState(false);
  const [createExamPermission, setCreateExamPermission] = useState(false);
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
  // Función para añadir un docente auxiliar
  const addAuxiliarTeacher = async () => {
    if (!courseId || !session?.token || !auxiliarEmail || !auxiliarId) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    // Verificar que al menos un permiso esté seleccionado
    if (!createTaskPermission && !createExamPermission) {
      Alert.alert('Error', 'Debe seleccionar al menos un permiso');
      return;
    }

    // Mostrar confirmación antes de proceder
    Alert.alert(
      'Confirmación',
      `¿Está seguro que desea añadir a ${auxiliarEmail} como docente auxiliar?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsSubmitting(true);

            try {
              // Preparar las permisiones seleccionadas
              const permissions = [];
              if (createTaskPermission) permissions.push('create task');
              if (createExamPermission) permissions.push('create exam');

              // Crear el cuerpo de la petición
              const requestBody = {
                auxiliar: auxiliarEmail,
                auxiliar_id: auxiliarId,
                auxiliar_role: 'teacher',
                permissions: permissions
              };

              console.log('Enviando solicitud para añadir docente auxiliar:', requestBody);

              // Enviar la petición
              const response = await courseClient.post(`/courses/${courseId}/auxiliars`, requestBody, {
                headers: {
                  Authorization: `Bearer ${session.token}`
                }
              });

              console.log('Respuesta del servidor:', response.data);

              // Verificar la respuesta
              if (response.data?.response?.auxiliars) {
                // Actualizar la lista de docentes auxiliares
                setAuxiliarTeachers(response.data.response.auxiliars);
                // Cerrar el diálogo y limpiar el formulario
                resetForm();
                Alert.alert('Éxito', 'Docente auxiliar añadido correctamente');
              } else {
                // Si la respuesta no contiene la lista actualizada, realizar una nueva consulta
                fetchAuxiliarTeachers();
                resetForm();
                Alert.alert('Éxito', 'Docente auxiliar añadido correctamente');
              }
            } catch (err: any) {
              console.error('Error al añadir docente auxiliar:', err);
              
              let errorMessage = 'Error al añadir docente auxiliar';
              if (err.response) {
                if (err.response.status === 400) {
                  errorMessage = 'Datos inválidos. Verifique el email y el ID del docente.';
                } else if (err.response.status === 401) {
                  errorMessage = 'No autorizado. Inicie sesión nuevamente.';
                } else if (err.response.status === 403) {
                  errorMessage = 'No tiene permisos para realizar esta acción.';
                } else if (err.response.status === 404) {
                  errorMessage = 'Curso o usuario no encontrado.';
                } else if (err.response.status === 409) {
                  errorMessage = 'El docente ya es auxiliar en este curso.';
                } else if (err.response.data?.message) {
                  errorMessage = err.response.data.message;
                }
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  // Función para limpiar el formulario
  const resetForm = () => {
    setAuxiliarEmail('');
    setAuxiliarId('');
    setCreateTaskPermission(false);
    setCreateExamPermission(false);
    setAddDialogVisible(false);
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
              onPress={() => setAddDialogVisible(true)}
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

        {/* Diálogo para añadir docente auxiliar */}
        <Dialog visible={addDialogVisible} onDismiss={resetForm}>
          <Dialog.Title>Añadir Docente Auxiliar</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Email del docente"
              value={auxiliarEmail}
              onChangeText={setAuxiliarEmail}
              style={styles.input}
              placeholder="ejemplo@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={auxiliarEmail !== '' && !auxiliarEmail.includes('@')}
            />
            {auxiliarEmail !== '' && !auxiliarEmail.includes('@') && (
              <Text style={styles.errorInputText}>Ingrese un email válido</Text>
            )}
            
            <TextInput
              label="ID del docente"
              value={auxiliarId}
              onChangeText={setAuxiliarId}
              style={styles.input}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              error={auxiliarId !== '' && auxiliarId.length < 8}
            />
            {auxiliarId !== '' && auxiliarId.length < 8 && (
              <Text style={styles.errorInputText}>El ID debe tener al menos 8 caracteres</Text>
            )}
            
            <Text style={styles.permissionsTitle}>Permisos:</Text>
            
            <View style={styles.checkboxContainer}>
              <Checkbox
                status={createTaskPermission ? 'checked' : 'unchecked'}
                onPress={() => setCreateTaskPermission(!createTaskPermission)}
              />
              <Text onPress={() => setCreateTaskPermission(!createTaskPermission)} style={styles.checkboxLabel}>
                Crear tareas (create task)
              </Text>
            </View>
            
            <View style={styles.checkboxContainer}>
              <Checkbox
                status={createExamPermission ? 'checked' : 'unchecked'}
                onPress={() => setCreateExamPermission(!createExamPermission)}
              />
              <Text onPress={() => setCreateExamPermission(!createExamPermission)} style={styles.checkboxLabel}>
                Crear exámenes (create exam)
              </Text>
            </View>
            
            {!createTaskPermission && !createExamPermission && (
              <Text style={styles.errorInputText}>Debe seleccionar al menos un permiso</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={resetForm}>Cancelar</Button>
            <Button 
              onPress={addAuxiliarTeacher} 
              loading={isSubmitting}
              disabled={isSubmitting || !auxiliarEmail || !auxiliarId || (!createTaskPermission && !createExamPermission)}
            >
              Añadir
            </Button>
          </Dialog.Actions>
        </Dialog>
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
  input: {
    marginBottom: 15,
  },
  permissionsTitle: {
    marginTop: 10,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  checkboxLabel: {
    marginLeft: 8,
  },
  errorInputText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
});

export default AuxiliarTeachersModal;
