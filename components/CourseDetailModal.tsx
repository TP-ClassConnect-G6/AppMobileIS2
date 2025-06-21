import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, Paragraph, Chip, List } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { courseClient, forumClient } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import CourseExamsModal from "./CourseExamsModal";
import CourseTasksModal from "./CourseTasksModal";
import TeacherExamsModal from "./TeacherExamsModal";
import TeacherTasksModal from "./TeacherTasksModal";
import AuxiliarTeachersModal from "./AuxiliarTeachersModal";
import CourseForumModal from "./CourseForumModal";
import CourseModulesModal from "./CourseModulesModal";
import { useSession } from "@/contexts/session";
import jwtDecode from "jwt-decode";

// Tipos para la respuesta detallada del curso
type ScheduleItem = {
  day: string;
  time: string;
};

type RequiredCourse = {
  course_name: string;
};

type CourseDetail = {
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  max_quota?: number;
  category: string | null;
  objetives: string | string[];
  content: string | null;
  required_courses: string[] | { course_name: string }[];
  instructor_profile: string | null;
  modality: string | null;
  schedule: ScheduleItem[] | [];
  teacher?: string;
  course_status?: string;
};

type CourseDetailResponse = {
  courses?: CourseDetail;
  response?: CourseDetail;
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
};

type ForumResponse = {
  forums: Forum[];
};

// Función para obtener los detalles de un curso específico
const fetchCourseDetail = async (courseId: string): Promise<CourseDetail> => {
  try {
    const response = await courseClient.get(`/courses/${courseId}`);
    console.log("API response structure:", JSON.stringify(response.data, null, 2));
    
    // Manejar los diferentes formatos posibles de respuesta
    if (response.data?.courses) {
      console.log("Using response.data.courses format");
      return response.data.courses;
    } else if (response.data?.response) {
      console.log("Using response.data.response format");
      return response.data.response;
    } else if (response.data && typeof response.data === 'object' && response.data.course_name) {
      console.log("Using direct object format");
      return response.data;
    } else {
      console.warn('Formato de respuesta inesperado:', response.data);
      throw new Error('Formato de respuesta inesperado');
    }
  } catch (error) {
    console.error('Error al obtener detalles del curso:', error);
    throw error;
  }
};

// Props para el componente modal
type CourseDetailModalProps = {
  visible: boolean;
  onDismiss: () => void;
  courseId: string | null;
};

