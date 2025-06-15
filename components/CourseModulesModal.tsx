import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, List, FAB, Card, TextInput, HelperText, Chip } from "react-native-paper";
import * as DocumentPicker from 'expo-document-picker';
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
  order_idx: z.number()
    .min(0, "El orden debe ser un número positivo")
    .optional(),  type: z.enum(["videos", "documentos", "enlaces"], {
    errorMap: () => ({ message: "Selecciona un tipo válido" })
  }).optional(),  original_name: z.string()
    .max(255, "El nombre no puede exceder 255 caracteres")
    .optional(),
  resource: z.any().optional(), // Para el archivo opcional
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
  moduleData: ModuleFormValues,
  selectedFile?: DocumentPicker.DocumentPickerAsset | null
): Promise<Module> => {
  try {
    const formData = new FormData();
    formData.append('x-user-id', userId);
    formData.append('x-user-email', email);
    formData.append('title', moduleData.title);
    formData.append('description', moduleData.description);
    
    // Agregar campos opcionales si están presentes
    if (moduleData.order_idx !== undefined && moduleData.order_idx !== null) {
      formData.append('order_idx', moduleData.order_idx.toString());
    }
    
    if (moduleData.type) {
      formData.append('type', moduleData.type);
    }
    
    if (moduleData.original_name && moduleData.original_name.trim() !== "") {
      formData.append('original_name', moduleData.original_name);
    }

    // Agregar archivo si está presente
    if (selectedFile) {
      formData.append('resource', {
        uri: selectedFile.uri,
        type: selectedFile.mimeType || 'application/octet-stream',
        name: selectedFile.name || 'file',
      } as any);
    }

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
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  // Configurar React Hook Form con validación Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors,
    watch,
    setValue,
  } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),    defaultValues: {
      title: "",
      description: "",
      order_idx: undefined,
      type: undefined,
      original_name: "",
      resource: undefined,
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
  };  // Función para abrir el modal de creación de módulo
  const openCreateModuleModal = () => {
    reset({
      title: "",
      description: "",
      order_idx: undefined,
      type: undefined,
      original_name: "",
      resource: undefined,
    });
    setSelectedFile(null);
    setCreateModuleVisible(true);
  };// Función para cerrar el modal de creación de módulo
  const closeCreateModuleModal = () => {
    setCreateModuleVisible(false);
    setSelectedFile(null);
    reset({
      title: "",
      description: "",
      order_idx: undefined,
      type: undefined,
      original_name: "",
      resource: undefined,
    });
  };
  
  // Función para seleccionar archivo
  const selectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Permite cualquier tipo de archivo
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile(asset);
        
        // Si se selecciona un archivo y no hay nombre original, usar el nombre del archivo
        if (asset.name) {
          const currentOriginalName = watch('original_name');
          if (!currentOriginalName || currentOriginalName.trim() === '') {
            setValue('original_name', asset.name);
          }
        }
      }
    } catch (error) {
      console.error('Error al seleccionar archivo:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  // Función para remover archivo seleccionado
  const removeSelectedFile = () => {
    setSelectedFile(null);
    setValue('resource', undefined);
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

    setIsCreating(true);    try {
      await createCourseModule(
        courseId,
        session.token,
        session.userId,
        userEmail,
        data,
        selectedFile
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
                          <Text style={styles.moduleOrder}>#{module.order_idx}</Text>
                          <List.Icon {...props} icon="chevron-down" />
                        </View>
                      )}
                      expanded={expandedModules.has(module.module_id)}
                      onPress={() => toggleModuleExpansion(module.module_id)}
                      style={styles.moduleAccordion}
                    >
                      <View style={styles.moduleContent}>
                        
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
      >
        <View style={styles.createModalContent}>
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
          {/* Orden del módulo (opcional) */}
          <Controller
            control={control}
            name="order_idx"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Orden del módulo (opcional)"
                mode="outlined"
                style={styles.input}
                onBlur={onBlur}
                onChangeText={(text) => {
                  // Solo permitir números enteros
                  if (text === '') {
                    onChange(undefined);
                  } else if (/^\d+$/.test(text)) {
                    const numValue = parseInt(text, 10);
                    onChange(numValue);
                    if (errors.order_idx && numValue >= 0) {
                      clearErrors('order_idx');
                    }
                  }
                  // Si no es un número entero válido, no hacemos nada (no actualiza el valor)
                }}
                value={value?.toString() || ''}
                error={!!errors.order_idx}
                keyboardType="number-pad"
                placeholder="Ej: 1, 2, 3..."
              />
            )}
          />
          {errors.order_idx && (
            <HelperText type="error">{errors.order_idx.message}</HelperText>
          )}

          {/* Tipo de contenido (opcional) */}
          <Text style={styles.fieldLabel}>Tipo de contenido (opcional)</Text>
          <Controller
            control={control}
            name="type"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipContainer}>
                {['videos', 'documentos', 'enlaces'].map((typeOption) => (
                  <Chip
                    key={typeOption}
                    selected={value === typeOption}
                    onPress={() => onChange(value === typeOption ? undefined : typeOption)}
                    style={[
                      styles.chip,
                      value === typeOption && styles.selectedChip,
                    ]}
                    textStyle={value === typeOption ? styles.selectedChipText : undefined}
                  >
                    {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
                  </Chip>
                ))}
              </View>
            )}
          />
          {errors.type && (
            <HelperText type="error">{errors.type.message}</HelperText>
          )}

          {/* Nombre original (opcional) */}
          <Controller
            control={control}
            name="original_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Nombre original del archivo (opcional)"
                mode="outlined"
                style={styles.input}
                onBlur={onBlur}
                onChangeText={(text) => {
                  onChange(text);
                  if (errors.original_name && text.length <= 255) {
                    clearErrors('original_name');
                  }
                }}
                value={value || ''}
                error={!!errors.original_name}
                maxLength={255}
                placeholder="Ej: documento.pdf, video.mp4..."
              />
            )}
          />
          {errors.original_name && (
            <HelperText type="error">{errors.original_name.message}</HelperText>
          )}

          {/* Subir archivo (opcional) */}
          <Text style={styles.fieldLabel}>Subir archivo (opcional)</Text>
          <View style={styles.fileUploadContainer}>
            {selectedFile ? (
              <View style={styles.selectedFileContainer}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {selectedFile.size ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Tamaño desconocido'}
                  </Text>
                </View>
                <TouchableOpacity onPress={removeSelectedFile} style={styles.removeFileButton}>
                  <Text style={styles.removeFileText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="file-upload"
                onPress={selectFile}
                style={styles.uploadButton}
                disabled={isCreating}
              >
                Seleccionar archivo
              </Button>
            )}
          </View>
          
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
  },  createModalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 8,
    color: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  selectedChip: {
    backgroundColor: '#2E7D32',
  },  selectedChipText: {
    color: 'white',
  },
  fileUploadContainer: {
    marginBottom: 15,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  removeFileButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  removeFileText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  uploadButton: {
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
  },
});

export default CourseModulesModal;
