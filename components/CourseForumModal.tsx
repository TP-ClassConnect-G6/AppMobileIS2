import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Paragraph, Chip, Card, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from "@/contexts/session";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { forumClient } from "@/lib/http";
import jwtDecode from "jwt-decode";

// Tipo para el usuario
type UserProfile = {
  user_id: string;
  user_type: string;
  name: string;
  bio: string;
};

// Tipo para el foro
type Forum = {
  _id: string;
  course_id: string;
  created_at: string;
  description: string;
  is_active: boolean;
  tags: string[];
  title: string;
  user_id: string;
  userName?: string; // Campo opcional para almacenar el nombre del usuario
};

// Props para el componente modal
type CourseForumModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
  courseName: string | null;
};

const CourseForumModal = ({ visible, onDismiss, courseId, courseName }: CourseForumModalProps) => {
  const [loading, setLoading] = useState(true);
  const [forums, setForums] = useState<Forum[]>([]);
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [forumDetailVisible, setForumDetailVisible] = useState(false);
  const [createForumVisible, setCreateForumVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  
  // Estado para edición de foro
  const [editForumVisible, setEditForumVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [forumToEdit, setForumToEdit] = useState<Forum | null>(null);
  
  // Estado para los campos del formulario de creación/edición
  const [newForumTitle, setNewForumTitle] = useState("");
  const [newForumDescription, setNewForumDescription] = useState("");
  const [newForumTags, setNewForumTags] = useState("");
  
  const { session } = useSession();
  useEffect(() => {
    if (visible && courseId) {
      fetchForums();
    }
  }, [visible, courseId]);

  // Función para obtener el perfil de un usuario
  const fetchUserProfile = async (userId: string) => {
    // Si ya tenemos el perfil del usuario en caché, no hacemos la petición
    if (userProfiles[userId]) {
      return userProfiles[userId];
    }
    
    if (!session?.token) {
      return null;
    }
    
    try {
      const response = await fetch(
        `https://apigatewayis2-production.up.railway.app/users/profile/${userId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error al obtener el perfil del usuario: ${response.status}`);
      }
      
      const profileData: UserProfile = await response.json();
      
      // Guardar el perfil en la caché
      setUserProfiles(prev => ({
        ...prev,
        [userId]: profileData
      }));
      
      return profileData;
    } catch (error) {
      console.error(`Error al obtener el perfil del usuario ${userId}:`, error);
      return null;
    }
  };

  // Función para enriquecer los foros con información de usuario
  const enrichForumsWithUserInfo = async (forumsData: Forum[]) => {
    const enrichedForums = [...forumsData];
    const userPromises = forumsData.map(forum => fetchUserProfile(forum.user_id));
    
    try {
      const userResults = await Promise.allSettled(userPromises);
      
      userResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          enrichedForums[index] = {
            ...enrichedForums[index],
            userName: result.value.name
          };
        }
      });
      
      return enrichedForums;
    } catch (error) {
      console.error("Error al enriquecer los foros con información de usuario:", error);
      return forumsData;
    }
  };

  const fetchForums = async () => {
    if (!courseId || !session?.token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await forumClient.get(
        `/forums/?course_id=${courseId}&is_active=true`,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Forum response:", JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.forums) {
        // Enriquecer los foros con información de usuario
        const enrichedForums = await enrichForumsWithUserInfo(response.data.forums);
        setForums(enrichedForums);
      } else {
        console.warn('Formato de respuesta inesperado en foros:', response.data);
        setForums([]);
      }
    } catch (error) {
      console.error("Error al obtener foros:", error);
      Alert.alert(
        "Error",
        "No se pudieron cargar los foros del curso. Por favor, intente nuevamente."
      );
      setForums([]);
    } finally {
      setLoading(false);
    }
  };
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy, HH:mm', { locale: es });
    } catch (e) {
      return dateString;
    }
  };
  const openForumDetail = async (forum: Forum) => {
    // Si el foro no tiene el nombre del usuario, intentamos obtenerlo
    let forumWithUser = {...forum};
    if (!forum.userName) {
      const userProfile = await fetchUserProfile(forum.user_id);
      if (userProfile) {
        forumWithUser.userName = userProfile.name;
      }
    }
    
    setSelectedForum(forumWithUser);
    setForumDetailVisible(true);
  };
    // Función para crear un nuevo foro
  const createForum = async () => {
    if (!courseId || !session?.token || !session.userId) {
      Alert.alert("Error", "No se pudo crear el foro. Falta información requerida.");
      return;
    }
    
    if (!newForumTitle.trim()) {
      Alert.alert("Error", "El título del foro es obligatorio.");
      return;
    }
    
    if (!newForumDescription.trim()) {
      Alert.alert("Error", "La descripción del foro es obligatoria.");
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Preparar los tags (separados por comas)
      const tags = newForumTags.trim() 
        ? newForumTags.split(',').map(tag => tag.trim()) 
        : [];
      
      const forumData = {
        title: newForumTitle,
        description: newForumDescription,
        user_id: session.userId,
        course_id: courseId,
        tags: tags
      };
      
      console.log("Creando foro con datos:", forumData);
      
      const response = await forumClient.post(
        '/forums/',
        forumData,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Respuesta de creación de foro:", response.data);
      
      // Limpiar el formulario
      setNewForumTitle("");
      setNewForumDescription("");
      setNewForumTags("");
      
      // Cerrar el modal de creación
      setCreateForumVisible(false);
      
      // Refrescar la lista de foros
      fetchForums();
      
      Alert.alert(
        "Éxito",
        "El foro se ha creado correctamente."
      );
    } catch (error) {
      console.error("Error al crear el foro:", error);
      Alert.alert(
        "Error",
        "No se pudo crear el foro. Por favor, intente nuevamente."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const openEditForum = (forum: Forum) => {
    setForumToEdit(forum);
    setNewForumTitle(forum.title);
    setNewForumDescription(forum.description);
    setNewForumTags(forum.tags.join(", "));
    setEditForumVisible(true);
  };

  // Función para modificar un foro existente
  const updateForum = async () => {
    if (!forumToEdit || !session?.token) {
      Alert.alert("Error", "No se pudo modificar el foro. Falta información requerida.");
      return;
    }
    
    if (!newForumTitle.trim()) {
      Alert.alert("Error", "El título del foro es obligatorio.");
      return;
    }
    
    if (!newForumDescription.trim()) {
      Alert.alert("Error", "La descripción del foro es obligatoria.");
      return;
    }
    
    setIsEditing(true);
    
    try {
      // Preparar los tags (separados por comas)
      const tags = newForumTags.trim() 
        ? newForumTags.split(',').map(tag => tag.trim()) 
        : [];
      
      const forumData = {
        title: newForumTitle,
        description: newForumDescription,
        user_id: forumToEdit.user_id,
        course_id: forumToEdit.course_id,
        tags: tags
      };
      
      console.log("Modificando foro con datos:", forumData);
      
      const response = await fetch(
        `https://apigatewayis2-production.up.railway.app/forum/forums/${forumToEdit._id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(forumData)
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error al modificar el foro: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log("Respuesta de modificación de foro:", responseData);
      
      // Limpiar el formulario
      setNewForumTitle("");
      setNewForumDescription("");
      setNewForumTags("");
      setForumToEdit(null);
      
      // Cerrar el modal de edición
      setEditForumVisible(false);
      
      // Refrescar la lista de foros
      fetchForums();
      
      // Si estamos en el detalle de este foro, actualizamos también el foro seleccionado
      if (selectedForum && selectedForum._id === forumToEdit._id) {
        const updatedForum = {
          ...forumToEdit,
          title: newForumTitle,
          description: newForumDescription,
          tags: tags
        };
        setSelectedForum(updatedForum);
      }
      
      Alert.alert(
        "Éxito",
        "El foro se ha modificado correctamente."
      );
    } catch (error) {
      console.error("Error al modificar el foro:", error);
      Alert.alert(
        "Error",
        "No se pudo modificar el foro. Por favor, intente nuevamente."
      );
    } finally {
      setIsEditing(false);
    }
  };

  const renderForumList = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Cargando foros...</Text>
        </View>
      );
    }

    if (forums.length === 0) {
        return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="forum-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No hay foros disponibles para este curso.</Text>
          <Button 
            mode="contained" 
            style={styles.createButton}
            onPress={() => setCreateForumVisible(true)}
            icon="plus"
          >
            Crear nuevo foro
          </Button>
        </View>
      );
    }

    return (
      <>
        <Button 
          mode="contained" 
          style={styles.createButton}
          onPress={() => setCreateForumVisible(true)}
          icon="plus"
        >
          Crear nuevo foro
        </Button>

        {forums.map((forum) => (
          <Card 
            key={forum._id} 
            style={styles.forumCard}
            onPress={() => openForumDetail(forum)}
          >
            <Card.Content>
              <Title style={styles.forumTitle}>{forum.title}</Title>
              
              <Paragraph numberOfLines={2} style={styles.forumDescription}>
                {forum.description}
              </Paragraph>
                <View style={styles.metadataContainer}>
                <View style={styles.metadata}>
                  <MaterialCommunityIcons name="account" size={16} color="#666" />
                  <Text style={styles.metadataText}>
                    {forum.userName || 'Cargando usuario...'}
                  </Text>
                </View>
                
                <View style={styles.metadata}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                  <Text style={styles.metadataText}>{formatDate(forum.created_at)}</Text>
                </View>
              </View>
              
              {forum.tags && forum.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {forum.tags.map((tag, index) => (
                    <Chip key={index} style={styles.tag} mode="outlined" textStyle={{ fontSize: 12 }}>
                      {tag}
                    </Chip>
                  ))}
                </View>
              )}
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button 
                mode="text" 
                onPress={() => openForumDetail(forum)}
                style={styles.detailButton}
                icon="forum"
                labelStyle={styles.buttonLabel}
              >
                Ver
              </Button>
              
              <Button 
                mode="text" 
                onPress={() => openEditForum(forum)}
                style={styles.editButton}
                icon="pencil"
                labelStyle={styles.buttonLabel}
              >
                Editar
              </Button>
            </Card.Actions>
          </Card>
        ))}
      </>
    );
  };

  const renderForumDetail = () => {
    if (!selectedForum) return null;

    return (
      <Modal
        visible={forumDetailVisible}
        onDismiss={() => setForumDetailVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView>
          <View style={styles.detailHeader}>
            <Title style={styles.detailTitle}>{selectedForum.title}</Title>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setForumDetailVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <Divider style={styles.divider} />
            <View style={styles.metadataContainer}>
            <View style={styles.metadata}>
              <MaterialCommunityIcons name="account" size={16} color="#666" />
              <Text style={styles.metadataText}>
                {selectedForum.userName || 'Cargando usuario...'}
              </Text>
            </View>
            
            <View style={styles.metadata}>
              <MaterialCommunityIcons name="calendar" size={16} color="#666" />
              <Text style={styles.metadataText}>{formatDate(selectedForum.created_at)}</Text>
            </View>
          </View>
          
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Paragraph style={styles.description}>{selectedForum.description}</Paragraph>
          </View>
          
          {selectedForum.tags && selectedForum.tags.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Etiquetas</Text>
              <View style={styles.tagsContainer}>
                {selectedForum.tags.map((tag, index) => (
                  <Chip key={index} style={styles.tag} mode="outlined">
                    {tag}
                  </Chip>
                ))}
              </View>
            </View>
          )}
            <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Discusiones</Text>
            <Text style={styles.emptyText}>Esta funcionalidad será implementada próximamente.</Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              style={styles.actionButton}
              onPress={() => setForumDetailVisible(false)}
              icon="arrow-left"
            >
              Volver
            </Button>
            
            <Button 
              mode="contained" 
              style={[styles.actionButton, { backgroundColor: '#1976D2' }]}
              onPress={() => {
                setForumDetailVisible(false);
                openEditForum(selectedForum);
              }}
              icon="pencil"
            >
              Editar
            </Button>
          </View>
        </ScrollView>
      </Modal>
    );
  };
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.headerContainer}>
          <Title style={styles.headerTitle}>
            Foros {courseName ? `- ${courseName}` : ''}
          </Title>
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onDismiss}
          >
            <MaterialCommunityIcons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        <Divider style={styles.divider} />
        
        <ScrollView style={styles.contentContainer}>
          {renderForumList()}
        </ScrollView>
        
        {renderForumDetail()}
        
        {/* Modal para crear un nuevo foro */}
        <Modal
          visible={createForumVisible}
          onDismiss={() => !isCreating && setCreateForumVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.headerContainer}>
            <Title style={styles.headerTitle}>
              Crear Nuevo Foro
            </Title>
            
            {!isCreating && (
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setCreateForumVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          <ScrollView style={styles.contentContainer}>
            <TextInput
              label="Título"
              value={newForumTitle}
              onChangeText={setNewForumTitle}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ingrese el título del foro"
              disabled={isCreating}
            />
            
            <TextInput
              label="Descripción"
              value={newForumDescription}
              onChangeText={setNewForumDescription}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ingrese una descripción para el foro"
              multiline
              numberOfLines={4}
              disabled={isCreating}
            />
            
            <TextInput
              label="Etiquetas (separadas por comas)"
              value={newForumTags}
              onChangeText={setNewForumTags}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ej: duda, parcial, proyecto"
              disabled={isCreating}
            />
            
            <View style={styles.formButtonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => setCreateForumVisible(false)}
                style={styles.formButton}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              
              <Button 
                mode="contained" 
                onPress={createForum}
                style={[styles.formButton, { backgroundColor: '#1976D2' }]}
                loading={isCreating}
                disabled={isCreating}
              >
                {isCreating ? 'Creando...' : 'Crear Foro'}
              </Button>
            </View>
          </ScrollView>
        </Modal>
        
        {/* Modal para editar un foro existente */}
        <Modal
          visible={editForumVisible}
          onDismiss={() => !isEditing && setEditForumVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.headerContainer}>
            <Title style={styles.headerTitle}>
              Editar Foro
            </Title>
            
            {!isEditing && (
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setEditForumVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          <ScrollView style={styles.contentContainer}>
            <TextInput
              label="Título"
              value={newForumTitle}
              onChangeText={setNewForumTitle}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ingrese el título del foro"
              disabled={isEditing}
            />
            
            <TextInput
              label="Descripción"
              value={newForumDescription}
              onChangeText={setNewForumDescription}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ingrese una descripción para el foro"
              multiline
              numberOfLines={4}
              disabled={isEditing}
            />
            
            <TextInput
              label="Etiquetas (separadas por comas)"
              value={newForumTags}
              onChangeText={setNewForumTags}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ej: duda, parcial, proyecto"
              disabled={isEditing}
            />
            
            <View style={styles.formButtonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => setEditForumVisible(false)}
                style={styles.formButton}
                disabled={isEditing}
              >
                Cancelar
              </Button>
              
              <Button 
                mode="contained" 
                onPress={updateForum}
                style={[styles.formButton, { backgroundColor: '#1976D2' }]}
                loading={isEditing}
                disabled={isEditing}
              >
                {isEditing ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </View>
          </ScrollView>
        </Modal>
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
    width: '90%',
    alignSelf: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  createButton: {
    marginVertical: 16,
    backgroundColor: '#1976D2',
  },
  forumCard: {
    marginBottom: 16,
    elevation: 2,
  },
  forumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  forumDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#E3F2FD',
  },  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailButton: {
    marginLeft: 'auto',
  },
  editButton: {
    marginLeft: 8,
  },
  buttonLabel: {
    fontSize: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  sectionContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },  backButton: {
    margin: 16,
  },
  formInput: {
    marginBottom: 16,
  },  formButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 24,
  },
  formButton: {
    width: '48%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  }
});

export default CourseForumModal;
