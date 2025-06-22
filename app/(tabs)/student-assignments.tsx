import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Platform, Dimensions, Linking } from "react-native";
import { Card, Title, Paragraph, Chip, Divider, Button, Provider, SegmentedButtons, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { courseClient, client } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "@/contexts/session";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import TaskSubmissionModal from '@/components/TaskSubmissionModal';
import ExamSubmissionModal from '@/components/ExamSubmissionModal';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// Tipo para la respuesta de cursos
type Course = {
  course_id: string;
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  category: string | null;
  message?: string;
};

type CoursesResponse = {
  response: Course[];
};

// Tipos para las tareas y exámenes del estudiante
type StudentTask = {
  task_id: string;
  title: string;
  due_date: string;
  published: boolean;
  course_id: string;
  status: 'Pending' | 'Submitted' | 'Evaluated';
};

type StudentExam = {
  exam_id: string;
  title: string;
  date: string;
  published: boolean;
  course_id: string;
  status: 'Pending' | 'Submitted' | 'Evaluated';
};

type TaskDetail = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  owner: string;
  instructions: string;
  extra_conditions: {
    type: string;
    questions?: string;
  };
  published: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  module_id: string | null;
};

type UserProfile = {
  user_id: string;
  email: string;
  user_type: string;
  name: string;
  bio: string;
  location: string;
  phone_number: string;
  date_of_birth: string | null;
  created_at: string;
  is_blocked: boolean;
};

