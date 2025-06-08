import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Paragraph, Chip, Card, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from "@/contexts/session";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { forumClient, client } from "@/lib/http";
import jwtDecode from "jwt-decode";

// Tipo para el usuario
type UserProfile = {
  user_id: string;
  user_type: string;
  name: string;
  bio: string;
};

// Tipo para las preguntas
type Question = {
  _id: string;
  forum_id: string;
  user_id: string | null;
  title: string;
  description: string;
  tags: string[];
  created_at: string;
  is_active: boolean;
  answers: string[];
  accepted_answer: string | null;
  votes: {
    up: string[];
    down: string[];
  };
  userName?: string; // Campo opcional para almacenar el nombre del usuario
  answerCount?: number; // Campo opcional para el conteo de respuestas desde el backend
};

// Tipo para las respuestas
type Answer = {
  _id: string;
  content: string;
  created_at: string;
  is_active: boolean;
  question_id: string;
  user_id: string;
  votes: {
    up: string[];
    down: string[];
  };
  userName?: string; // Campo opcional para almacenar el nombre del usuario
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
  
  // Estado para eliminación de foro
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estado para las preguntas
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  // Estado para paginación de preguntas
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [questionsPerPage] = useState(3); // Número fijo de preguntas por página
  
  // Estado para creación de preguntas
  const [createQuestionVisible, setCreateQuestionVisible] = useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [newQuestionTitle, setNewQuestionTitle] = useState("");
  const [newQuestionDescription, setNewQuestionDescription] = useState("");
  const [newQuestionTags, setNewQuestionTags] = useState("");
    // Estado para edición de preguntas
  const [editQuestionVisible, setEditQuestionVisible] = useState(false);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);
    // Estado para las respuestas
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questionDetailVisible, setQuestionDetailVisible] = useState(false);
    // Estado para creación de respuestas
  const [newAnswerContent, setNewAnswerContent] = useState("");
  const [isCreatingAnswer, setIsCreatingAnswer] = useState(false);
    // Estado para edición de respuestas
  const [editAnswerVisible, setEditAnswerVisible] = useState(false);
  const [isEditingAnswer, setIsEditingAnswer] = useState(false);
  const [answerToEdit, setAnswerToEdit] = useState<Answer | null>(null);
  const [editAnswerContent, setEditAnswerContent] = useState("");
  
  // Estado para eliminación de respuestas
  const [isDeletingAnswer, setIsDeletingAnswer] = useState(false);
  
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
      const response = await client.get(
        `/profile/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const profileData: UserProfile = response.data;
      
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
  // Función para cargar las preguntas de un foro con paginación
  const fetchQuestions = async (forumId: string, page: number = 1) => {
    if (!session?.token) {
      return;
    }
    
    setLoadingQuestions(true);
    
    try {
      const response = await forumClient.get(
        `/questions/?forum_id=${forumId}&limit=${questionsPerPage}&page=${page}&is_active=true`,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Questions response:", JSON.stringify(response.data, null, 2));
        if (response.data && response.data.questions) {
        // Enriquecer las preguntas con información de usuario
        let enrichedQuestions = await enrichQuestionsWithUserInfo(response.data.questions);
        // Enriquecer las preguntas con el conteo real de respuestas
        enrichedQuestions = await enrichQuestionsWithAnswerCount(enrichedQuestions);
        setQuestions(enrichedQuestions);
        
        // Actualizar información de paginación
        if (response.data.total_pages !== undefined) {
          setTotalPages(response.data.total_pages);
        } else {
          // Si el backend no proporciona el total de páginas, hacemos una estimación
          const totalItems = response.data.total_questions || enrichedQuestions.length;
          const calculatedTotalPages = Math.ceil(totalItems / questionsPerPage);
          setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
        }
        setCurrentPage(page);
      } else {
        console.warn('Formato de respuesta inesperado en preguntas:', response.data);
        setQuestions([]);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Error al obtener preguntas:", error);
      setQuestions([]);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoadingQuestions(false);
    }
  };
    // Función para enriquecer las preguntas con información de usuario
  const enrichQuestionsWithUserInfo = async (questionsData: Question[]) => {
    const enrichedQuestions = [...questionsData];
    const userPromises = questionsData
      .filter(question => question.user_id) // Filtrar null user_id
      .map(question => fetchUserProfile(question.user_id as string));
    
    try {
      const userResults = await Promise.allSettled(userPromises);
      
      let userIndex = 0;
      for (let i = 0; i < enrichedQuestions.length; i++) {
        if (enrichedQuestions[i].user_id) {
          const result = userResults[userIndex];
          if (result.status === 'fulfilled' && result.value) {
            enrichedQuestions[i] = {
              ...enrichedQuestions[i],
              userName: result.value.name
            };
          }
          userIndex++;
        }
      }
      
      return enrichedQuestions;
    } catch (error) {
      console.error("Error al enriquecer las preguntas con información de usuario:", error);
      return questionsData;
    }  };

  // Función para cargar las respuestas de una pregunta
  const fetchAnswers = async (questionId: string) => {
    if (!session?.token) {
      return;
    }
    
    setLoadingAnswers(true);
    
    try {
      const response = await forumClient.get(
        `/answers/?is_active=true&question_id=${questionId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Answers response:", JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.answers) {
        // Enriquecer las respuestas con información de usuario
        const enrichedAnswers = await enrichAnswersWithUserInfo(response.data.answers);
        setAnswers(enrichedAnswers);
      } else {
        console.warn('Formato de respuesta inesperado en respuestas:', response.data);
        setAnswers([]);
      }
    } catch (error) {
      console.error("Error al obtener respuestas:", error);
      setAnswers([]);
    } finally {
      setLoadingAnswers(false);
    }
  };

  // Función para enriquecer las respuestas con información de usuario
  const enrichAnswersWithUserInfo = async (answersData: Answer[]) => {
    const enrichedAnswers = [...answersData];
    const userPromises = answersData
      .filter(answer => answer.user_id) // Filtrar null user_id
      .map(answer => fetchUserProfile(answer.user_id));
    
    try {
      const userResults = await Promise.allSettled(userPromises);
      
      let userIndex = 0;
      for (let i = 0; i < enrichedAnswers.length; i++) {
        if (enrichedAnswers[i].user_id) {
          const result = userResults[userIndex];
          if (result.status === 'fulfilled' && result.value) {
            enrichedAnswers[i] = {
              ...enrichedAnswers[i],
              userName: result.value.name
            };
          }
          userIndex++;
        }
      }
      
      return enrichedAnswers;
    } catch (error) {
      console.error("Error al enriquecer las respuestas con información de usuario:", error);
      return answersData;
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
  };  const openForumDetail = async (forum: Forum) => {
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
    
    // Reiniciar estado de paginación y cargar primera página de preguntas
    setCurrentPage(1);
    fetchQuestions(forum._id, 1);  };

  // Función para abrir el detalle de una pregunta y cargar sus respuestas
  const openQuestionDetail = async (question: Question) => {
    // Si la pregunta no tiene el nombre del usuario, intentamos obtenerlo
    let questionWithUser = {...question};
    if (!question.userName && question.user_id) {
      const userProfile = await fetchUserProfile(question.user_id);
      if (userProfile) {
        questionWithUser.userName = userProfile.name;
      }
    }
    
    setSelectedQuestion(questionWithUser);
    setQuestionDetailVisible(true);
    
    // Cargar las respuestas de la pregunta
    fetchAnswers(question._id);
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
      
      const response = await forumClient.put(
        `/forums/${forumToEdit._id}`,
        forumData,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const responseData = response.data;
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

  // Función para eliminar un foro
  const deleteForum = async (forumId: string) => {
    if (!session?.token) {
      Alert.alert("Error", "No se pudo eliminar el foro. Falta información requerida.");
      return;
    }
    
    // Mostrar confirmación antes de eliminar
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que deseas eliminar este foro? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            
            try {
              await forumClient.delete(
                `/forums/${forumId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${session.token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              console.log("Foro eliminado correctamente:", forumId);
              
              // Si estamos en el detalle del foro eliminado, cerramos el modal
              if (selectedForum && selectedForum._id === forumId) {
                setForumDetailVisible(false);
                setSelectedForum(null);
              }
              
              // Refrescar la lista de foros
              fetchForums();
              
              Alert.alert(
                "Éxito",
                "El foro se ha eliminado correctamente."
              );
            } catch (error) {
              console.error("Error al eliminar el foro:", error);
              Alert.alert(
                "Error",
                "No se pudo eliminar el foro. Por favor, intente nuevamente."
              );
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Funciones para la navegación de paginación
  const goToPreviousPage = () => {
    if (currentPage > 1 && selectedForum) {
      const newPage = currentPage - 1;
      fetchQuestions(selectedForum._id, newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages && selectedForum) {
      const newPage = currentPage + 1;
      fetchQuestions(selectedForum._id, newPage);
    }
  };

  // Función para crear una nueva pregunta
  const createQuestion = async () => {
    if (!selectedForum || !session?.token) {
      Alert.alert("Error", "No se pudo crear la pregunta. Falta información requerida.");
      return;
    }
    
    if (!newQuestionTitle.trim()) {
      Alert.alert("Error", "El título de la pregunta es obligatorio.");
      return;
    }
    
    if (!newQuestionDescription.trim()) {
      Alert.alert("Error", "La descripción de la pregunta es obligatoria.");
      return;
    }
    
    setIsCreatingQuestion(true);
    
    try {
      // Preparar los tags (separados por comas)
      const tags = newQuestionTags.trim() 
        ? newQuestionTags.split(',').map(tag => tag.trim()) 
        : [];
      
      const questionData = {
        forum_id: selectedForum._id,
        title: newQuestionTitle,
        description: newQuestionDescription,
        user_id: session.userId,
        tags: tags
      };
      
      console.log("Creando pregunta con datos:", questionData);
      
      const response = await forumClient.post(
        '/questions/',
        questionData,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Respuesta de creación de pregunta:", response.data);
      
      // Limpiar el formulario
      setNewQuestionTitle("");
      setNewQuestionDescription("");
      setNewQuestionTags("");
      
      // Cerrar el modal de creación
      setCreateQuestionVisible(false);
      
      // Refrescar la lista de preguntas
      fetchQuestions(selectedForum._id, currentPage);
      
      Alert.alert(
        "Éxito",
        "La pregunta se ha creado correctamente."
      );
    } catch (error) {
      console.error("Error al crear la pregunta:", error);
      Alert.alert(
        "Error",
        "No se pudo crear la pregunta. Por favor, intente nuevamente."
      );
    } finally {
      setIsCreatingQuestion(false);
    }
  };
  // Función para abrir el modal de edición de pregunta
  const openEditQuestion = (question: Question) => {
    setQuestionToEdit(question);
    setNewQuestionTitle(question.title);
    setNewQuestionDescription(question.description);
    setNewQuestionTags(question.tags.join(", "));
    setEditQuestionVisible(true);
  };

  // Función para modificar una pregunta existente
  const updateQuestion = async () => {
    if (!questionToEdit || !selectedForum || !session?.token) {
      Alert.alert("Error", "No se pudo modificar la pregunta. Falta información requerida.");
      return;
    }
    
    if (!newQuestionTitle.trim()) {
      Alert.alert("Error", "El título de la pregunta es obligatorio.");
      return;
    }
    
    if (!newQuestionDescription.trim()) {
      Alert.alert("Error", "La descripción de la pregunta es obligatoria.");
      return;
    }
    
    setIsEditingQuestion(true);
    
    try {
      // Preparar los tags (separados por comas)
      const tags = newQuestionTags.trim() 
        ? newQuestionTags.split(',').map(tag => tag.trim()) 
        : [];
      
      const questionData = {
        forum_id: selectedForum._id,
        title: newQuestionTitle,
        description: newQuestionDescription,
        tags: tags
      };
      
      console.log("Modificando pregunta con datos:", questionData);
      
      const response = await forumClient.put(
        `/questions/${questionToEdit._id}`,
        questionData,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Respuesta de modificación de pregunta:", response.data);
      
      // Limpiar el formulario
      setNewQuestionTitle("");
      setNewQuestionDescription("");
      setNewQuestionTags("");
      setQuestionToEdit(null);
      
      // Cerrar el modal de edición
      setEditQuestionVisible(false);
      
      // Refrescar la lista de preguntas
      fetchQuestions(selectedForum._id, currentPage);
      
      Alert.alert(
        "Éxito",
        "La pregunta se ha modificado correctamente."
      );
    } catch (error) {
      console.error("Error al modificar la pregunta:", error);
      Alert.alert(
        "Error",
        "No se pudo modificar la pregunta. Por favor, intente nuevamente."
      );
    } finally {
      setIsEditingQuestion(false);
    }
  };
  // Función para eliminar una pregunta
  const deleteQuestion = async (questionId: string) => {
    if (!session?.token) {
      Alert.alert("Error", "No se pudo eliminar la pregunta. Falta información requerida.");
      return;
    }
    
    // Mostrar confirmación antes de eliminar
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que deseas eliminar esta pregunta? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await forumClient.delete(
                `/questions/${questionId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${session.token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              console.log("Pregunta eliminada correctamente:", questionId);
              
              // Refrescar la lista de preguntas
              if (selectedForum) {
                fetchQuestions(selectedForum._id, currentPage);
              }
              
              Alert.alert(
                "Éxito",
                "La pregunta se ha eliminado correctamente."
              );
            } catch (error) {
              console.error("Error al eliminar la pregunta:", error);
              Alert.alert(
                "Error",
                "No se pudo eliminar la pregunta. Por favor, intente nuevamente."
              );
            }
          }
        }
      ]
    );
  };  // Función para manejar los votos (upvote/downvote)
  const handleVote = async (questionId: string, voteType: 'up' | 'down') => {
    if (!session?.token || !session.userId) {
      Alert.alert("Error", "Debe iniciar sesión para votar.");
      return;
    }
    
    try {
      // Encontrar la pregunta actual para verificar si el usuario ya votó
      const currentQuestion = questions.find(q => q._id === questionId);
      if (!currentQuestion) return;
      
      // Verificar si el usuario ya votó en esta categoría
      const hasUpvoted = currentQuestion.votes.up.includes(session.userId);
      const hasDownvoted = currentQuestion.votes.down.includes(session.userId);
      
      // Preparar el objeto de voto
      const voteData = {
        user_id: session.userId,
        type: voteType
      };
      
      console.log(`Enviando voto para pregunta ${questionId}:`, voteData);
      
      const response = await forumClient.post(
        `/questions/${questionId}/votes`,
        voteData,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Respuesta de voto:", response.data);
      
      // Actualizar localmente la pregunta con los nuevos votos
      const updatedQuestions = questions.map(q => {
        if (q._id === questionId) {
          // Crear una copia de los votos actuales
          const updatedVotes = { ...q.votes };
          
          // Lógica para manejar la actualización local de votos
          if (voteType === 'up') {
            // Añadimos el voto positivo
            updatedVotes.up = [...updatedVotes.up, session.userId];
            // Y si había dado downvote, lo quitamos
            if (hasDownvoted) {
              updatedVotes.down = updatedVotes.down.filter(id => id !== session.userId);
            }
          } else if (voteType === 'down') {
            // Añadimos el voto negativo
            updatedVotes.down = [...updatedVotes.down, session.userId];
            // Y si había dado upvote, lo quitamos
            if (hasUpvoted) {
              updatedVotes.up = updatedVotes.up.filter(id => id !== session.userId);
            }
          }
          
          return { ...q, votes: updatedVotes };
        }
        return q;
      });
      
      setQuestions(updatedQuestions);
    } catch (error) {
      console.error("Error al votar:", error);
      Alert.alert(
        "Error",
        "No se pudo registrar su voto. Por favor, intente nuevamente."
      );
    }
  };

  // Función para eliminar un voto existente
  const handleDeleteVote = async (questionId: string, voteType: 'up' | 'down') => {
    if (!session?.token || !session.userId) {
      Alert.alert("Error", "Debe iniciar sesión para eliminar su voto.");
      return;
    }
    
    try {
      // Encontrar la pregunta actual
      const currentQuestion = questions.find(q => q._id === questionId);
      if (!currentQuestion) return;
      
      // Verificar si el usuario tiene un voto del tipo especificado
      const hasUpvoted = voteType === 'up' && currentQuestion.votes.up.includes(session.userId);
      const hasDownvoted = voteType === 'down' && currentQuestion.votes.down.includes(session.userId);
      
      // Solo proceder si el usuario tiene un voto del tipo que quiere eliminar
      if (!hasUpvoted && !hasDownvoted) {
        console.log(`No hay voto de tipo ${voteType} para eliminar`);
        return;
      }
      
      console.log(`Eliminando voto ${voteType} para pregunta ${questionId}`);
      
      const response = await forumClient.delete(
        `/questions/${questionId}/votes?user_id=${session.userId}&type=${voteType}`,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Respuesta de eliminar voto:", response.data);
      
      // Actualizar localmente la pregunta with los nuevos votos
      const updatedQuestions = questions.map(q => {
        if (q._id === questionId) {
          // Crear una copia de los votos actuales
          const updatedVotes = { ...q.votes };
          
          // Eliminar el voto según el tipo
          if (voteType === 'up') {
            updatedVotes.up = updatedVotes.up.filter(id => id !== session.userId);
          } else if (voteType === 'down') {
            updatedVotes.down = updatedVotes.down.filter(id => id !== session.userId);
          }
          
          return { ...q, votes: updatedVotes };
        }
        return q;
      });
      
      setQuestions(updatedQuestions);
    } catch (error) {
      console.error("Error al eliminar el voto:", error);
      Alert.alert(
        "Error",
        "No se pudo eliminar su voto. Por favor, intente nuevamente."
      );
    }
  };
    // Función para verificar el estado de voto del usuario actual en una pregunta
  const getUserVoteStatus = (question: Question) => {
    if (!session || !session.userId) {
      return { upvoted: false, downvoted: false };
    }
    
    const upvoted = question.votes.up.includes(session.userId);
    const downvoted = question.votes.down.includes(session.userId);
    
    return { upvoted, downvoted };
  };

  // Función para manejar los votos de respuestas (upvote/downvote)
  const handleAnswerVote = async (answerId: string, voteType: 'up' | 'down') => {
    if (!session?.token || !session.userId) {
      Alert.alert("Error", "Debe iniciar sesión para votar.");
      return;
    }
    
    try {
      // Encontrar la respuesta actual para verificar si el usuario ya votó
      const currentAnswer = answers.find(a => a._id === answerId);
      if (!currentAnswer) return;
      
      // Verificar si el usuario ya votó en esta categoría
      const hasUpvoted = currentAnswer.votes.up.includes(session.userId);
      const hasDownvoted = currentAnswer.votes.down.includes(session.userId);
      
      // Preparar el objeto de voto
      const voteData = {
        user_id: session.userId,
        type: voteType
      };
      
      console.log(`Enviando voto para respuesta ${answerId}:`, voteData);
      
      const response = await forumClient.post(
        `/answers/${answerId}/votes`,
        voteData,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Respuesta de voto:", response.data);
      
      // Actualizar localmente la respuesta con los nuevos votos
      const updatedAnswers = answers.map(a => {
        if (a._id === answerId) {
          // Crear una copia de los votos actuales
          const updatedVotes = { ...a.votes };
          
          // Lógica para manejar la actualización local de votos
          if (voteType === 'up') {
            // Añadimos el voto positivo
            updatedVotes.up = [...updatedVotes.up, session.userId];
            // Y si había dado downvote, lo quitamos
            if (hasDownvoted) {
              updatedVotes.down = updatedVotes.down.filter(id => id !== session.userId);
            }
          } else if (voteType === 'down') {
            // Añadimos el voto negativo
            updatedVotes.down = [...updatedVotes.down, session.userId];
            // Y si había dado upvote, lo quitamos
            if (hasUpvoted) {
              updatedVotes.up = updatedVotes.up.filter(id => id !== session.userId);
            }
          }
          
          return { ...a, votes: updatedVotes };
        }
        return a;
      });
      
      setAnswers(updatedAnswers);
    } catch (error) {
      console.error("Error al votar respuesta:", error);
      Alert.alert(
        "Error",
        "No se pudo registrar su voto. Por favor, intente nuevamente."
      );
    }
  };

  // Función para eliminar un voto existente de una respuesta
  const handleDeleteAnswerVote = async (answerId: string, voteType: 'up' | 'down') => {
    if (!session?.token || !session.userId) {
      Alert.alert("Error", "Debe iniciar sesión para eliminar su voto.");
      return;
    }
    
    try {
      // Encontrar la respuesta actual
      const currentAnswer = answers.find(a => a._id === answerId);
      if (!currentAnswer) return;
      
      // Verificar si el usuario tiene un voto del tipo especificado
      const hasUpvoted = voteType === 'up' && currentAnswer.votes.up.includes(session.userId);
      const hasDownvoted = voteType === 'down' && currentAnswer.votes.down.includes(session.userId);
      
      // Solo proceder si el usuario tiene un voto del tipo que quiere eliminar
      if (!hasUpvoted && !hasDownvoted) {
        console.log(`No hay voto de tipo ${voteType} para eliminar en la respuesta`);
        return;
      }
      
      console.log(`Eliminando voto ${voteType} para respuesta ${answerId}`);
      
      const response = await forumClient.delete(
        `/answers/${answerId}/votes?user_id=${session.userId}&type=${voteType}`,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Respuesta de eliminar voto:", response.data);
      
      // Actualizar localmente la respuesta con los nuevos votos
      const updatedAnswers = answers.map(a => {
        if (a._id === answerId) {
          // Crear una copia de los votos actuales
          const updatedVotes = { ...a.votes };
          
          // Eliminar el voto según el tipo
          if (voteType === 'up') {
            updatedVotes.up = updatedVotes.up.filter(id => id !== session.userId);
          } else if (voteType === 'down') {
            updatedVotes.down = updatedVotes.down.filter(id => id !== session.userId);
          }
          
          return { ...a, votes: updatedVotes };
        }
        return a;
      });
      
      setAnswers(updatedAnswers);
    } catch (error) {
      console.error("Error al eliminar el voto de respuesta:", error);
      Alert.alert(
        "Error",
        "No se pudo eliminar su voto. Por favor, intente nuevamente."
      );
    }
  };
  
  // Función para verificar el estado de voto del usuario actual en una respuesta
  const getAnswerVoteStatus = (answer: Answer) => {
    if (!session || !session.userId) {
      return { upvoted: false, downvoted: false };
    }
    
    const upvoted = answer.votes.up.includes(session.userId);
    const downvoted = answer.votes.down.includes(session.userId);
    
    return { upvoted, downvoted };
  };

  // Función para enriquecer las preguntas con el conteo real de respuestas
  const enrichQuestionsWithAnswerCount = async (questionsData: Question[]) => {
    const enrichedQuestions = [...questionsData];
    
    try {
      // Crear promesas para obtener el conteo de respuestas de cada pregunta
      const answerCountPromises = questionsData.map(async (question) => {
        try {
          const response = await forumClient.get(
            `/answers/?is_active=true&question_id=${question._id}`,
            {
              headers: {
                'Authorization': `Bearer ${session?.token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          // Retornar el conteo real de respuestas
          return response.data?.answers?.length || 0;
        } catch (error) {
          console.error(`Error al obtener respuestas para pregunta ${question._id}:`, error);
          return question.answers?.length || 0; // Fallback al array local
        }
      });
      
      // Esperar a que todas las promesas se resuelvan
      const answerCounts = await Promise.allSettled(answerCountPromises);
      
      // Actualizar cada pregunta con su conteo real de respuestas
      for (let i = 0; i < enrichedQuestions.length; i++) {
        const result = answerCounts[i];
        if (result.status === 'fulfilled') {
          enrichedQuestions[i] = {
            ...enrichedQuestions[i],
            answerCount: result.value
          };
        }
      }
      
      return enrichedQuestions;
    } catch (error) {
      console.error("Error al enriquecer las preguntas con conteo de respuestas:", error);
      return questionsData;
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
              
              <Button 
                mode="text" 
                onPress={() => deleteForum(forum._id)}
                style={styles.deleteButton}
                icon="delete"
                labelStyle={[styles.buttonLabel, { color: '#D32F2F' }]}
              >
                Eliminar
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
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionTitle}>Discusiones</Text>
              <Button 
                mode="contained" 
                style={styles.createQuestionButton}
                onPress={() => setCreateQuestionVisible(true)}
                icon="plus"
              >
                Nueva Pregunta
              </Button>
            </View>
            
            {loadingQuestions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0000ff" />
                <Text style={styles.loadingText}>Cargando preguntas...</Text>
              </View>
            ) : questions.length === 0 ? (
              <Text style={styles.emptyText}>No hay preguntas en este foro. ¡Sé el primero en preguntar!</Text>
            ) : (
              <View>
                {questions.map((question) => (
                  <Card key={question._id} style={styles.questionCard}>
                    <Card.Content>
                      <View style={styles.questionHeader}>
                        <View style={styles.questionContent}>
                          <Title style={styles.questionTitle}>{question.title}</Title>
                          
                          <Paragraph numberOfLines={2} style={styles.questionDescription}>
                            {question.description}
                          </Paragraph>
                        </View>
                      </View>
                      
                      <View style={styles.metadataContainer}>
                        <View style={styles.metadata}>
                          <MaterialCommunityIcons name="account" size={16} color="#666" />
                          <Text style={styles.metadataText}>
                            {question.userName || question.user_id || 'Usuario anónimo'}
                          </Text>
                        </View>
                          <View style={styles.metadata}>
                          <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                          <Text style={styles.metadataText}>{formatDate(question.created_at)}</Text>
                        </View>
                          <View style={styles.metadata}>
                          <MaterialCommunityIcons name="comment-multiple-outline" size={16} color="#666" />
                          <Text style={styles.metadataText}>
                            {question.answerCount !== undefined ? question.answerCount : question.answers.length} respuestas
                          </Text>
                        </View>
                      </View>
                        {question.tags && question.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                          {question.tags.map((tag, index) => (
                            <Chip key={index} style={styles.tag} mode="outlined" textStyle={{ fontSize: 12 }}>
                              {tag}
                            </Chip>
                          ))}
                        </View>
                      )}
                      </Card.Content>
                    <Card.Actions style={styles.cardActions}>
                      {/* Botones de votación */}
                      <View style={styles.votingActionsContainer}>
                        <TouchableOpacity 
                          style={styles.voteButton}
                          onPress={() => {
                            const isUpvoted = getUserVoteStatus(question).upvoted;
                            if (isUpvoted) {
                              handleDeleteVote(question._id, 'up');
                            } else {
                              handleVote(question._id, 'up');
                            }
                          }}
                          accessibilityLabel="Voto positivo"
                        >
                          <MaterialCommunityIcons 
                            name={getUserVoteStatus(question).upvoted ? "thumb-up" : "thumb-up-outline"} 
                            size={18} 
                            color={getUserVoteStatus(question).upvoted ? '#4CAF50' : '#757575'} 
                          />
                          <Text style={[styles.voteCountInline, getUserVoteStatus(question).upvoted ? styles.positiveVotes : null]}>
                            {question.votes.up.length}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.voteButton}
                          onPress={() => {
                            const isDownvoted = getUserVoteStatus(question).downvoted;
                            if (isDownvoted) {
                              handleDeleteVote(question._id, 'down');
                            } else {
                              handleVote(question._id, 'down');
                            }
                          }}
                          accessibilityLabel="Voto negativo"
                        >
                          <MaterialCommunityIcons 
                            name={getUserVoteStatus(question).downvoted ? "thumb-down" : "thumb-down-outline"} 
                            size={18} 
                            color={getUserVoteStatus(question).downvoted ? '#F44336' : '#757575'} 
                          />
                          <Text style={[styles.voteCountInline, getUserVoteStatus(question).downvoted ? styles.negativeVotes : null]}>
                            {question.votes.down.length}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* Botones de acción */}
                      <View style={styles.questionActionButtons}>
                        <Button 
                          mode="text" 
                          onPress={() => openQuestionDetail(question)}
                          style={styles.detailButton}
                          icon="comment-multiple-outline"
                          labelStyle={styles.buttonLabel}
                          compact
                        >
                          Ver Respuestas
                        </Button>
                        
                        <Button 
                          mode="text" 
                          onPress={() => openEditQuestion(question)}
                          style={styles.editButton}
                          icon="pencil"
                          labelStyle={styles.buttonLabel}
                          compact
                        >
                          Editar
                        </Button>
                        
                        <Button 
                          mode="text" 
                          onPress={() => deleteQuestion(question._id)}
                          style={styles.deleteButton}
                          icon="delete"
                          labelStyle={[styles.buttonLabel, { color: '#D32F2F' }]}
                          compact
                        >
                          Eliminar
                        </Button>
                      </View>
                    </Card.Actions>
                  </Card>
                ))}
                
                {/* Controles de paginación */}
                <View style={styles.paginationContainer}>
                  <Button 
                    mode="text" 
                    onPress={goToPreviousPage}
                    disabled={currentPage <= 1 || loadingQuestions}
                    icon="chevron-left"
                  >
                    Anterior
                  </Button>
                  
                  <Text style={styles.paginationText}>
                    Página {currentPage} de {totalPages}
                  </Text>
                  
                  <Button 
                    mode="text" 
                    onPress={goToNextPage}
                    disabled={currentPage >= totalPages || loadingQuestions}
                    icon="chevron-right"
                    contentStyle={{ flexDirection: 'row-reverse' }}
                  >
                    Siguiente
                  </Button>
                </View>
              </View>
            )}
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
              disabled={isDeleting}
            >
              Editar
            </Button>
              <Button 
              mode="contained" 
              style={[styles.actionButton, { backgroundColor: '#D32F2F' }]}
              onPress={() => deleteForum(selectedForum._id)}
              icon="delete"
              disabled={isDeleting}
              loading={isDeleting}
            >
              Eliminar
            </Button>
          </View>
        </ScrollView>
        
        {/* Modal para crear una nueva pregunta */}
        <Modal
          visible={createQuestionVisible}
          onDismiss={() => !isCreatingQuestion && setCreateQuestionVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.headerContainer}>
            <Title style={styles.headerTitle}>
              Crear Nueva Pregunta
            </Title>
            
            {!isCreatingQuestion && (
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setCreateQuestionVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          <ScrollView style={styles.contentContainer}>
            <TextInput
              label="Título"
              value={newQuestionTitle}
              onChangeText={setNewQuestionTitle}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ingrese el título de la pregunta"
              disabled={isCreatingQuestion}
            />
            
            <TextInput
              label="Descripción"
              value={newQuestionDescription}
              onChangeText={setNewQuestionDescription}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ingrese una descripción detallada de su pregunta"
              multiline
              numberOfLines={4}
              disabled={isCreatingQuestion}
            />
            
            <TextInput
              label="Etiquetas (separadas por comas)"
              value={newQuestionTags}
              onChangeText={setNewQuestionTags}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ej: tarea, duda, consulta"
              disabled={isCreatingQuestion}
            />
            
            <View style={styles.formButtonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => setCreateQuestionVisible(false)}
                style={styles.formButton}
                disabled={isCreatingQuestion}
              >
                Cancelar
              </Button>
              
              <Button 
                mode="contained" 
                onPress={createQuestion}
                style={[styles.formButton, { backgroundColor: '#1976D2' }]}
                loading={isCreatingQuestion}
                disabled={isCreatingQuestion}
              >
                {isCreatingQuestion ? 'Creando...' : 'Crear Pregunta'}
              </Button>
            </View>
          </ScrollView>
        </Modal>
        
        {/* Modal para editar una pregunta existente */}
        <Modal
          visible={editQuestionVisible}
          onDismiss={() => !isEditingQuestion && setEditQuestionVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.headerContainer}>
            <Title style={styles.headerTitle}>
              Editar Pregunta
            </Title>
            
            {!isEditingQuestion && (
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setEditQuestionVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          <ScrollView style={styles.contentContainer}>
            <TextInput
              label="Título"
              value={newQuestionTitle}
              onChangeText={setNewQuestionTitle}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ingrese el título de la pregunta"
              disabled={isEditingQuestion}
            />
            
            <TextInput
              label="Descripción"
              value={newQuestionDescription}
              onChangeText={setNewQuestionDescription}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ingrese una descripción detallada de su pregunta"
              multiline
              numberOfLines={4}
              disabled={isEditingQuestion}
            />
            
            <TextInput
              label="Etiquetas (separadas por comas)"
              value={newQuestionTags}
              onChangeText={setNewQuestionTags}
              mode="outlined"
              style={styles.formInput}
              placeholder="Ej: tarea, duda, consulta"
              disabled={isEditingQuestion}
            />
            
            <View style={styles.formButtonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => setEditQuestionVisible(false)}
                style={styles.formButton}
                disabled={isEditingQuestion}
              >
                Cancelar
              </Button>
              
              <Button 
                mode="contained" 
                onPress={updateQuestion}
                style={[styles.formButton, { backgroundColor: '#1976D2' }]}
                loading={isEditingQuestion}
                disabled={isEditingQuestion}
              >
                {isEditingQuestion ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </View>
          </ScrollView>
          </Modal>
      </Modal>
    );
  };

  // Función para renderizar el modal de detalle de pregunta con respuestas
  const renderQuestionDetailModal = () => {
    if (!selectedQuestion) return null;

    return (
      <Modal
        visible={questionDetailVisible}
        onDismiss={() => setQuestionDetailVisible(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView>
          <View style={styles.questionDetailHeader}>
            <Title style={styles.questionDetailTitle}>{selectedQuestion.title}</Title>
              <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setQuestionDetailVisible(false);
                // Refrescar la lista de preguntas para mantener los contadores actualizados
                if (selectedForum) {
                  fetchQuestions(selectedForum._id, currentPage);
                }
              }}
            >
              <MaterialCommunityIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Contenido de la pregunta */}
          <View style={styles.questionDetailContainer}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Paragraph style={styles.questionDetailDescription}>
              {selectedQuestion.description}
            </Paragraph>
            
            {/* Metadatos de la pregunta */}
            <View style={styles.metadataContainer}>
              <View style={styles.metadata}>
                <MaterialCommunityIcons name="account" size={16} color="#666" />
                <Text style={styles.metadataText}>
                  Por: {selectedQuestion.userName || selectedQuestion.user_id || 'Usuario anónimo'}
                </Text>
              </View>
              
              <View style={styles.metadata}>
                <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                <Text style={styles.metadataText}>{formatDate(selectedQuestion.created_at)}</Text>
              </View>
                <View style={styles.metadata}>
                <MaterialCommunityIcons name="comment-multiple-outline" size={16} color="#666" />
                <Text style={styles.metadataText}>{answers.length} respuestas</Text>
              </View>
            </View>
            
            {/* Tags de la pregunta */}
            {selectedQuestion.tags && selectedQuestion.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {selectedQuestion.tags.map((tag, index) => (
                  <Chip key={index} style={styles.tag} mode="outlined" textStyle={{ fontSize: 12 }}>
                    {tag}
                  </Chip>
                ))}
              </View>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Sección de respuestas */}
          <View style={styles.answersSection}>
            <View style={styles.answersSectionHeader}>
              <Text style={styles.sectionTitle}>
                Respuestas ({answers.length})
              </Text>
            </View>
            
            {loadingAnswers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0000ff" />
                <Text style={styles.loadingText}>Cargando respuestas...</Text>
              </View>
            ) : answers.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay respuestas para esta pregunta. ¡Sé el primero en responder!
              </Text>
            ) : (
              <View>
                {answers.map((answer) => (
                  <Card key={answer._id} style={styles.answerCard}>
                    <Card.Content>
                      <Paragraph style={styles.answerContent}>
                        {answer.content}
                      </Paragraph>
                        <View style={styles.answerMetadata}>
                        <View style={styles.metadata}>
                          <MaterialCommunityIcons name="account" size={14} color="#666" />
                          <Text style={styles.answerMetadataText}>
                            {answer.userName || answer.user_id || 'Usuario anónimo'}
                          </Text>
                        </View>
                        
                        <View style={styles.metadata}>
                          <MaterialCommunityIcons name="calendar" size={14} color="#666" />
                          <Text style={styles.answerMetadataText}>
                            {formatDate(answer.created_at)}
                          </Text>
                        </View>
                      </View>
                    </Card.Content>
                    
                    {/* Botones de votación para respuestas */}
                    <Card.Actions style={styles.cardActions}>
                      <View style={styles.votingActionsContainer}>
                        <TouchableOpacity 
                          style={styles.voteButton}
                          onPress={() => {
                            const isUpvoted = getAnswerVoteStatus(answer).upvoted;
                            if (isUpvoted) {
                              handleDeleteAnswerVote(answer._id, 'up');
                            } else {
                              handleAnswerVote(answer._id, 'up');
                            }
                          }}
                          accessibilityLabel="Voto positivo"
                        >
                          <MaterialCommunityIcons 
                            name={getAnswerVoteStatus(answer).upvoted ? "thumb-up" : "thumb-up-outline"} 
                            size={18} 
                            color={getAnswerVoteStatus(answer).upvoted ? '#4CAF50' : '#757575'} 
                          />
                          <Text style={[styles.voteCountInline, getAnswerVoteStatus(answer).upvoted ? styles.positiveVotes : null]}>
                            {answer.votes.up.length}
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.voteButton}
                          onPress={() => {
                            const isDownvoted = getAnswerVoteStatus(answer).downvoted;
                            if (isDownvoted) {
                              handleDeleteAnswerVote(answer._id, 'down');
                            } else {
                              handleAnswerVote(answer._id, 'down');
                            }
                          }}
                          accessibilityLabel="Voto negativo"
                        >
                          <MaterialCommunityIcons 
                            name={getAnswerVoteStatus(answer).downvoted ? "thumb-down" : "thumb-down-outline"} 
                            size={18} 
                            color={getAnswerVoteStatus(answer).downvoted ? '#F44336' : '#757575'} 
                          />
                          <Text style={[styles.voteCountInline, getAnswerVoteStatus(answer).downvoted ? styles.negativeVotes : null]}>
                            {answer.votes.down.length}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </Card.Actions>
                      {/* Botones de acción para respuestas */}
                    {session?.userId === answer.user_id && (
                      <Card.Actions style={styles.answerActions}>
                        <Button 
                          mode="text" 
                          onPress={() => openEditAnswer(answer)}
                          icon="pencil"
                          labelStyle={styles.buttonLabel}
                          compact
                          disabled={isDeletingAnswer}
                        >
                          Editar
                        </Button>
                        
                        <Button 
                          mode="text" 
                          onPress={() => deleteAnswer(answer._id)}
                          icon="delete"
                          labelStyle={[styles.buttonLabel, { color: '#D32F2F' }]}
                          compact
                          disabled={isDeletingAnswer}
                        >
                          Eliminar
                        </Button>
                      </Card.Actions>
                    )}
                  </Card>
                ))}
              </View>
            )}
          </View>
          
          {/* Sección para crear nueva respuesta */}
          <Divider style={styles.divider} />
          
          <View style={styles.answersSection}>
            <Text style={styles.sectionTitle}>Agregar Respuesta</Text>
            
            <TextInput
              label="Tu respuesta"
              value={newAnswerContent}
              onChangeText={setNewAnswerContent}
              mode="outlined"
              style={styles.formInput}
              placeholder="Escribe tu respuesta aquí..."
              multiline
              numberOfLines={4}
              disabled={isCreatingAnswer}
            />
            
            <View style={styles.formButtonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => setNewAnswerContent("")}
                style={styles.formButton}
                disabled={isCreatingAnswer || !newAnswerContent.trim()}
              >
                Limpiar
              </Button>
              
              <Button 
                mode="contained" 
                onPress={createAnswer}
                style={[styles.formButton, { backgroundColor: '#1976D2' }]}
                loading={isCreatingAnswer}
                disabled={isCreatingAnswer || !newAnswerContent.trim()}
              >
                {isCreatingAnswer ? 'Enviando...' : 'Enviar Respuesta'}
              </Button>
            </View>
          </View>
        </ScrollView>
      </Modal>
    );
  };
  
  // Función para crear una nueva respuesta
  const createAnswer = async () => {
    if (!selectedQuestion || !session?.token || !session.userId) {
      Alert.alert("Error", "No se pudo crear la respuesta. Falta información requerida.");
      return;
    }
    
    if (!newAnswerContent.trim()) {
      Alert.alert("Error", "El contenido de la respuesta es obligatorio.");
      return;
    }
    
    setIsCreatingAnswer(true);
    
    try {
      const answerData = {
        question_id: selectedQuestion._id,
        user_id: session.userId,
        content: newAnswerContent.trim()
      };
      
      console.log("Creando respuesta con datos:", answerData);
      
      const response = await forumClient.post(
        '/answers/',
        answerData,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );      console.log("Respuesta de creación de respuesta:", response.data);
      
      // Obtener el ID de la nueva respuesta de la respuesta del servidor
      const newAnswerId = response.data.answer?._id || response.data._id || Date.now().toString();
      
      // Limpiar el formulario
      setNewAnswerContent("");      // Actualizar el contador de respuestas en la pregunta seleccionada
      const newAnswersArray = [...selectedQuestion.answers, newAnswerId];
      const updatedSelectedQuestion = {
        ...selectedQuestion,
        answers: newAnswersArray,
        answerCount: (selectedQuestion.answerCount || selectedQuestion.answers.length) + 1 // Incrementar el conteo actual
      };
      setSelectedQuestion(updatedSelectedQuestion);
      
      // Actualizar el contador de respuestas en la lista de preguntas
      const updatedQuestions = questions.map(q => {
        if (q._id === selectedQuestion._id) {
          const updatedAnswersArray = [...q.answers, newAnswerId];
          return { 
            ...q, 
            answers: updatedAnswersArray, 
            answerCount: (q.answerCount || q.answers.length) + 1 // Incrementar el conteo actual
          };
        }
        return q;
      });
      setQuestions(updatedQuestions);
      
      // Refrescar la lista de respuestas
      fetchAnswers(selectedQuestion._id);
      
      Alert.alert(
        "Éxito",
        "La respuesta se ha creado correctamente."
      );
    } catch (error) {
      console.error("Error al crear la respuesta:", error);
      Alert.alert(
        "Error",
        "No se pudo crear la respuesta. Por favor, intente nuevamente."
      );    } finally {
      setIsCreatingAnswer(false);
    }
  };

  // Función para abrir el modal de edición de respuesta
  const openEditAnswer = (answer: Answer) => {
    setAnswerToEdit(answer);
    setEditAnswerContent(answer.content);
    setEditAnswerVisible(true);
  };

  // Función para actualizar una respuesta existente
  const updateAnswer = async () => {
    if (!answerToEdit || !session?.token) {
      Alert.alert("Error", "No se pudo modificar la respuesta. Falta información requerida.");
      return;
    }
    
    if (!editAnswerContent.trim()) {
      Alert.alert("Error", "El contenido de la respuesta es obligatorio.");
      return;
    }
    
    setIsEditingAnswer(true);
    
    try {
      const answerData = {
        content: editAnswerContent.trim()
      };
      
      console.log("Modificando respuesta con datos:", answerData);
      
      const response = await forumClient.put(
        `/answers/${answerToEdit._id}`,
        answerData,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("Respuesta de modificación de respuesta:", response.data);
      
      // Limpiar el formulario
      setEditAnswerContent("");
      setAnswerToEdit(null);
      
      // Cerrar el modal de edición
      setEditAnswerVisible(false);
      
      // Refrescar la lista de respuestas
      if (selectedQuestion) {
        fetchAnswers(selectedQuestion._id);
      }
      
      Alert.alert(
        "Éxito",
        "La respuesta se ha modificado correctamente."
      );
    } catch (error) {
      console.error("Error al modificar la respuesta:", error);
      Alert.alert(
        "Error",
        "No se pudo modificar la respuesta. Por favor, intente nuevamente."
      );    } finally {
      setIsEditingAnswer(false);
    }
  };

  // Función para eliminar una respuesta
  const deleteAnswer = async (answerId: string) => {
    if (!session?.token) {
      Alert.alert("Error", "No se pudo eliminar la respuesta. Falta información requerida.");
      return;
    }
    
    // Mostrar confirmación antes de eliminar
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que deseas eliminar esta respuesta? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setIsDeletingAnswer(true);
            
            try {
              await forumClient.delete(
                `/answers/${answerId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${session.token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              console.log("Respuesta eliminada correctamente:", answerId);
              
              // Actualizar el contador de respuestas en la pregunta seleccionada
              if (selectedQuestion) {
                const updatedAnswersArray = selectedQuestion.answers.filter(id => id !== answerId);
                const updatedSelectedQuestion = {
                  ...selectedQuestion,
                  answers: updatedAnswersArray,
                  answerCount: Math.max(0, (selectedQuestion.answerCount || selectedQuestion.answers.length) - 1)
                };
                setSelectedQuestion(updatedSelectedQuestion);
                
                // Actualizar también en la lista de preguntas
                const updatedQuestions = questions.map(q => {
                  if (q._id === selectedQuestion._id) {
                    return {
                      ...q,
                      answers: updatedAnswersArray,
                      answerCount: Math.max(0, (q.answerCount || q.answers.length) - 1)
                    };
                  }
                  return q;
                });
                setQuestions(updatedQuestions);
              }
              
              // Refrescar la lista de respuestas
              if (selectedQuestion) {
                fetchAnswers(selectedQuestion._id);
              }
              
              Alert.alert(
                "Éxito",
                "La respuesta se ha eliminado correctamente."
              );
            } catch (error) {
              console.error("Error al eliminar la respuesta:", error);
              Alert.alert(
                "Error",
                "No se pudo eliminar la respuesta. Por favor, intente nuevamente."
              );
            } finally {
              setIsDeletingAnswer(false);
            }
          }
        }
      ]    );
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
          {/* Modal para detalle de pregunta con respuestas */}
        {renderQuestionDetailModal()}
        
        {/* Modal para editar respuesta */}
        <Modal
          visible={editAnswerVisible}
          onDismiss={() => !isEditingAnswer && setEditAnswerVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.headerContainer}>
            <Title style={styles.headerTitle}>
              Editar Respuesta
            </Title>
            
            {!isEditingAnswer && (
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setEditAnswerVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          <ScrollView style={styles.contentContainer}>
            <TextInput
              label="Contenido de la respuesta"
              value={editAnswerContent}
              onChangeText={setEditAnswerContent}
              mode="outlined"
              style={styles.formInput}
              placeholder="Escribe tu respuesta aquí..."
              multiline
              numberOfLines={4}
              disabled={isEditingAnswer}
            />
            
            <View style={styles.formButtonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => setEditAnswerVisible(false)}
                style={styles.formButton}
                disabled={isEditingAnswer}
              >
                Cancelar
              </Button>
              
              <Button 
                mode="contained" 
                onPress={updateAnswer}
                style={[styles.formButton, { backgroundColor: '#1976D2' }]}
                loading={isEditingAnswer}
                disabled={isEditingAnswer || !editAnswerContent.trim()}
              >
                {isEditingAnswer ? 'Guardando...' : 'Guardar Cambios'}
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
  },
  questionCard: {
    marginBottom: 12,
    elevation: 1,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  questionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },  cardActions: {
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'column',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  detailButton: {
    marginBottom: 4,
  },
  editButton: {
    marginBottom: 4,
  },
  deleteButton: {
    marginBottom: 0,
  },
  buttonLabel: {
    fontSize: 12,
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
  },  sectionContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  createQuestionButton: {
    backgroundColor: '#1976D2',
    marginBottom: 8,
    height: 36,
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
  },  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 16,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },  paginationText: {
    fontSize: 14,
    color: '#666',
  },
  // Estilos para la votación
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },  votingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 4,
    minWidth: 40,
  },  votingActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  questionActionButtons: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    marginTop: 8,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginHorizontal: 4,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  voteCountInline: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  positiveVotes: {
    color: '#4CAF50',
  },
  negativeVotes: {
    color: '#F44336',
  },
  questionContent: {
    flex: 1,
  },  voteInfo: {
    fontSize: 12,
    color: '#666',
    marginRight: 'auto',
    alignItems: 'center',
    flexDirection: 'row',
  },
  // Estilos para el modal de detalle de pregunta
  questionDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  questionDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  questionDetailContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  questionDetailDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    color: '#333',
  },
  answersSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  answersSectionHeader: {
    marginBottom: 12,
  },
  answerCard: {
    marginBottom: 12,
    elevation: 1,
    backgroundColor: '#f8f9fa',
  },
  answerContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    color: '#333',
  },
  answerMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  answerMetadataText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    marginRight: 12,
  },
  answerActions: {
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 8,
  }
});

export default CourseForumModal;
