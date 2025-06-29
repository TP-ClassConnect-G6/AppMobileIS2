import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSession } from '@/contexts/session';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from 'axios';

// Tipos para las entregas del estudiante
type StudentSubmission = {
  id: string;
  exam_id?: string;
  task_id?: string;
  student_id: string;
  answers: string;
  submitted_at: string;
  is_late: boolean;
  file_urls: string[];
  is_active: boolean;
  score?: number;
  feedback?: string;
};

export default function MisCalificaciones() {
  const { session } = useSession();
  const colorScheme = useColorScheme();
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session?.userId && session?.userType === 'student') {
      fetchSubmissions();
    }
  }, [session?.userId, session?.userType]);

  const fetchSubmissions = async (isRefresh = false) => {
    if (!session?.userId || !session?.token || session?.userType !== 'student') {
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await axios.get(
        `https://apigatewayis2-production.up.railway.app/courses/students/${session.userId}/submission`,
        {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Validar que la respuesta sea un array
      const responseData = response.data;
      if (!Array.isArray(responseData)) {
        console.warn('Response data is not an array:', responseData);
        setSubmissions([]);
        return;
      }

      // Filtrar solo entregas que tengan score o feedback
      const graded = Array.isArray(responseData) ? responseData.filter((submission: StudentSubmission) => 
        submission && (submission.score !== undefined || submission.feedback)
      ) : [];

      setSubmissions(graded);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      Alert.alert('Error', 'No se pudieron cargar las calificaciones');
      setSubmissions([]); // Asegurar que submissions sea un array
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchSubmissions(true);
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

  // Función para parsear respuestas (similar a TeacherTaskDetailModal)
  const parseAnswers = (answersText: string): Array<{ question: string; answer: string }> => {
    if (!answersText || typeof answersText !== 'string') return [];
    
    try {
      const sections = answersText.split(/\n---\n/);
      const parsedAnswers: Array<{ question: string; answer: string }> = [];
      
      if (!Array.isArray(sections)) return [];
      
      sections.forEach(section => {
        if (!section || typeof section !== 'string') return;
        
        const lines = section.trim().split('\n');
        if (!Array.isArray(lines)) return;
        
        let question = '';
        let answer = '';
        let foundAnswer = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]?.trim() || '';
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
    } catch (error) {
      console.error('Error parsing answers:', error);
      return [];
    }
  };

  // Función para determinar el tipo de entrega
  const getSubmissionType = (submission: StudentSubmission) => {
    return submission.exam_id ? 'Examen' : 'Tarea';
  };

  if (session?.userType !== 'student') {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.centerContainer}>
          <MaterialCommunityIcons 
            name="account-alert" 
            size={48} 
            color={Colors[colorScheme ?? 'light'].text} 
          />
          <ThemedText style={styles.errorText}>
            Esta sección es solo para estudiantes
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <ThemedText style={styles.loadingText}>
            Cargando calificaciones...
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Mis Calificaciones</ThemedText>
        <ThemedText style={styles.subtitle}>
          Entregas con calificaciones y feedback
        </ThemedText>
      </ThemedView>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!Array.isArray(submissions) || submissions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="clipboard-text-outline" 
              size={48} 
              color="#999" 
            />
            <Text style={styles.emptyText}>
              No tienes calificaciones aún
            </Text>
            <Text style={styles.emptySubtext}>
              Las calificaciones aparecerán aquí cuando los profesores evalúen tus entregas
            </Text>
          </View>
        ) : (
          submissions.map((submission, index) => {
              if (!submission || !submission.id) {
                console.warn('Invalid submission:', submission);
                return null;
              }

              const parsedAnswers = parseAnswers(submission.answers || '');
              const submissionType = getSubmissionType(submission);
              
              return (
                <Card key={submission.id} style={styles.submissionCard}>
                  <Card.Content>
                    {/* Header con tipo y estado */}
                    <View style={styles.submissionHeader}>
                      <View style={styles.submissionTitleContainer}>
                        <Text style={styles.submissionType}>{submissionType}</Text>
                        <Text style={styles.submissionDate}>
                          Entregada: {formatDate(submission.submitted_at)}
                        </Text>
                      </View>
                      <View style={styles.statusContainer}>
                        {submission.is_late && (
                          <Chip mode="flat" style={styles.lateChip} textStyle={{ color: 'white', fontSize: 10 }}>
                            Tardía
                          </Chip>
                        )}
                      </View>
                    </View>

                    {/* Calificación */}
                    {submission.score !== undefined && (
                      <View style={styles.gradeContainer}>
                        <Text style={styles.gradeLabel}>Calificación:</Text>
                        <Chip 
                          mode="flat" 
                          style={[
                            styles.gradeChip, 
                            { backgroundColor: submission.score >= 60 ? '#4caf50' : '#f44336' }
                          ]}
                          textStyle={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}
                        >
                          {submission.score}/100
                        </Chip>
                      </View>
                    )}

                    {/* Feedback del profesor */}
                    {submission.feedback && (
                      <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackLabel}>Feedback del profesor:</Text>
                        <View style={styles.feedbackBox}>
                          <Text style={styles.feedbackText}>{submission.feedback}</Text>
                        </View>
                      </View>
                    )}

                    <Divider style={styles.divider} />

                    {/* Respuestas del estudiante */}
                    <View style={styles.answersContainer}>
                      <Text style={styles.answersTitle}>Mis respuestas:</Text>
                      {Array.isArray(parsedAnswers) && parsedAnswers.length > 0 ? (
                        parsedAnswers.map((item, answerIndex) => (
                          <View key={answerIndex} style={styles.answerItem}>
                            <Text style={styles.answerQuestion}>P{answerIndex + 1}: {item?.question || 'Pregunta sin texto'}</Text>
                            <Text style={styles.answerText}>R: {item?.answer || 'Sin respuesta'}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.answerText}>{submission.answers || 'Sin respuestas'}</Text>
                      )}
                    </View>

                    {/* Archivos adjuntos */}
                    {Array.isArray(submission.file_urls) && submission.file_urls.length > 0 && (
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
            }).filter(Boolean) // Filtrar elementos null
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  submissionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  submissionTitleContainer: {
    flex: 1,
  },
  submissionType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  submissionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  lateChip: {
    backgroundColor: '#f44336',
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
  },
  gradeChip: {
    // backgroundColor será dinámico
  },
  feedbackContainer: {
    marginBottom: 12,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1976d2',
  },
  feedbackBox: {
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  feedbackText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 18,
  },
  divider: {
    marginVertical: 12,
  },
  answersContainer: {
    marginTop: 8,
  },
  answersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2196f3',
  },
  answerItem: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  answerQuestion: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  filesContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  filesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1976d2',
  },
  fileUrl: {
    fontSize: 12,
    color: '#1976d2',
    textDecorationLine: 'underline',
  },
});
