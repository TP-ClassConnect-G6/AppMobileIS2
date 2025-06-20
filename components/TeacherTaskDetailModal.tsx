import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, ActivityIndicator, List, Chip, Card } from "react-native-paper";
import { courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Tipos para la respuesta de detalles de tarea
type TaskSubmission = {
  id: string;
  task_id: string;
  student_id: string;
  answers: string;
  submitted_at: string;
  is_late: boolean;
  file_urls: string[];
  is_active: boolean;
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

type TaskDetailResponse = {
  taskWithSubmission: {
    task: TaskDetail;
    submissions: TaskSubmission[];
    pagination: {
      page: number;
      limit: number;
    };
  };
};

type TeacherTaskDetailModalProps = {
  visible: boolean;
  onDismiss: () => void;
  taskId: string;
};

const TeacherTaskDetailModal = ({ visible, onDismiss, taskId }: TeacherTaskDetailModalProps) => {
  const { session } = useSession();
  const [taskData, setTaskData] = useState<TaskDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch task details when modal opens
  useEffect(() => {
    if (visible && taskId) {
      fetchTaskDetails();
    }
  }, [visible, taskId]);

  // Función para obtener los detalles de la tarea
  const fetchTaskDetails = async () => {
    if (!taskId || !session?.token) return;

    try {
      setLoading(true);
      const response = await courseClient.get(`/tasks/${taskId}/gateway`, {
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });
      setTaskData(response.data);
    } catch (error) {
      console.error("Error fetching task details:", error);
      Alert.alert("Error", "No se pudieron cargar los detalles de la tarea");
    } finally {
      setLoading(false);
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

  // Función para determinar si la entrega está atrasada
  const isOverdue = (dateString: string) => {
    const date = new Date(dateString);
    return date < new Date();
  };

  if (!taskData) {
    return (
      <Portal>
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Cargando detalles de la tarea...</Text>
            </View>
          ) : null}
        </Modal>
      </Portal>
    );
  }

  const { task, submissions } = taskData.taskWithSubmission;
  const questions = task.extra_conditions?.questions ? parseQuestions(task.extra_conditions.questions) : [];

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <ScrollView style={styles.scrollContainer}>
          {/* Header de la tarea */}
          <View style={styles.header}>
            <Title style={styles.title}>{task.title}</Title>
            <View style={styles.statusContainer}>
              <Chip 
                mode="flat" 
                style={[styles.statusChip, { backgroundColor: task.published ? '#4caf50' : '#ff9800' }]}
                textStyle={{ color: 'white', fontSize: 12 }}
              >
                {task.published ? 'Publicada' : 'Borrador'}
              </Chip>
              <Chip 
                mode="flat" 
                style={[styles.statusChip, { backgroundColor: task.is_active ? '#4caf50' : '#f44336' }]}
                textStyle={{ color: 'white', fontSize: 12 }}
              >
                {task.is_active ? 'Activa' : 'Inactiva'}
              </Chip>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Información de la tarea */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información General</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Descripción:</Text>
              <Text style={styles.infoValue}>{task.description}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Instrucciones:</Text>
              <Text style={styles.infoValue}>{task.instructions}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha límite:</Text>
              <Text style={[
                styles.infoValue,
                isOverdue(task.due_date) && { color: '#f44336' }
              ]}>
                {formatDate(task.due_date)}
                {isOverdue(task.due_date) && ' (Vencida)'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo:</Text>
              <Text style={styles.infoValue}>{task.extra_conditions?.type || 'No especificado'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Creada:</Text>
              <Text style={styles.infoValue}>{formatDate(task.created_at)}</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Preguntas de la tarea */}
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
              Entregas ({submissions.length})
            </Text>
            
            {submissions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="clipboard-outline" size={48} color="#999" />
                <Text style={styles.emptyText}>No hay entregas aún</Text>
              </View>
            ) : (
              submissions.map((submission, index) => {
                const parsedAnswers = parseAnswers(submission.answers);
                
                return (
                  <Card key={submission.id} style={styles.submissionCard}>
                    <Card.Content>
                      <View style={styles.submissionHeader}>
                        <Text style={styles.submissionTitle}>Entrega #{index + 1}</Text>
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
                      {submission.file_urls.length > 0 && (
                        <View style={styles.filesContainer}>
                          <Text style={styles.filesTitle}>Archivos adjuntos:</Text>
                          {submission.file_urls.map((url, fileIndex) => (
                            <Text key={fileIndex} style={styles.fileUrl}>{url}</Text>
                          ))}
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Botón de cerrar */}
        <View style={styles.buttonContainer}>
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
    padding: 20,
    paddingTop: 10,
  },
  closeButton: {
    marginTop: 10,
  },
});

export default TeacherTaskDetailModal;
