import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, ActivityIndicator, Chip, Card, TextInput } from "react-native-paper";
import { useForm, Controller } from 'react-hook-form';
import { client, courseClient, chatClient } from "@/lib/http";
import { processMarkdownToPlainText } from "@/lib/chat";
import { useSession } from "@/contexts/session";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Tipos para la respuesta de detalles de examen (similar a tarea)
type ExamSubmission = {
  id: string;
  exam_id: string;
  student_id: string;
  answers: string;
  submitted_at: string;
  is_late: boolean;
  file_urls: string[];
  is_active: boolean;
  score?: number;
  feedback?: string;
};

// Tipo para el formulario de calificación y feedback
type GradingFormData = {
  [submissionId: string]: string;
};

type FeedbackFormData = {
  [submissionId: string]: string;
};

// Tipo para información del estudiante
type StudentInfo = {
  user_id: string;
  user_type: string;
  name: string;
  bio: string;
};

type ExamDetail = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  date: string;
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

type ExamDetailResponse = {
  examWithSubmission: {
    exam: ExamDetail;
    submissions: ExamSubmission[];
    pagination: {
      page: number;
      limit: number;
    };
  };
};

type TeacherExamDetailModalProps = {
  visible: boolean;
  onDismiss: () => void;
  examId: string;
  onExamDeleted?: () => void; // Callback para actualizar la lista cuando se elimine
};