const CourseDetailModal = ({ visible, onDismiss, courseId }: CourseDetailModalProps) => {  
  // Estado para controlar la visibilidad del modal de exámenes
  const [examModalVisible, setExamModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);  
  const [teacherExamModalVisible, setTeacherExamModalVisible] = useState(false);  
  const [teacherTaskModalVisible, setTeacherTaskModalVisible] = useState(false);
  const [auxiliarTeachersModalVisible, setAuxiliarTeachersModalVisible] = useState(false);
  const [forumModalVisible, setForumModalVisible] = useState(false);
  const [modulesModalVisible, setModulesModalVisible] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isTeacherAssigned, setIsTeacherAssigned] = useState(false);
  const [isAuxiliar, setIsAuxiliar] = useState(false);
  const [canCreateExam, setCanCreateExam] = useState(false);
  const [canCreateTask, setCanCreateTask] = useState(false);
  const [canCommunicate, setCanCommunicate] = useState(false);
  const [isLoadingForum, setIsLoadingForum] = useState(false);
  const [forums, setForums] = useState<Forum[]>([]);
  
  // Obtener la sesión del usuario para verificar su rol
  const { session } = useSession();
  const isTeacher = session?.userType === "teacher" || session?.userType === "admin" || session?.userType === "administrator";
  // Estado para almacenar el email del usuario logueado
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Consulta para obtener los detalles del curso
  const { data: courseDetail, isLoading, error, refetch } = useQuery({
    queryKey: ['courseDetail', courseId],
    queryFn: () => courseId ? fetchCourseDetail(courseId) : Promise.reject('No courseId provided'),
    enabled: !!courseId && visible, // Solo consultar cuando hay un courseId y el modal está visible
    staleTime: 60000, // Datos frescos por 1 minuto
    retry: 1, // Intentar nuevamente 1 vez en caso de error
    retryDelay: 1000, // Esperar 1 segundo entre reintentos
  });
  // Función para obtener los foros del curso
  const fetchForums = async () => {
    if (!courseId || !session?.token) {
      return;
    }
    
    setIsLoadingForum(true);
    
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
        setForums(response.data.forums);
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
      setIsLoadingForum(false);
    }
  };

  // Extraer el email del token JWT
  useEffect(() => {
    if (session?.token) {
      try {
        const decodedToken: any = jwtDecode(session.token);
        // Obtenemos el email del token
        const email = decodedToken.email || decodedToken.sub || "";
        setUserEmail(email);
      } catch (error) {
        console.error("Error al decodificar el token:", error);
      }    
    }
  }, [session]);
  // Efecto para verificar si el profesor es el asignado cuando cambian los datos del curso
  useEffect(() => {
    if (isTeacher && courseDetail && userEmail) {
      checkTeacherAssignedStatus();
    }
  }, [courseDetail, userEmail, isTeacher]);
  // Fetch auxiliar teachers when the modal becomes visible
  useEffect(() => {
    if (visible && courseId && session?.token && userEmail) {
      fetchAuxiliarTeachers();
    }
  }, [visible, courseId, session?.token, userEmail]);

  // Función para obtener los docentes auxiliares del curso
  const fetchAuxiliarTeachers = async () => {
    if (!courseId || !session?.token || !userEmail) {
      return;
    }
    
    try {
      const response = await courseClient.get(`/courses/${courseId}/auxiliars`, {
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      });
      
      console.log("Auxiliar teachers response:", JSON.stringify(response.data, null, 2));
        // Check if the current user is an auxiliary teacher
      if (response.data?.response?.auxiliars) {
        const auxiliars = response.data.response.auxiliars;
        const currentUserAsAuxiliar = auxiliars.find((aux: { auxiliar: string; permissions: { permission: string }[] }) => aux.auxiliar === userEmail);
          if (currentUserAsAuxiliar) {
          setIsAuxiliar(true);
            // Check permissions
          const hasCreateExamPermission = currentUserAsAuxiliar.permissions.some(
            (perm: { permission: string }) => perm.permission === "create exam"
          );
          
          const hasCreateTaskPermission = currentUserAsAuxiliar.permissions.some(
            (perm: { permission: string }) => perm.permission === "create task"
          );
          
          const hasCommunicatePermission = currentUserAsAuxiliar.permissions.some(
            (perm: { permission: string }) => perm.permission === "comunicate"
          );
          
          setCanCreateExam(hasCreateExamPermission);
          setCanCreateTask(hasCreateTaskPermission);
          setCanCommunicate(hasCommunicatePermission);
          
          console.log(`User is auxiliar with permissions: createExam=${hasCreateExamPermission}, createTask=${hasCreateTaskPermission}, communicate=${hasCommunicatePermission}`);        } else {
          setIsAuxiliar(false);
          setCanCreateExam(false);
          setCanCreateTask(false);
          setCanCommunicate(false);
        }
      }
    } catch (error: any) {
      // Format and log the error in the required format
      const errorResponse = error.response?.data || {};
      const formattedError = {
        type: errorResponse.type || 'unknown',
        title: errorResponse.title || 'Error',
        status: errorResponse.status || error.response?.status || 500,
        detail: errorResponse.detail || error.message || 'Unknown error'
      };
      
      console.log("Error formatted:", JSON.stringify(formattedError, null, 2));
      // console.error("Error fetching auxiliar teachers:", error);
        // Reset permissions if there's an error
      setIsAuxiliar(false);
      setCanCreateExam(false);
      setCanCreateTask(false);
      setCanCommunicate(false);
    }
  };

  // Verificar si el estudiante está inscrito en el curso
  const checkEnrollmentStatus = async () => {
    if (!courseId || !session || isTeacher) {
      return;
    }
    
    try {
      const response = await courseClient.get('/courses', { 
        params: { user_login: session.userId } 
      });
      
      // Obtener la lista de cursos del usuario según el formato de respuesta
      let userCourses = [];
      if (response.data?.courses) {
        userCourses = response.data.courses;
      } else if (response.data?.response) {
        userCourses = response.data.response;
      } else if (Array.isArray(response.data)) {
        userCourses = response.data;
      }
      
      // Verificar si el curso actual está en la lista de cursos del usuario
      const isUserEnrolled = userCourses.some((course: any) => 
        course.course_id === courseId && 
        (course.message === "enrolled in course" || course.message === "Enrolled in course")
      );
      
      setIsEnrolled(isUserEnrolled);
      console.log(`Usuario inscrito en el curso ${courseId}: ${isUserEnrolled}`);
    } catch (error) {
      console.error('Error al verificar inscripción:', error);
    }
  };
  // Verificar si el profesor logueado es el mismo que está asignado al curso
  const checkTeacherAssignedStatus = () => {
    if (!courseDetail?.teacher || !userEmail) {
      setIsTeacherAssigned(false);
      return;
    }
      // Verificar si el email del usuario coincide con el teacher asignado al curso
    const isAssigned = courseDetail.teacher === userEmail;
    setIsTeacherAssigned(isAssigned);
    console.log(`Profesor asignado al curso ${courseId}: ${isAssigned}`);
    console.log(`Profesor del curso: "${courseDetail.teacher}"`);
    console.log(`Email del usuario: "${userEmail}"`);
  };

  // Verificar inscripción y profesor asignado cuando se carga el componente o cambia el courseId
  useEffect(() => {
    if (visible) {
      if (!isTeacher) {
        checkEnrollmentStatus();
      } else if (courseDetail) {
        checkTeacherAssignedStatus();
      }
    }
  }, [courseId, visible, userEmail, courseDetail]);

  // Formatear fecha
  const formatDateString = (dateString: string) => {
    try {
      // Si la fecha ya está en formato DD/MM/YY, la devolvemos tal cual
      if (dateString.includes('/')) {
        return dateString;
      }
      
      // Si no, asumimos que es ISO y la formateamos
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return format(date, 'dd/MM/yyyy', { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  // Función para formatear los objetivos, que pueden venir en varios formatos
  const formatObjectives = (objectives: string | string[]) => {
    // Si es un array, juntamos los elementos
    if (Array.isArray(objectives)) {
      return objectives.join(", ");
    }
    
    // Si parece ser un string en formato JSON
    if (typeof objectives === 'string' && (
      objectives.startsWith('{') || 
      objectives.startsWith('[') || 
      objectives.includes('{"')
    )) {
      try {
        // Intentar parsearlo como JSON
        const parsed = JSON.parse(objectives.replace(/'/g, '"'));
        if (Array.isArray(parsed)) {
          return parsed.join(", ");
        } else {
          return String(parsed);
        }
      } catch (e) {
        // Si hay error en el parse, mostrar el string original
        console.log("Error parsing objectives:", e);
      }
    }
    
    // Caso default: devolver el string tal cual
    return objectives;
  };

  // Función para formatear los cursos requeridos, que pueden venir como array de strings o array de objetos
  const formatRequiredCourses = (courses: string[] | { course_name: string }[]) => {
    if (!courses || courses.length === 0) return [];
    
    // Si es un array de strings
    if (typeof courses[0] === 'string') {
      return courses as string[];
    }
    
    // Si es un array de objetos
    return (courses as { course_name: string }[]).map(course => course.course_name);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Cargando detalles del curso...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Error al cargar los detalles del curso
              </Text>
              <Button mode="contained" onPress={() => refetch()}>
                Intentar nuevamente
              </Button>
            </View>
          ) : courseDetail ? (
            <>
              <Title style={styles.title}>{courseDetail.course_name}</Title>
              
              {courseDetail.category && (
                <Chip 
                  icon="tag" 
                  style={styles.categoryChip}
                >
                  {courseDetail.category}
                </Chip>
              )}
              
              <Divider style={styles.divider} />
              
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <Paragraph style={styles.description}>{courseDetail.description}</Paragraph>
              </View>
              
              <View style={styles.rowContainer}>
                {courseDetail.modality && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Modalidad:</Text>
                    <Text style={styles.infoValue}>{courseDetail.modality}</Text>
                  </View>
                )}
                
                {courseDetail.teacher && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Profesor:</Text>
                    <Text style={styles.infoValue}>{courseDetail.teacher}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.rowContainer}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Fecha inicio:</Text>
                  <Text style={styles.infoValue}>{formatDateString(courseDetail.date_init)}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Fecha fin:</Text>
                  <Text style={styles.infoValue}>{formatDateString(courseDetail.date_end)}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Cupo:</Text>
                <Text style={styles.infoValue}>
                  {courseDetail.quota} 
                  {courseDetail.max_quota ? ` de ${courseDetail.max_quota}` : ''} 
                  estudiantes
                </Text>
              </View>
              
              {/* {courseDetail.course_status && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Estado:</Text>
                  <Text style={styles.infoValue}>{courseDetail.course_status}</Text>
                </View>
              )} */}
              
              <Divider style={styles.divider} />
              
              {courseDetail.objetives && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Objetivos</Text>
                  <Paragraph style={styles.description}>{formatObjectives(courseDetail.objetives)}</Paragraph>
                </View>
              )}
              
              {courseDetail.content && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Contenido</Text>
                  <Paragraph style={styles.description}>{courseDetail.content}</Paragraph>
                </View>
              )}
              
              {courseDetail.instructor_profile && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Perfil del instructor</Text>
                  <Paragraph style={styles.description}>{courseDetail.instructor_profile}</Paragraph>
                </View>
              )}
              
              <Divider style={styles.divider} />
              
              {courseDetail.schedule && courseDetail.schedule.length > 0 && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Horario</Text>
                  {courseDetail.schedule.map((item: ScheduleItem, index: number) => (
                    <View key={index} style={styles.scheduleItem}>
                      <Text style={styles.scheduleDay}>{item.day}:</Text>
                      <Text style={styles.scheduleTime}>{item.time}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {courseDetail.required_courses && courseDetail.required_courses.length > 0 && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Cursos prerequisitos</Text>
                  {formatRequiredCourses(courseDetail.required_courses).map((courseName, index) => (
                    <Text key={index} style={styles.prerequisiteItem}>
                      • {courseName}
                    </Text>
                  ))}
                </View>
              )}
              {isTeacher ? (
                <>
                  {isTeacherAssigned || (isAuxiliar && (canCreateExam || canCreateTask || canCommunicate)) ? (
                    <>
                      {/* Mostrar botones de gestión de exámenes si es profesor asignado o auxiliar con permiso */}
                      {(isTeacherAssigned || (isAuxiliar && canCreateExam)) && (
                        <Button 
                          mode="contained" 
                          style={styles.examButton} 
                          onPress={() => setTeacherExamModalVisible(true)}
                          icon="book-open-variant"
                        >
                          Gestionar exámenes
                        </Button>
                      )}
                      
                      {/* Mostrar botones de gestión de tareas si es profesor asignado o auxiliar con permiso */}
                      {(isTeacherAssigned || (isAuxiliar && canCreateTask)) && (
                        <Button 
                          mode="contained" 
                          style={[styles.examButton, {backgroundColor: '#7B1FA2'}]} 
                          onPress={() => setTeacherTaskModalVisible(true)}
                          icon="clipboard-text"
                        >
                          Gestionar tareas
                        </Button>
                      )}

                      {/* Mostrar botón del foro si es profesor asignado o auxiliar con permiso de comunicar */}
                      {(isTeacherAssigned || (isAuxiliar && canCommunicate)) && (
                        <Button 
                          mode="contained" 
                          style={[styles.examButton, {backgroundColor: '#1565C0'}]} 
                          onPress={() => {
                            fetchForums();
                            setForumModalVisible(true);
                          }}
                          icon="forum"
                          loading={isLoadingForum}
                        >
                          Ir a Foro
                        </Button>
                      )}
                        {/* Botón para gestionar docentes auxiliares, solo para profesor asignado */}
                      {isTeacherAssigned && (
                        <Button 
                          mode="contained" 
                          style={[styles.examButton, {backgroundColor: '#FF9800'}]} 
                          onPress={() => setAuxiliarTeachersModalVisible(true)}
                          icon="account-plus"
                        >
                          Gestionar Docente Auxiliar
                        </Button>
                      )}

                      {/* Botón para organización de módulos y recursos, solo para profesor asignado */}
                      {isTeacherAssigned && (
                        <Button 
                          mode="contained" 
                          style={[styles.examButton, {backgroundColor: '#FF6B35'}]} 
                          onPress={() => setModulesModalVisible(true)}
                          icon="book-open-page-variant"
                        >
                          Organización de Módulos y Recursos
                        </Button>
                      )}
                    </>
                  ) : null }
                  <Button 
                    mode="outlined" 
                    style={[styles.examButton, {backgroundColor: '#E8F5E9'}]} 
                    onPress={() => setExamModalVisible(true)}
                    icon="eye-outline"
                  >
                    Ver exámenes como estudiante
                  </Button>                  
                  <Button 
                    mode="outlined" 
                    style={[styles.examButton, {backgroundColor: '#F3E5F5'}]} 
                    onPress={() => setTaskModalVisible(true)}
                    icon="eye-outline"
                  >
                    Ver tareas como estudiantes
                  </Button>
                </>
              ) : isEnrolled ? (
                <>
                  <Button 
                    mode="contained" 
                    style={styles.examButton} 
                    onPress={() => setExamModalVisible(true)}
                    icon="book-open-variant"
                  >
                    Ver exámenes
                  </Button>
                  <Button 
                    mode="contained" 
                    style={[styles.examButton, {backgroundColor: '#7B1FA2'}]} 
                    onPress={() => setTaskModalVisible(true)}
                    icon="clipboard-text"
                  >
                    Ver tareas
                  </Button>
                  {/* Botón para ir al foro del curso vista estudiante*/}
                  <Button 
                    mode="contained" 
                    style={[styles.examButton, {backgroundColor: '#1565C0'}]} 
                    onPress={() => {
                      fetchForums();
                      setForumModalVisible(true);
                    }}
                    icon="forum"
                    loading={isLoadingForum}
                  >
                    Ir a Foro
                  </Button>
                  <Button 
                    mode="contained" 
                    style={[styles.examButton, {backgroundColor: '#FF6B35'}]} 
                    onPress={() => setModulesModalVisible(true)}
                    icon="book-open-page-variant"
                  >
                    Ver Módulos y Recursos
                  </Button>
                </>
              ) : (
                <Text style={styles.notEnrolledText}>
                  Debes estar inscrito en el curso para ver exámenes y tareas
                </Text>
              )}              
              <Button 
                mode="outlined" 
                style={styles.closeButton} 
                onPress={onDismiss}
              >
                Cerrar
              </Button>
            </>
          ) : (
            <Text>No se encontraron detalles del curso</Text>
          )}
        </ScrollView>
      </Modal>
      
      <CourseExamsModal
        visible={examModalVisible}
        onDismiss={() => setExamModalVisible(false)}
        courseId={courseId}
        courseName={courseDetail?.course_name || null}
      />
      <TeacherExamsModal
        visible={teacherExamModalVisible}
        onDismiss={() => setTeacherExamModalVisible(false)}
        courseId={courseId}
        courseName={courseDetail?.course_name || null}
      />
      <TeacherTasksModal
        visible={teacherTaskModalVisible}
        onDismiss={() => setTeacherTaskModalVisible(false)}
        courseId={courseId}
        courseName={courseDetail?.course_name || null}
      />      
      <CourseTasksModal
        visible={taskModalVisible}
        onDismiss={() => setTaskModalVisible(false)}
        courseId={courseId}
        courseName={courseDetail?.course_name || null}
      />
      <AuxiliarTeachersModal
        visible={auxiliarTeachersModalVisible}
        onDismiss={() => setAuxiliarTeachersModalVisible(false)}
        courseId={courseId}
        courseName={courseDetail?.course_name || null}
      />
      <CourseForumModal
        visible={forumModalVisible}
        onDismiss={() => setForumModalVisible(false)}
        courseId={courseId}
        courseName={courseDetail?.course_name || null}
      />
      <CourseModulesModal
        visible={modulesModalVisible}
        onDismiss={() => setModulesModalVisible(false)}
        courseId={courseId}
        courseName={courseDetail?.course_name || null}
      />
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  divider: {
    marginVertical: 15,
  },
  sectionContainer: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  rowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoItem: {
    marginBottom: 10,
    marginRight: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  scheduleItem: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'center',
  },
  scheduleDay: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
    width: 80,
  },
  scheduleTime: {
    fontSize: 16,
  },  prerequisiteItem: {
    fontSize: 16,
    marginBottom: 5,
  },  
  examButton: {
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#2E7D32',
  },
  inscriptionButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  closeButton: {
    marginBottom: 10,
  },
  notEnrolledText: {
    textAlign: 'center',
    color: '#D32F2F',
    fontWeight: '500',
    fontSize: 16,
    marginTop: 15,
    marginBottom: 10,
    fontStyle: 'italic',
  },
});

export default CourseDetailModal;