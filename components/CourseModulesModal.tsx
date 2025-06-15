import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, List, FAB, Card, TextInput, HelperText } from "react-native-paper";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";
import jwtDecode from "jwt-decode";

// Schema de validación para el formulario de módulo
const moduleSchema = z.object({
  title: z.string()
    .min(1, "El título es requerido")
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(100, "El título no puede exceder 100 caracteres"),
  description: z.string()
    .min(1, "La descripción es requerida")
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(500, "La descripción no puede exceder 500 caracteres"),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

// Tipos para los módulos y recursos
type Resource = {
  resource_id: string;
  title: string;
  description: string;
  resource_type: string;
  url?: string;
  content?: string;
};

type Module = {
  module_id: string;
  title: string;
  description: string;
  order_idx: number;
  module_status: string;
  resources: Resource[];
};

type ModulesResponse = {
  response: Module[];
};

// Función para obtener los módulos del curso
const fetchCourseModules = async (courseId: string, token: string): Promise<Module[]> => {
  try {
    const response = await courseClient.get(`/courses/${courseId}/modules`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log("Modules API response:", JSON.stringify(response.data, null, 2));
    
    if (response.data?.response && Array.isArray(response.data.response)) {
      return response.data.response;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('Formato de respuesta inesperado en módulos:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error al obtener módulos del curso:', error);
    throw error;  }
};

// Función para crear un nuevo módulo
const createCourseModule = async (
  courseId: string, 
  token: string, 
  userId: string, 
  email: string,
  title: string, 
  description: string
): Promise<Module> => {
  try {
    const formData = new FormData();
    formData.append('x-user-id', userId);
    formData.append('x-user-email', email);
    formData.append('title', title);
    formData.append('description', description);

    const response = await courseClient.post(`/courses/${courseId}/modules`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log("Create module API response:", JSON.stringify(response.data, null, 2));
    
    if (response.data?.response) {
      return response.data.response;
    } else if (response.data) {
      return response.data;
    } else {
      throw new Error('Formato de respuesta inesperado al crear módulo');
    }
  } catch (error) {
    console.error('Error al crear módulo del curso:', error);
    throw error;
  }
};

// Props para el componente modal
type CourseModulesModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
  courseName: string | null;
};

const CourseModulesModal = ({ visible, onDismiss, courseId, courseName }: CourseModulesModalProps) => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Estados para el modal de creación de módulo
  const [createModuleVisible, setCreateModuleVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Configurar React Hook Form con validación Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors,
  } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Consulta para obtener los módulos del curso
  const { data: modules = [], isLoading, error, refetch } = useQuery({
    queryKey: ['courseModules', courseId],
    queryFn: () => courseId && session?.token ? fetchCourseModules(courseId, session.token) : Promise.reject('No courseId or token provided'),
    enabled: !!courseId && !!session?.token && visible,
    staleTime: 60000, // Datos frescos por 1 minuto
    retry: 1,
    retryDelay: 1000,
  });

  // Función para alternar la expansión de un módulo
  const toggleModuleExpansion = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // Función para obtener el ícono según el tipo de recurso
  const getResourceIcon = (resourceType: string) => {
    switch (resourceType.toLowerCase()) {
      case 'video':
        return 'play-circle-outline';
      case 'document':
      case 'pdf':
        return 'file-document-outline';
      case 'link':
      case 'url':
        return 'link';
      case 'image':
        return 'image-outline';
      default:
        return 'file-outline';
    }
  };
  // Función para manejar la acción de un recurso
  const handleResourceAction = (resource: Resource) => {
    // Aquí se puede implementar la lógica para abrir/ver el recurso
    Alert.alert(
      "Recurso",
      `Recurso: ${resource.title}\nTipo: ${resource.resource_type}\nDescripción: ${resource.description}`,
      [{ text: "OK" }]
    );
  };
  // Función para abrir el modal de creación de módulo
  const openCreateModuleModal = () => {
    reset({
      title: "",
      description: "",
    });
    setCreateModuleVisible(true);
  };

  // Función para cerrar el modal de creación de módulo
  const closeCreateModuleModal = () => {
    setCreateModuleVisible(false);
    reset({
      title: "",
      description: "",
    });
  };
  // Función para crear un nuevo módulo
  const handleCreateModule = async (data: ModuleFormValues) => {
    if (!courseId || !session?.token || !session?.userId) {
      Alert.alert('Error', 'Información de sesión incompleta');
      return;
    }

    // Extraer el email del token JWT
    let userEmail = "";
    try {
      const decodedToken: any = jwtDecode(session.token);
      userEmail = decodedToken.email || decodedToken.sub || "";
    } catch (error) {
      console.error("Error al decodificar token:", error);
      Alert.alert('Error', 'No se pudo obtener el email del usuario');
      return;
    }

    if (!userEmail) {
      Alert.alert('Error', 'No se pudo obtener el email del usuario');
      return;
    }

    setIsCreating(true);
    
    try {
      await createCourseModule(
        courseId,
        session.token,
        session.userId,
        userEmail,
        data.title.trim(),
        data.description.trim()
      );

      // Refrescar la lista de módulos
      queryClient.invalidateQueries({ queryKey: ['courseModules', courseId] });
      refetch();

      Alert.alert('Éxito', 'Módulo creado correctamente');
      closeCreateModuleModal();
    } catch (error: any) {
      console.error('Error al crear módulo:', error);
      
      let errorMessage = 'No se pudo crear el módulo. Inténtalo de nuevo.';
      
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = 'Datos del módulo incorrectos. Verifica los campos.';
        } else if (error.response.status === 403) {
          errorMessage = 'No tienes permisos para crear módulos en este curso.';
        } else if (error.response.status === 404) {
          errorMessage = 'Curso no encontrado.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsCreating(false);
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
          <Title style={styles.title}>Organización de Módulos y Recursos</Title>
          {courseName && (
            <Text style={styles.courseName}>{courseName}</Text>
          )}
          
          <Divider style={styles.divider} />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Cargando módulos...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Error al cargar los módulos del curso
              </Text>
              <Button mode="contained" onPress={() => refetch()}>
                Intentar nuevamente
              </Button>
            </View>
          ) : modules.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay módulos configurados para este curso
              </Text>
              <Button 
                mode="contained" 
                style={styles.createButton}
                icon="plus"
                onPress={openCreateModuleModal}
              >
                Crear primer módulo
              </Button>
            </View>
          ) : (
            <>
              {modules
                .sort((a, b) => a.order_idx - b.order_idx)
                .map((module) => (
                  <Card key={module.module_id} style={styles.moduleCard}>
                    <List.Accordion
                      title={module.title}
                      description={module.description}
                      left={(props) => <List.Icon {...props} icon="book-outline" />}
                      right={(props) => (
                        <View style={styles.moduleHeader}>
                          <Text style={styles.moduleOrder}>#{module.order_idx + 1}</Text>
                          <List.Icon {...props} icon="chevron-down" />
                        </View>
                      )}
                      expanded={expandedModules.has(module.module_id)}
                      onPress={() => toggleModuleExpansion(module.module_id)}
                      style={styles.moduleAccordion}
                    >
                      <View style={styles.moduleContent}>
                        <Text style={styles.moduleStatus}>
                          Estado: {module.module_status === 'active' ? 'Activo' : 'Inactivo'}
                        </Text>
                        
                        {module.resources.length === 0 ? (
                          <View style={styles.noResourcesContainer}>
                            <Text style={styles.noResourcesText}>
                              No hay recursos en este módulo
                            </Text>
                            <Button 
                              mode="outlined" 
                              icon="plus"
                              onPress={() => {
                                // TODO: Implementar adición de recurso
                                Alert.alert("Próximamente", "Funcionalidad de adición de recursos en desarrollo");
                              }}
                              style={styles.addResourceButton}
                            >
                              Agregar recurso
                            </Button>
                          </View>
                        ) : (
                          <>
                            <Text style={styles.resourcesTitle}>
                              Recursos ({module.resources.length}):
                            </Text>
                            {module.resources.map((resource) => (
                              <List.Item
                                key={resource.resource_id}
                                title={resource.title}
                                description={resource.description}
                                left={(props) => (
                                  <List.Icon 
                                    {...props} 
                                    icon={getResourceIcon(resource.resource_type)} 
                                  />
                                )}
                                right={(props) => (
                                  <Button
                                    mode="text"
                                    onPress={() => handleResourceAction(resource)}
                                    icon="eye"
                                  >
                                    Ver
                                  </Button>
                                )}
                                style={styles.resourceItem}
                                onPress={() => handleResourceAction(resource)}
                              />
                            ))}
                          </>
                        )}
                        
                        <Divider style={styles.resourceDivider} />
                        
                        <View style={styles.moduleActions}>
                          <Button 
                            mode="outlined" 
                            icon="pencil"
                            onPress={() => {
                              // TODO: Implementar edición de módulo
                              Alert.alert("Próximamente", "Funcionalidad de edición de módulos en desarrollo");
                            }}
                            style={styles.actionButton}
                          >
                            Editar
                          </Button>
                          <Button 
                            mode="outlined" 
                            icon="plus"
                            onPress={() => {
                              // TODO: Implementar adición de recurso
                              Alert.alert("Próximamente", "Funcionalidad de adición de recursos en desarrollo");
                            }}
                            style={styles.actionButton}
                          >
                            Recurso
                          </Button>
                        </View>
                      </View>
                    </List.Accordion>
                  </Card>
                ))}
                {/* Botón para crear nuevo módulo */}
              <Button 
                mode="contained" 
                style={styles.createModuleButton}
                icon="plus"
                onPress={openCreateModuleModal}
              >
                Crear nuevo módulo
              </Button>
            </>
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

      {/* Modal para crear nuevo módulo */}
      <Modal
        visible={createModuleVisible}
        onDismiss={closeCreateModuleModal}
        contentContainerStyle={styles.createModalContainer}
      >        <View style={styles.createModalContent}>
          <Title style={styles.createModalTitle}>Crear Nuevo Módulo</Title>
          
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Título del módulo *"
                mode="outlined"
                style={styles.input}
                onBlur={onBlur}
                onChangeText={(text) => {
                  onChange(text);
                  if (errors.title && text.trim().length >= 3) {
                    clearErrors('title');
                  }
                }}
                value={value}
                error={!!errors.title}
                maxLength={100}
              />
            )}
          />
          {errors.title && (
            <HelperText type="error">{errors.title.message}</HelperText>
          )}
          
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Descripción del módulo *"
                mode="outlined"
                style={styles.input}
                onBlur={onBlur}
                onChangeText={(text) => {
                  onChange(text);
                  if (errors.description && text.trim().length >= 10) {
                    clearErrors('description');
                  }
                }}
                value={value}
                error={!!errors.description}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            )}
          />
          {errors.description && (
            <HelperText type="error">{errors.description.message}</HelperText>
          )}
          
          <View style={styles.createModalButtons}>
            <Button 
              mode="outlined" 
              onPress={closeCreateModuleModal}
              style={styles.createModalButton}
              disabled={isCreating}
            >
              Cancelar
            </Button>
              <Button 
              mode="contained" 
              onPress={handleSubmit(handleCreateModule)}
              style={[styles.createModalButton, styles.createButton]}
              loading={isCreating}
              disabled={isCreating}
            >
              Crear Módulo
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
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  courseName: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#2E7D32',
  },
  moduleCard: {
    marginBottom: 10,
    elevation: 2,
  },
  moduleAccordion: {
    backgroundColor: '#F5F5F5',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleOrder: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    fontWeight: 'bold',
  },
  moduleContent: {
    padding: 15,
    backgroundColor: 'white',
  },
  moduleStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  resourcesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resourceItem: {
    backgroundColor: '#F9F9F9',
    marginBottom: 5,
    borderRadius: 5,
  },
  noResourcesContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noResourcesText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 15,
    textAlign: 'center',
  },
  addResourceButton: {
    borderColor: '#2E7D32',
  },
  resourceDivider: {
    marginVertical: 15,
  },
  moduleActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  createModuleButton: {
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#2E7D32',
  },  closeButton: {
    marginTop: 10,
  },
  createModalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  createModalContent: {
    padding: 20,
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 10,
    backgroundColor: 'white',
  },
  createModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  createModalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default CourseModulesModal;
