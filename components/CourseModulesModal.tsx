import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, List, FAB, Card } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";

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
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

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
                onPress={() => {
                  // TODO: Implementar creación de módulo
                  Alert.alert("Próximamente", "Funcionalidad de creación de módulos en desarrollo");
                }}
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
                onPress={() => {
                  // TODO: Implementar creación de módulo
                  Alert.alert("Próximamente", "Funcionalidad de creación de módulos en desarrollo");
                }}
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
  },
  closeButton: {
    marginTop: 10,
  },
});

export default CourseModulesModal;