const TeacherExamDetailModal = ({ visible, onDismiss, examId, onExamDeleted }: TeacherExamDetailModalProps) => {
  const { session } = useSession();
  const [examData, setExamData] = useState<ExamDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentsInfo, setStudentsInfo] = useState<{ [key: string]: StudentInfo }>({});
  const [gradingLoading, setGradingLoading] = useState<{ [key: string]: boolean }>({});
  const [feedbackLoading, setFeedbackLoading] = useState<{ [key: string]: boolean }>({});
  const [aiLoading, setAiLoading] = useState<{ [key: string]: boolean }>({});
  
  const { control, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<GradingFormData>();
  const { 
    control: feedbackControl, 
    formState: { errors: feedbackErrors }, 
    setValue: setFeedbackValue, 
    watch: watchFeedback, 
    reset: resetFeedback 
  } = useForm<FeedbackFormData>();

  // Fetch exam details when modal opens
  useEffect(() => {
    if (visible && examId) {
      fetchExamDetails();
    }
  }, [visible, examId]);

  // Función para obtener información del estudiante
  const fetchStudentInfo = async (studentId: string): Promise<StudentInfo | null> => {
    if (!session?.token) return null;
    
    try {
      const response = await client.get(`profile/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching student info for ${studentId}:`, error);
      return null;
    }
  };

  // Función para obtener información de múltiples estudiantes
  const fetchStudentsInfo = async (studentIds: string[]) => {
    const studentsData: { [key: string]: StudentInfo } = {};
    
    await Promise.all(
      studentIds.map(async (studentId) => {
        const studentInfo = await fetchStudentInfo(studentId);
        if (studentInfo) {
          studentsData[studentId] = studentInfo;
        }
      })
    );
    
    setStudentsInfo(studentsData);
  };

  // Función para obtener los detalles del examen
  const fetchExamDetails = async () => {
    if (!examId || !session?.token) return;

    try {
      setLoading(true);
      // Asumo que el endpoint para exámenes es similar al de tareas
      const response = await courseClient.get(`/exams/${examId}/gateway`, {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      setExamData(response.data);
      
      // Obtener información de los estudiantes
      const submissions = response.data?.examWithSubmission?.submissions || [];
      const studentIds = submissions.map((submission: ExamSubmission) => submission.student_id);
      if (studentIds.length > 0) {
        await fetchStudentsInfo(studentIds);
      }

      // Inicializar scores y feedback existentes
      const existingScores: GradingFormData = {};
      const existingFeedback: FeedbackFormData = {};
      if (submissions && submissions.length > 0) {
        submissions.forEach((submission: ExamSubmission) => {
          if (submission.score !== undefined) {
            existingScores[submission.id] = submission.score.toString();
          }
          if (submission.feedback) {
            existingFeedback[submission.id] = submission.feedback;
          }
        });
      }
      reset(existingScores);
      resetFeedback(existingFeedback);
    } catch (error) {
      console.error("Error fetching exam details:", error);
      Alert.alert("Error", "No se pudieron cargar los detalles del examen");
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar el examen
  const handleDeleteExam = async () => {
    if (!examData?.examWithSubmission?.exam) return;

    const examTitle = examData.examWithSubmission.exam.title;

    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro de que deseas eliminar el examen "${examTitle}"?`,
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
              await courseClient.delete(`/exams/${examId}`, {
                headers: {
                  'Authorization': `Bearer ${session?.token}`
                }
              });
              Alert.alert("Éxito", "Examen eliminado correctamente");
              onDismiss();
              if (onExamDeleted) {
                onExamDeleted(); // Callback para actualizar la lista
              }
            } catch (error) {
              console.error("Error al eliminar examen:", error);
              Alert.alert("Error", "No se pudo eliminar el examen");
            }
          }
        }
      ]
    );
  };

  // Función para calificar una entrega de examen
  const handleGradeSubmission = async (submissionId: string) => {
    const currentValues = watch();
    const score = currentValues[submissionId];
    
    if (!score || !session?.token) {
      Alert.alert("Error", "Por favor ingresa una calificación válida");
      return;
    }

    const numericScore = parseInt(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      Alert.alert("Error", "La calificación debe ser un número entre 0 y 100");
      return;
    }

    try {
      setGradingLoading(prev => ({ ...prev, [submissionId]: true }));
      
      const response = await courseClient.post(
        `/submissions/${submissionId}/score`,
        { score: numericScore },
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Actualizar el examen con la nueva calificación
      if (examData?.examWithSubmission?.submissions) {
        const updatedSubmissions = examData.examWithSubmission.submissions.map(submission => 
          submission.id === submissionId 
            ? { ...submission, score: numericScore }
            : submission
        );
        
        setExamData(prev => prev ? {
          ...prev,
          examWithSubmission: {
            ...prev.examWithSubmission,
            submissions: updatedSubmissions
          }
        } : null);
      }

      // Limpiar el input de calificación
      setValue(submissionId, '');
      
      Alert.alert("Éxito", "Calificación guardada correctamente");
    } catch (error) {
      console.error("Error grading submission:", error);
      Alert.alert("Error", "No se pudo guardar la calificación");
    } finally {
      setGradingLoading(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  // Función para enviar feedback
  const handleSendFeedback = async (submissionId: string) => {
    const currentFeedback = watchFeedback();
    const feedback = currentFeedback[submissionId];
    
    if (!feedback?.trim() || !session?.token) {
      Alert.alert("Error", "Por favor ingresa un feedback válido");
      return;
    }

    try {
      setFeedbackLoading(prev => ({ ...prev, [submissionId]: true }));
      
      const response = await courseClient.post(
        `/submissions/${submissionId}/feedback`,
        { feedback: feedback.trim() },
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Actualizar el examen con el nuevo feedback
      if (examData?.examWithSubmission?.submissions) {
        const updatedSubmissions = examData.examWithSubmission.submissions.map(submission => 
          submission.id === submissionId 
            ? { ...submission, feedback: feedback.trim() }
            : submission
        );
        
        setExamData(prev => prev ? {
          ...prev,
          examWithSubmission: {
            ...prev.examWithSubmission,
            submissions: updatedSubmissions
          }
        } : null);
      }
      
      Alert.alert("Éxito", "Feedback guardado correctamente");
    } catch (error) {
      console.error("Error sending feedback:", error);
      Alert.alert("Error", "No se pudo guardar el feedback");
    } finally {
      setFeedbackLoading(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  // Función para generar feedback con IA
  const handleGenerateAIFeedback = async (submissionId: string) => {
    const currentFeedback = watchFeedback();
    const currentText = currentFeedback[submissionId] || '';
    
    if (!currentText.trim()) {
      Alert.alert("Error", "Por favor escribe un texto base para que la IA pueda mejorarlo");
      return;
    }

    if (!session?.token) {
      Alert.alert("Error", "No hay sesión activa");
      return;
    }

    try {
      setAiLoading(prev => ({ ...prev, [submissionId]: true }));
      
      const response = await chatClient.post(
        '/custom_inference',
        {
          system_message: "Destacar aspectos positivos y negativos conciso.",
          user_message: currentText.trim()
        },
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data?.ia_response) {
        // Convertir markdown a texto plano y actualizar el valor del feedback
        const plainTextResponse = processMarkdownToPlainText(response.data.ia_response);
        setFeedbackValue(submissionId, plainTextResponse);
      } else {
        Alert.alert("Error", "No se pudo generar el feedback con IA");
      }
    } catch (error) {
      console.error("Error generating AI feedback:", error);
      Alert.alert("Error", "No se pudo generar el feedback con IA");
    } finally {
      setAiLoading(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy HH:mm', { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  // Función para parsear preguntas
  const parseQuestions = (questionsText: string): string[] => {
    if (!questionsText) return [];
    return questionsText.split(/\s*\n---\n\s*/).filter(q => q.trim());
  };

  // Función para parsear respuestas
  const parseAnswers = (answersText: string): Array<{ question: string; answer: string }> => {
    if (!answersText) return [];
    
    const sections = answersText.split(/\n---\n/);
    const parsedAnswers: Array<{ question: string; answer: string }> = [];
    
    sections.forEach(section => {
      const lines = section.trim().split('\n');
      let question = '';
      let answer = '';
      let foundAnswer = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('PREGUNTA')) {
          question = line.replace(/^PREGUNTA \d+:\s*/, '');
        } else if (line.startsWith('RESPUESTA')) {
          answer = line.replace(/^RESPUESTA \d+:\s*/, '');
          foundAnswer = true;
        } else if (foundAnswer && line) {
          answer += ' ' + line;
        }
      }
      
      if (question && answer) {
        parsedAnswers.push({ question, answer });
      }
    });
    
    return parsedAnswers;
  };

  // Función para determinar si el examen está vencido
  const isOverdue = (dateString: string) => {
    const date = new Date(dateString);
    return date < new Date();
  };

  if (!examData || !examData.examWithSubmission || !examData.examWithSubmission.exam) {
    return (
      <Portal>
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Cargando detalles del examen...</Text>
            </View>
          ) : null}
        </Modal>
      </Portal>
    );
  }

  const { exam, submissions } = examData.examWithSubmission || { exam: null, submissions: [] };
  const questions = exam?.extra_conditions?.questions ? parseQuestions(exam.extra_conditions.questions) : [];

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <ScrollView style={styles.scrollContainer}>
          {/* Header del examen */}
          <View style={styles.header}>
            <Title style={styles.title}>{exam.title}</Title>
            <View style={styles.statusContainer}>
              <Chip 
                mode="flat" 
                style={[styles.statusChip, { backgroundColor: exam.published ? '#4caf50' : '#ff9800' }]}
                textStyle={{ color: 'white', fontSize: 12 }}
              >
                {exam.published ? 'Publicado' : 'Borrador'}
              </Chip>
              <Chip 
                mode="flat" 
                style={[styles.statusChip, { backgroundColor: exam.is_active ? '#4caf50' : '#f44336' }]}
                textStyle={{ color: 'white', fontSize: 12 }}
              >
                {exam.is_active ? 'Activo' : 'Inactivo'}
              </Chip>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Información del examen */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información General</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Descripción:</Text>
              <Text style={styles.infoValue}>{exam.description}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Instrucciones:</Text>
              <Text style={styles.infoValue}>{exam.instructions}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha del examen:</Text>
              <Text style={[
                styles.infoValue,
                isOverdue(exam.date) && { color: '#f44336' }
              ]}>
                {formatDate(exam.date)}
                {isOverdue(exam.date) && ' (Finalizado)'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo:</Text>
              <Text style={styles.infoValue}>{exam.extra_conditions?.type || 'No especificado'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Creado:</Text>
              <Text style={styles.infoValue}>{formatDate(exam.created_at)}</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Preguntas del examen */}
          {questions.length > 0 && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preguntas</Text>
                {questions.map((question, index) => (
                  <View key={index} style={styles.questionContainer}>
                    <Text style={styles.questionNumber}>Pregunta {index + 1}:</Text>
                    <Text style={styles.questionText}>{question}</Text>
                  </View>
                ))}
              </View>
              <Divider style={styles.divider} />
            </>
          )}

          {/* Entregas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Entregas ({submissions?.length || 0})
            </Text>
            
            {!submissions || submissions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="file-document-outline" size={48} color="#999" />
                <Text style={styles.emptyText}>No hay entregas aún</Text>
              </View>
            ) : (
              submissions.map((submission, index) => {
                const parsedAnswers = parseAnswers(submission.answers);
                
                return (
                  <Card key={submission.id} style={styles.submissionCard}>
                    <Card.Content>
                      <View style={styles.submissionHeader}>
                        <View>
                          <Text style={styles.submissionTitle}>
                            {studentsInfo[submission.student_id]?.name || `Estudiante #${index + 1}`}
                          </Text>
                        </View>
                        <View style={styles.submissionStatus}>
                          {submission.is_late && (
                            <Chip mode="flat" style={styles.lateChip} textStyle={{ color: 'white', fontSize: 10 }}>
                              Tardía
                            </Chip>
                          )}
                        </View>
                      </View>
                      
                      <Text style={styles.submissionDate}>
                        Entregada: {formatDate(submission.submitted_at)}
                      </Text>

                      {/* Respuestas estructuradas */}
                      {parsedAnswers.length > 0 ? (
                        <View style={styles.answersContainer}>
                          <Text style={styles.answersTitle}>Respuestas:</Text>
                          {parsedAnswers.map((item, answerIndex) => (
                            <View key={answerIndex} style={styles.answerItem}>
                              <Text style={styles.answerQuestion}>P{answerIndex + 1}: {item.question}</Text>
                              <Text style={styles.answerText}>R: {item.answer}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.answersContainer}>
                          <Text style={styles.answersTitle}>Respuesta:</Text>
                          <Text style={styles.answerText}>{submission.answers}</Text>
                        </View>
                      )}

                      {/* Archivos adjuntos */}
                      {submission.file_urls && submission.file_urls.length > 0 && (
                        <View style={styles.filesContainer}>
                          <Text style={styles.filesTitle}>Archivos adjuntos:</Text>
                          {submission.file_urls.map((url, fileIndex) => (
                            <Text key={fileIndex} style={styles.fileUrl}>{url}</Text>
                          ))}
                        </View>
                      )}

                      {/* Sección de calificación */}
                      <View style={styles.gradingContainer}>
                        <View style={styles.gradingHeader}>
                          <Text style={styles.gradingTitle}>Calificación</Text>
                          {submission.score !== undefined && (
                            <Chip 
                              mode="flat" 
                              style={[styles.scoreChip, { backgroundColor: submission.score >= 60 ? '#4caf50' : '#f44336' }]}
                              textStyle={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}
                            >
                              {submission.score}/100
                            </Chip>
                          )}
                        </View>
                        
                        <View style={styles.gradingInputContainer}>
                          <Controller
                            control={control}
                            name={submission.id}
                            defaultValue={submission.score?.toString() || ''}
                            rules={{
                              required: 'La puntuación es requerida',
                              pattern: {
                                value: /^([0-9]|[1-9][0-9]|100)$/,
                                message: 'Debe ser un número entre 0 y 100'
                              },
                              min: {
                                value: 0,
                                message: 'La puntuación mínima es 0'
                              },
                              max: {
                                value: 100,
                                message: 'La puntuación máxima es 100'
                              }
                            }}
                            render={({ field: { onChange, onBlur, value } }) => (
                              <TextInput
                                style={styles.scoreInput}
                                mode="outlined"
                                label="Puntuación (0-100)"
                                onBlur={onBlur}
                                onChangeText={(text) => {
                                  // Solo permitir números de 0-100
                                  const numericValue = text.replace(/[^0-9]/g, '');
                                  const numberValue = parseInt(numericValue);
                                  
                                  if (numericValue === '' || (numberValue >= 0 && numberValue <= 100)) {
                                    onChange(numericValue);
                                  }
                                }}
                                value={value}
                                keyboardType="numeric"
                                maxLength={3}
                                disabled={gradingLoading[submission.id]}
                                error={!!errors[submission.id]}
                              />
                            )}
                          />
                          <Button
                            mode="contained"
                            onPress={() => handleGradeSubmission(submission.id)}
                            style={styles.gradeButton}
                            loading={gradingLoading[submission.id]}
                            disabled={gradingLoading[submission.id] || !!errors[submission.id]}
                            icon="check"
                          >
                            {submission.score !== undefined ? 'Actualizar' : 'Calificar'}
                          </Button>
                        </View>
                        
                        {/* Error message */}
                        {errors[submission.id] && (
                          <Text style={styles.errorText}>
                            {errors[submission.id]?.message}
                          </Text>
                        )}

                        {/* Sección de feedback */}
                        <View style={styles.feedbackSection}>
                          <Text style={styles.feedbackTitle}>Feedback para el estudiante</Text>
                          
                          {/* Mostrar feedback existente si existe */}
                          {submission.feedback && (
                            <View style={styles.existingFeedback}>
                              <Text style={styles.existingFeedbackLabel}>Feedback actual:</Text>
                              <Text style={styles.existingFeedbackText}>{submission.feedback}</Text>
                            </View>
                          )}

                          <Controller
                            control={feedbackControl}
                            name={submission.id}
                            defaultValue={submission.feedback || ''}
                            rules={{
                              minLength: {
                                value: 10,
                                message: 'El feedback debe tener al menos 10 caracteres'
                              },
                              maxLength: {
                                value: 500,
                                message: 'El feedback no puede exceder 500 caracteres'
                              }
                            }}
                            render={({ field: { onChange, onBlur, value } }) => (
                              <TextInput
                                style={styles.feedbackInput}
                                mode="outlined"
                                label="Escribe tu feedback..."
                                placeholder="Proporciona comentarios constructivos sobre la entrega del estudiante"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                multiline
                                numberOfLines={8}
                                disabled={feedbackLoading[submission.id]}
                                error={!!feedbackErrors[submission.id]}
                              />
                            )}
                          />

                          {/* Error message para feedback */}
                          {feedbackErrors[submission.id] && (
                            <Text style={styles.errorText}>
                              {feedbackErrors[submission.id]?.message}
                            </Text>
                          )}

                          {/* Botones de feedback */}
                          <View style={styles.feedbackButtonsContainer}>
                            <Button
                              mode="contained"
                              onPress={() => handleGenerateAIFeedback(submission.id)}
                              style={[styles.feedbackButton, styles.aiButton]}
                              buttonColor="#9c27b0"
                              textColor="white"
                              loading={aiLoading[submission.id]}
                              disabled={aiLoading[submission.id] || feedbackLoading[submission.id]}
                              icon="robot"
                              compact
                            >
                              Completar con IA
                            </Button>

                            <Button
                              mode="contained"
                              onPress={() => handleSendFeedback(submission.id)}
                              style={[styles.feedbackButton, styles.sendButton]}
                              buttonColor="#2196f3"
                              textColor="white"
                              loading={feedbackLoading[submission.id]}
                              disabled={feedbackLoading[submission.id] || !!feedbackErrors[submission.id] || aiLoading[submission.id]}
                              icon="comment-text"
                              compact
                            >
                              {submission.feedback ? 'Actualizar' : 'Enviar'}
                            </Button>
                          </View>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Botones de acción */}
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={handleDeleteExam} 
            style={styles.deleteButton}
            icon="delete"
            buttonColor="#f44336"
            textColor="white"
          >
            Eliminar Examen
          </Button>
          <Button mode="contained" onPress={onDismiss} style={styles.closeButton}>
            Cerrar
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: "white",
    margin: 20,
    maxHeight: "90%",
    borderRadius: 8,
  },
  scrollContainer: {
    maxHeight: "85%",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    textAlign: "center",
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: "row",
    gap: 8,
  },
  statusChip: {
    marginVertical: 2,
  },
  divider: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2196f3",
  },
  infoRow: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    marginTop: 2,
  },
  questionContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2196f3",
    marginBottom: 4,
  },
  questionText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  submissionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  submissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  studentId: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  submissionStatus: {
    flexDirection: "row",
  },
  lateChip: {
    backgroundColor: "#f44336",
  },
  submissionDate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  answersContainer: {
    marginTop: 8,
  },
  answersTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#2196f3",
  },
  answerItem: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
  },
  answerQuestion: {
    fontSize: 13,
    fontWeight: "500",
    color: "#495057",
    marginBottom: 4,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  filesContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 6,
  },
  filesTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#1976d2",
  },
  fileUrl: {
    fontSize: 12,
    color: "#1976d2",
    textDecorationLine: "underline",
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    gap: 10,
  },
  closeButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#f44336',
  },
  gradingContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  gradingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  scoreChip: {
    marginLeft: 8,
  },
  gradingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreInput: {
    flex: 1,
    height: 45,
  },
  gradeButton: {
    minWidth: 100,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  feedbackSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  existingFeedback: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#e8f5e8',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  existingFeedbackLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  existingFeedbackText: {
    fontSize: 13,
    color: '#2e7d32',
    lineHeight: 18,
  },
  feedbackInput: {
    marginBottom: 8,
    minHeight: 160,
  },
  feedbackButtonsContainer: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
  },
  feedbackButton: {
    width: '100%',
  },
  aiButton: {
    // Removed custom styling since we use buttonColor prop
  },
  sendButton: {
    // Removed custom styling since we use buttonColor prop
  },
});

export default TeacherExamDetailModal;