type StudentAssignmentsResponse = {
  response: {
    tasks: {
      items: StudentTask[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    };
    exams: {
      items: StudentExam[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    };
  };
};

// Función para obtener la lista de cursos
const fetchCourses = async (token: string): Promise<Course[]> => {
  try {
    const response = await courseClient.get('/courses/', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data.response || [];
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    return [];
  }
};

// Función para obtener las tareas y exámenes del estudiante
const fetchStudentAssignments = async (
  token: string, 
  taskLimit: number = 5, 
  taskPage: number = 1, 
  examLimit: number = 5, 
  examPage: number = 1,
  filters?: {
    course_id?: string;
    title?: string;
    due_date?: Date | null;
    date?: Date | null;
    status?: string | null;
  }
): Promise<StudentAssignmentsResponse> => {
  // Parámetros base
  const params: Record<string, string | number | boolean> = {
    taskLimit,
    taskPage,
    examLimit,
    examPage
  };

  // Añadir filtros si existen
  if (filters) {
    if (filters.course_id) params.course_id = filters.course_id;
    if (filters.title) params.title = filters.title;
    if (filters.status) params.status = filters.status;
    
    // Formatear fechas si existen
    if (filters.due_date) {
      params.due_date = format(filters.due_date, 'yyyy-MM-dd');
    }
    if (filters.date) {
      params.date = format(filters.date, 'yyyy-MM-dd');
    }
  }
  const response = await courseClient.get('/tasks/students/gateway', {
    params,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data;
};

// Función para obtener el perfil de usuario
const fetchUserProfile = async (token: string, userId: string): Promise<UserProfile> => {
  const response = await client.get(`/profile/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data;
};

export default function StudentAssignmentsScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('tasks');
  const [taskPage, setTaskPage] = useState(1);
  const [examPage, setExamPage] = useState(1);

  // Estados para filtros
  const [filters, setFilters] = useState({
    course_id: '',
    title: '',
    due_date: null as Date | null,
    date: null as Date | null,
    status: null as string | null,
  });

  // Hook para detectar pantallas pequeñas
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      const { width } = Dimensions.get('window');
      setIsSmallScreen(width < 400); // Considerar pantallas menores a 400px como pequeñas
    };

    updateLayout();
    const subscription = Dimensions.addEventListener('change', updateLayout);
    
    return () => subscription?.remove();
  }, []);

  // Estados para los filtros actuales de búsqueda
  const [searchFilters, setSearchFilters] = useState({
    course_id: '',
    title: '',
    due_date: null as Date | null,
    date: null as Date | null,
    status: null as string | null,
  });
  // Estados para UI de los filtros
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  // Estados para el modal de entrega de tareas
  const [submissionModalVisible, setSubmissionModalVisible] = useState(false);
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState<StudentTask | null>(null);
  // Estados para el modal de exámenes
  const [examModalVisible, setExamModalVisible] = useState(false);
  const [selectedExamForSubmission, setSelectedExamForSubmission] = useState<StudentExam | null>(null);

  // Estado para indicar si se está descargando un PDF
  const [downloadingTaskId, setDownloadingTaskId] = useState<string | null>(null);

  // Verificar que el usuario sea estudiante
  const isStudent = session?.userType === "student";

  // Consulta para obtener la lista de cursos
  const { data: coursesData } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => fetchCourses(session?.token || ''),
    enabled: !!session?.token && isStudent,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const courses = coursesData || [];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student-assignments', taskPage, examPage, searchFilters],
    queryFn: () => fetchStudentAssignments(session?.token || '', 5, taskPage, 5, examPage, searchFilters),
    enabled: !!session?.token && isStudent,
    staleTime: 0, // Los datos siempre se consideran obsoletos
    gcTime: 0, // No mantener cache
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Siempre refetch al montar
  });

  // Funciones para manejar la paginación
  const handleTaskPageChange = (newPage: number) => {
    setTaskPage(newPage);
  };

  const handleExamPageChange = (newPage: number) => {
    setExamPage(newPage);
  };

  // Función para aplicar filtros
  const applyFilters = () => {
    setSearchFilters(filters);
    setTaskPage(1);
    setExamPage(1);
  };
  // Función para limpiar filtros
  const clearFilters = () => {
    const resetFilters = {
      course_id: '',
      title: '',
      due_date: null,
      date: null,
      status: null,
    };
    setFilters(resetFilters);
    setSearchFilters(resetFilters);
    setTaskPage(1);
    setExamPage(1);
  };
  // Función para manejar la entrega de tarea
  const handleSubmitTask = (task: StudentTask) => {
    setSelectedTaskForSubmission(task);
    setSubmissionModalVisible(true);
  };
  // Función para manejar la realización de examen
  const handleSubmitExam = (exam: StudentExam) => {
    Alert.alert(
      "Iniciar Examen",
      "⚠️ Una vez que inicies el examen, no podrás cerrar la ventana hasta completarlo. ¿Estás seguro de que quieres comenzar?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Iniciar Examen",
          style: "default",
          onPress: () => {
            setSelectedExamForSubmission(exam);
            setExamModalVisible(true);
          }
        }
      ]
    );
  };

  // Función para manejar cuando se completa la entrega
  const handleSubmissionCompleted = async () => {
    setSubmissionModalVisible(false);
    setSelectedTaskForSubmission(null);
    // Invalidar y refrescar los datos para mostrar el estado actualizado
    await queryClient.invalidateQueries({ queryKey: ['student-assignments'] });
    refetch();
  };

  // Función para manejar cuando se completa la entrega del examen
  const handleExamSubmissionCompleted = async () => {
    setExamModalVisible(false);
    setSelectedExamForSubmission(null);
    // Invalidar y refrescar los datos para mostrar el estado actualizado    await queryClient.invalidateQueries({ queryKey: ['student-assignments'] });
    refetch();
  };

  // Función para generar PDF de tarea
  const handleDownloadTaskPDF = async (taskId: string, taskTitle: string) => {
    try {
      if (!session?.token) {
        Alert.alert('Error', 'No hay sesión activa');
        return;
      }

      // Establecer estado de carga
      setDownloadingTaskId(taskId);

      // Obtener detalles de la tarea
      const taskResponse = await courseClient.get(`/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      const taskDetail: TaskDetail = taskResponse.data;
      
      // Obtener información del propietario
      let ownerName = taskDetail.owner; // Fallback al ID si no se puede obtener el nombre
      try {
        const userProfile = await fetchUserProfile(session.token, taskDetail.owner);
        ownerName = userProfile.name || userProfile.email || taskDetail.owner;
      } catch (profileError) {
        console.warn('No se pudo obtener el perfil del propietario:', profileError);
        // Mantener el ID como fallback
      }
      // Procesar las preguntas de extra_conditions
      let questionsHtml = '';
      if (taskDetail.extra_conditions?.questions) {
        const questions = taskDetail.extra_conditions.questions.split('\n---\n').filter((q: string) => q.trim());
        if (questions.length > 0) {
          questionsHtml = `
            <div class="section">
              <h2 class="section-title">❓ Preguntas</h2>
              <div class="questions-container">
                ${questions.map((question: string, index: number) => `
                  <div class="question-item">
                    <div class="question-number">${index + 1}.</div>
                    <div class="question-text">${question.trim()}</div>
                    <div class="answer-space"></div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      }

      // Generar HTML para el PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${taskDetail.title}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 40px;
              line-height: 1.6;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2196f3;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              color: #2196f3;
              font-size: 28px;
              font-weight: bold;
              margin: 0;
            }
            .subtitle {
              color: #666;
              font-size: 14px;
              margin-top: 5px;
            }
            .section {
              margin-bottom: 25px;
              padding: 15px;
              background-color: #f9f9f9;
              border-left: 4px solid #2196f3;
              border-radius: 5px;
            }
            .section-title {
              color: #2196f3;
              font-size: 18px;
              font-weight: bold;
              margin: 0 0 10px 0;
            }
            .section-content {
              font-size: 14px;
              margin: 0;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 25px;
            }
            .info-item {
              background-color: #f5f5f5;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e0e0e0;
            }
            .info-label {
              font-weight: bold;
              color: #2196f3;
              margin-bottom: 5px;
              font-size: 14px;
            }
            .info-value {
              color: #333;
              font-size: 14px;
            }
            .questions-container {
              margin-top: 15px;
            }
            .question-item {
              margin-bottom: 25px;
              padding: 15px;
              background-color: white;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .question-number {
              font-weight: bold;
              color: #2196f3;
              font-size: 16px;
              margin-bottom: 8px;
            }
            .question-text {
              font-size: 14px;
              margin-bottom: 15px;
              color: #333;
            }
            .answer-space {
              height: 80px;
              border: 1px dashed #ccc;
              background-color: #fafafa;
              margin-top: 10px;
              position: relative;
            }
            .answer-space::after {
              content: "Espacio para respuesta";
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: #999;
              font-size: 12px;
              font-style: italic;
            }
            .status-pending { color: #ff9800; }
            .status-submitted { color: #2196f3; }
            .status-evaluated { color: #4caf50; }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${taskDetail.title}</h1>
            <p class="subtitle">Detalles de la Tarea</p>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Fecha de Vencimiento:</div>
              <div class="info-value">${format(new Date(taskDetail.due_date), 'dd MMMM yyyy', { locale: es })}</div>
            </div>            <div class="info-item">
              <div class="info-label">Propietario:</div>
              <div class="info-value">${ownerName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Tipo:</div>
              <div class="info-value">${taskDetail.extra_conditions?.type || 'No especificado'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Estado:</div>
              <div class="info-value">${taskDetail.published ? 'Publicada' : 'No publicada'}</div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">📋 Descripción</h2>
            <p class="section-content">${taskDetail.description || 'No hay descripción disponible.'}</p>
          </div>

          <div class="section">
            <h2 class="section-title">📝 Instrucciones</h2>
            <p class="section-content">${taskDetail.instructions || 'No hay instrucciones específicas.'}</p>
          </div>

          ${questionsHtml}

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Fecha de Creación:</div>
              <div class="info-value">${format(new Date(taskDetail.created_at), 'dd MMMM yyyy - HH:mm', { locale: es })}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Última Actualización:</div>
              <div class="info-value">${format(new Date(taskDetail.updated_at), 'dd MMMM yyyy - HH:mm', { locale: es })}</div>
            </div>
          </div>

          <div class="footer">
            <p>Documento generado el ${format(new Date(), 'dd MMMM yyyy - HH:mm', { locale: es })}</p>
            <p>ClassConnect - Sistema de Gestión Académica</p>
          </div>
        </body>
        </html>
      `;

      // Generar PDF usando expo-print
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      // Verificar si se puede compartir archivos
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        // Usar expo-sharing para abrir el archivo con otras aplicaciones
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${taskDetail.title} - Detalles de la Tarea`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        // Fallback para plataformas que no soportan sharing
        if (Platform.OS === 'android') {
          try {
            const contentUri = await FileSystem.getContentUriAsync(uri);
            await Linking.openURL(contentUri);
          } catch (linkError) {
            Alert.alert(
              'PDF Generado', 
              `El PDF se ha generado exitosamente.\nUbicación: ${uri}`
            );
          }
        } else {
          Alert.alert(
            'PDF Generado', 
            `El PDF se ha generado exitosamente para la tarea: ${taskDetail.title}`
          );
        }
      }
    } catch (error) {
      console.error('Error al generar PDF:', error);
      Alert.alert(
        'Error', 
        `No se pudo generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      // Limpiar estado de carga
      setDownloadingTaskId(null);
    }
  };

  // Función para renderizar los controles de paginación
  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (page: number) => void) => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <Button
          mode="outlined"
          disabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          style={styles.paginationButton}
          icon="chevron-left"
        >
          Anterior
        </Button>
        <Text style={styles.paginationText}>
          Página {currentPage} de {totalPages}
        </Text>
        <Button
          mode="outlined"
          disabled={currentPage >= totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          style={styles.paginationButton}
          icon="chevron-right"
          contentStyle={{ flexDirection: 'row-reverse' }}
        >
          Siguiente
        </Button>
      </View>
    );
  };

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  // Función para determinar el color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#ff9800';
      case 'Submitted':
        return '#2196f3';
      case 'Evaluated':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  // Función para obtener el texto del estado en español
  const getStatusText = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Pendiente';
      case 'Submitted':
        return 'Entregada';
      case 'Evaluated':
        return 'Evaluada';
      default:
        return status;
    }
  };

  // Función para determinar si la fecha ya pasó
  const isOverdue = (dateString: string) => {
    const date = new Date(dateString);
    return date < new Date();
  };

  // Renderizar tarjeta de tarea
  const renderTaskCard = ({ item }: { item: StudentTask }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.titleContainer}>
          <Title style={{ flex: 1 }}>{item.title}</Title>
          <Chip 
            mode="flat" 
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={{ color: 'white', fontSize: 12 }}
          >
            {getStatusText(item.status)}
          </Chip>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fecha límite:</Text>
            <Text style={[
              styles.infoValue, 
              isOverdue(item.due_date) && item.status === 'Pending' && { color: '#f44336' }
            ]}>
              {formatDate(item.due_date)}
              {isOverdue(item.due_date) && item.status === 'Pending' && ' (Vencida)'}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Estado:</Text>
            <Text style={[styles.infoValue, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <View style={styles.buttonContainer}>
            {/* Botón de descarga - disponible para todas las tareas publicadas */}
          {item.published && (
            <Button
              mode="outlined"
              onPress={() => handleDownloadTaskPDF(item.task_id, item.title)}
              style={styles.fullWidthButton}
              icon={downloadingTaskId === item.task_id ? "loading" : "download"}
              loading={downloadingTaskId === item.task_id}
              disabled={downloadingTaskId === item.task_id}
            >
              {downloadingTaskId === item.task_id ? "Generando..." : "Generar PDF"}
            </Button>
          )}
          
          {/* Botón de entrega - solo para tareas pendientes */}
          {item.status === 'Pending' && item.published && (
            <Button 
              mode="contained"
              onPress={() => handleSubmitTask(item)}
              style={styles.fullWidthButton}
              icon="upload"
            >
              Entregar Tarea
            </Button>
          )}
        </View>
      </Card.Actions>
    </Card>
  );

  // Renderizar tarjeta de examen
  const renderExamCard = ({ item }: { item: StudentExam }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.titleContainer}>
          <Title style={{ flex: 1 }}>{item.title}</Title>
          <Chip 
            mode="flat" 
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={{ color: 'white', fontSize: 12 }}
          >
            {getStatusText(item.status)}
          </Chip>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fecha del examen:</Text>
            <Text style={[
              styles.infoValue,
              isOverdue(item.date) && item.status === 'Pending' && { color: '#f44336' }
            ]}>
              {formatDate(item.date)}
              {isOverdue(item.date) && item.status === 'Pending' && ' (Finalizado)'}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Estado:</Text>
            <Text style={[styles.infoValue, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <View style={styles.buttonContainer}>
          {item.status === 'Pending' && item.published && (
            <Button 
              mode="contained"
              onPress={() => handleSubmitExam(item)}
              style={styles.fullWidthButton}
              icon="pencil"
            >
              Realizar Examen
            </Button>
          )}
        </View>
      </Card.Actions>
    </Card>
  );

  // Si no es estudiante, mostrar mensaje
  if (!isStudent) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="account-alert" size={64} color="#999" />
        <Text style={styles.errorText}>
          Esta sección está disponible solo para estudiantes
        </Text>
      </View>
    );
  }

  // Si está cargando, mostrar indicador
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando asignaciones...</Text>
      </View>
    );
  }

  // Si hay un error, mostrar mensaje de error
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#f44336" />
        <Text style={styles.errorText}>
          Error al cargar las asignaciones: {(error as Error).message}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Intentar nuevamente
        </Button>
      </View>
    );
  }

  const tasks = data?.response?.tasks?.items || [];
  const exams = data?.response?.exams?.items || [];

  return (
    <Provider>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Mis Tareas y Exámenes</Text>
          <MaterialCommunityIcons 
            name={activeTab === 'tasks' ? 'clipboard-list' : 'file-document'} 
            size={28} 
            color="#2196f3" 
          />
        </View>

        {/* Botones de navegación entre pestañas */}
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: 'tasks',
              label: `Tareas (${data?.response?.tasks?.totalItems || 0})`,
              icon: 'clipboard-list',
            },
            {
              value: 'exams',
              label: `Exámenes (${data?.response?.exams?.totalItems || 0})`,
              icon: 'file-document',
            },
          ]}
          style={styles.segmentedButtons}
        />

        {/* Control para mostrar/ocultar filtros */}
        <View style={styles.headerControls}>
          <TouchableOpacity onPress={() => setFiltersVisible(!filtersVisible)} style={{ marginBottom: 16 }}>
            <Text style={styles.filterToggleText}>
              {filtersVisible ? "Ocultar filtros ▲" : "Mostrar filtros ▼"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        {filtersVisible && (
          <>
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Seleccionar curso:</Text>
              <Picker
                selectedValue={filters.course_id}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, course_id: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Todos los cursos" value="" />
                {courses.map((course) => (
                  <Picker.Item 
                    key={course.course_id} 
                    label={course.course_name} 
                    value={course.course_id} 
                  />
                ))}
              </Picker>
            </View>

            <TextInput
              label="Buscar por título"
              value={filters.title}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, title: text }))}
              mode="outlined"
              style={styles.filterInput}
            />

            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Estado:</Text>
              <Picker
                selectedValue={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Todos los estados" value={null} />
                <Picker.Item label="Pendiente" value="Pending" />
                <Picker.Item label="Entregada" value="Submitted" />
                <Picker.Item label="Evaluada" value="Evaluated" />
              </Picker>
            </View>

            <View style={styles.dateFilterContainer}>
              <Button mode="outlined" onPress={() => setShowDueDatePicker(true)}>
                {filters.due_date ? `Fecha límite: ${format(filters.due_date, 'dd/MM/yyyy')}` : "Fecha límite"}
              </Button>
              <Button mode="outlined" onPress={() => setShowDatePicker(true)}>
                {filters.date ? `Fecha examen: ${format(filters.date, 'dd/MM/yyyy')}` : "Fecha examen"}
              </Button>
            </View>

            {showDueDatePicker && (
              <DateTimePicker
                value={filters.due_date || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDueDatePicker(false);
                  if (selectedDate) {
                    setFilters((prev) => ({ ...prev, due_date: selectedDate }));
                  }
                }}
              />
            )}

            {showDatePicker && (
              <DateTimePicker
                value={filters.date || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setFilters((prev) => ({ ...prev, date: selectedDate }));
                  }
                }}
              />
            )}

            <Button
              mode="contained"
              onPress={applyFilters}
              style={styles.filterButton}
            >
              Aplicar filtros
            </Button>

            <Button
              mode="outlined"
              onPress={clearFilters}
              style={styles.filterButton}
            >
              Limpiar filtros
            </Button>
          </>
        )}

        {/* Lista de tareas */}
        {activeTab === 'tasks' && (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.task_id}
            renderItem={renderTaskCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="clipboard-list" size={64} color="#999" />
                <Text style={styles.emptyText}>No hay tareas disponibles</Text>
              </View>
            }
            ListFooterComponent={
              tasks.length > 0 ? renderPagination(
                data?.response?.tasks?.currentPage || 1,
                data?.response?.tasks?.totalPages || 1,
                handleTaskPageChange
              ) : null
            }
          />
        )}

        {/* Lista de exámenes */}
        {activeTab === 'exams' && (
          <FlatList
            data={exams}
            keyExtractor={(item) => item.exam_id}
            renderItem={renderExamCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="file-document" size={64} color="#999" />
                <Text style={styles.emptyText}>No hay exámenes disponibles</Text>
              </View>
            }
            ListFooterComponent={
              exams.length > 0 ? renderPagination(
                data?.response?.exams?.currentPage || 1,
                data?.response?.exams?.totalPages || 1,
                handleExamPageChange
              ) : null
            }
            />
        )}
      </View>
      {/* Modal de entrega de tarea */}
      {selectedTaskForSubmission && (
        <TaskSubmissionModal
          visible={submissionModalVisible}
          onDismiss={() => {
            setSubmissionModalVisible(false);
            setSelectedTaskForSubmission(null);
          }}
          taskId={selectedTaskForSubmission.task_id}
          taskTitle={selectedTaskForSubmission.title}
          dueDate={selectedTaskForSubmission.due_date}
          onSubmissionSuccess={handleSubmissionCompleted}
        />
      )}

      {/* Modal de realización de examen */}
      {selectedExamForSubmission && (
        <ExamSubmissionModal
          visible={examModalVisible}
          onDismiss={() => {
            setExamModalVisible(false);
            setSelectedExamForSubmission(null);
          }}
          examId={selectedExamForSubmission.exam_id}
          examTitle={selectedExamForSubmission.title}
          onSubmissionSuccess={handleExamSubmissionCompleted}
        />
      )}
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 20,
    gap: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusChip: {
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: "row",
    marginTop: 10,
    flexWrap: "wrap",
  },
  infoItem: {
    marginRight: 20,
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    marginVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginVertical: 20,
    textAlign: "center",
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: 200,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
    marginTop: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  paginationButton: {
    marginHorizontal: 8,
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterToggleText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterInput: {
    marginBottom: 16,
  },
  dropdownContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#f5f5f5',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 8,
  },
  fullWidthButton: {
    width: '100%',
  },
});
