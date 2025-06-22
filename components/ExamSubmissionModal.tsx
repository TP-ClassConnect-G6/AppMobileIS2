import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Platform, Alert, Linking } from "react-native";
import { Modal, Portal, Text, Title, Button, Divider, TextInput, ActivityIndicator, List, Chip } from "react-native-paper";
import { courseClient } from "@/lib/http";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useSession } from "@/contexts/session";
import jwtDecode from "jwt-decode";
import { format } from "date-fns";

// Tipo para la respuesta de la entrega de examen
type ExamSubmissionResponse = {
  id: string;
  exam_id: string;
  student_id: string;
  answers: string;
  submitted_at: string;
  is_late: boolean;
  file_urls: string[];
  is_active: boolean;
};

// Tipo para detalles del examen
type ExamDetails = {
  id: string;
  title: string;
  description: string;
  additional_info?: {
    instructions?: string;
    questions?: string;
  };
  [key: string]: any;
};

// Tipo para las propiedades del componente
type ExamSubmissionModalProps = {
  visible: boolean;
  onDismiss: () => void;
  examId: string;
  examTitle: string;
  onSubmissionSuccess?: () => void;
};

const ExamSubmissionModal = ({ visible, onDismiss, examId, examTitle, onSubmissionSuccess }: ExamSubmissionModalProps) => {
  const { session } = useSession();
  const [answers, setAnswers] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [studentId, setStudentId] = useState<string>("");
  const [submissionData, setSubmissionData] = useState<ExamSubmissionResponse | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [examQuestions, setExamQuestions] = useState<string[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<{[key: number]: string}>({});
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para el contador regresivo
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // en segundos
  const [timerActive, setTimerActive] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  
  // Extraer el ID del estudiante del token JWT
  useEffect(() => {
    if (session?.token) {
      try {
        const decodedToken: any = jwtDecode(session.token);
        // Asumimos que el ID del usuario está en el token como "sub", "id" o similar
        // Ajusta según tu estructura de token
        setStudentId(decodedToken.sub || decodedToken.id || session.userId);
        console.log("ID del estudiante extraído:", studentId);
      } catch (error) {
        console.error("Error al decodificar el token:", error);
      }
    }
  }, [session]);
    // Reset form state when examId changes or when modal becomes visible
  useEffect(() => {
    if (visible) {
      resetForm();
      fetchExamDetails();
      console.log(`Modal opened for exam: ${examId}, resetting form state`);
    }
  }, [examId, visible]);

  // Efecto para el contador regresivo
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            setTimeExpired(true);
            setTimerActive(false);
            Alert.alert(
              "Tiempo Agotado",
              "El tiempo para completar el examen ha terminado. El botón de envío ha sido deshabilitado.",
              [{ text: "Entendido" }]
            );
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (timeRemaining === 0 && timerActive) {
      setTimerActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeRemaining]);

  // Fetch exam details including questions
  const fetchExamDetails = async () => {
    if (!examId) return;
    
    try {
      setLoading(true);
      const response = await courseClient.get(`/exams/${examId}`);
      setExamDetails(response.data);
      
      // Inicializar el contador regresivo si hay duración
      if (response.data?.duration) {
        const durationInSeconds = response.data.duration * 60; // Convertir minutos a segundos
        setTimeRemaining(durationInSeconds);
        setTimerActive(true);
        setTimeExpired(false);
        console.log(`Timer started: ${response.data.duration} minutes (${durationInSeconds} seconds)`);
      }
      
      // Extract questions from additional_info if available
      if (response.data?.additional_info?.questions) {
        const questionsText = response.data.additional_info.questions;
        // Split questions by the delimiter "---"
        const questionsArray = questionsText.split(/\s*---\s*/).filter((q: string) => q.trim());
        setExamQuestions(questionsArray);
        
        // Initialize answers object
        const initialAnswers: {[key: number]: string} = {};
        questionsArray.forEach((_: string, index: number) => {
          initialAnswers[index] = "";
        });
        setQuestionAnswers(initialAnswers);
      }
    } catch (error) {
      console.error("Error fetching exam details:", error);
      Alert.alert("Error", "No se pudieron cargar los detalles del examen");
    } finally {
      setLoading(false);
    }
  };
  
  // Función para seleccionar archivos (limitado a 1 archivo)
  const pickDocuments = async () => {
    try {
      // Si ya hay un archivo seleccionado, mostrar advertencia
      if (selectedFiles.length >= 1) {
        Alert.alert(
          "Límite de archivos", 
          "Solo se permite adjuntar 1 archivo. Por favor elimina el archivo actual para seleccionar uno nuevo.",
          [{ text: "Entendido" }]
        );
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Cualquier tipo de archivo
        multiple: false, // No permitir múltiples archivos
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets) {
        // Actualizar con solo el nuevo archivo seleccionado
        setSelectedFiles(result.assets);
      }
    } catch (error) {
      console.error("Error al seleccionar archivos:", error);
      Alert.alert("Error", "No se pudo seleccionar el archivo");
    }
  };

  // Eliminar un archivo de la lista
  const removeFile = (index: number) => {
    setSelectedFiles((prevFiles: DocumentPicker.DocumentPickerAsset[]) => 
      prevFiles.filter((_: DocumentPicker.DocumentPickerAsset, i: number) => i !== index)
    );
  };
    // Función para actualizar la respuesta a una pregunta específica
  const updateQuestionAnswer = (questionIndex: number, answer: string) => {
    setQuestionAnswers((prev: {[key: number]: string}) => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  // Función para formatear el tiempo restante
  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  // Función para enviar la entrega del examen
  const submitExam = async () => {
    if (!studentId) {
      Alert.alert("Error", "No se pudo obtener la información del estudiante");
      return;
    }

    // Verificar si estamos usando el formato estructurado de preguntas
    const usingStructuredQuestions = examQuestions.length > 0;
    
    if (usingStructuredQuestions) {
      // Verificar si todas las preguntas tienen respuestas
      const unansweredQuestions = examQuestions.filter((_: string, index: number) => 
        !questionAnswers[index] || questionAnswers[index].trim() === ""
      );
      
      if (unansweredQuestions.length > 0) {
        Alert.alert(
          "Respuestas incompletas", 
          `Hay ${unansweredQuestions.length} pregunta(s) sin responder. ¿Desea continuar de todos modos?`,
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Continuar", onPress: () => processSubmission() }
          ]
        );
        return;
      }
    } else if (!answers.trim()) {
      Alert.alert("Aviso", "Por favor, ingresa tus respuestas antes de enviar");
      return;
    }
    
    // Si todas las preguntas tienen respuestas o estamos usando el formato antiguo, proceder con el envío
    processSubmission();
  };
  
  // Función para procesar la entrega del examen
  const processSubmission = async () => {
    setUploading(true);

    try {
      // Crear un FormData para enviar los datos
      const formData = new FormData();
      
      // Agregar el ID del examen
      formData.append("exam_id", examId);
      
      // Agregar el ID del estudiante
      formData.append("user_id", studentId);
        // Determinar el formato de las respuestas según si estamos usando preguntas estructuradas
      if (examQuestions.length > 0) {
        // Convertir las respuestas a un formato estructurado para enviar al servidor
        let formattedAnswers = "";
        
        // Recorrer cada pregunta y su respuesta correspondiente
        for (let i = 0; i < examQuestions.length; i++) {
          const question = examQuestions[i];
          const answer = questionAnswers[i] || "Sin respuesta";
          
          // Formatear cada par pregunta-respuesta
          formattedAnswers += `PREGUNTA ${i + 1}: ${question}\n\nRESPUESTA ${i + 1}: ${answer}\n\n---\n`;
        }
        
        console.log("Respuestas formateadas:", formattedAnswers);
        formData.append("answers", formattedAnswers);
      } else {
        // Usar el campo de respuestas tradicional
        formData.append("answers", answers);
      }
      
      // Agregar el archivo seleccionado (máximo 1)
      if (selectedFiles.length > 0) {
        // Solo tomamos el primer archivo de la lista
        const file = selectedFiles[0];
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        
        // Solo proceder si el archivo existe
        if (fileInfo.exists) {
          const fileBlob: any = {
            uri: file.uri,
            type: file.mimeType || "application/octet-stream",
            name: file.name || "file"
          };
          
          formData.append("files", fileBlob);
        }
      }

      // Enviar la solicitud al servidor
      const response = await courseClient.post(`/exams/${examId}/submissions`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log("Respuesta del servidor:", response.data);
      // Guardar los datos de la respuesta
      const submissionResponse: ExamSubmissionResponse = response.data;
      setSubmissionData(submissionResponse);
      
      // Cambiar a vista de éxito
      setSubmissionSuccess(true);
      
      // Mostrar mensaje de confirmación antes de cambiar a la vista de éxito
      const lateMessage = submissionResponse.is_late ? 
        "\n\n⚠️ Nota: Esta entrega fue realizada fuera del tiempo establecido." : "";
          Alert.alert(
        "Entrega Exitosa",
        `Tu examen ha sido enviado correctamente.${lateMessage}`,
        [{ 
          text: "Ver detalles", 
          style: "default",
          onPress: () => {
            // Llamar el callback si existe
            onSubmissionSuccess?.();
          }
        }]
      );
    } catch (error: any) {
      console.error("Error al enviar el examen:", error);
      let errorMessage = "No se pudo enviar el examen. Intenta nuevamente.";
      
      if (error.response) {
        // Error con respuesta del servidor
        const status = error.response.status;
        switch (status) {
          case 400:
            errorMessage = "Faltan datos requeridos o formato incorrecto";
            break;
          case 403:
            errorMessage = "No tienes permisos para enviar este examen";
            break;
          case 404:
            errorMessage = "Examen no encontrado";
            break;
          default:
            errorMessage = `Error del servidor: ${error.response.data?.message || "Error desconocido"}`;
        }
      } else if (error.request) {
        // La solicitud se realizó pero no se recibió respuesta
        errorMessage = "No se recibió respuesta del servidor. Verifica tu conexión.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setUploading(false);
    }
  };
  
  // Función para formatear la fecha de envío
  const formatSubmissionDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm:ss');
    } catch (e) {
      return dateString;
    }
  };

  // Función para abrir un archivo desde URL
  const openFileUrl = (url: string) => {
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "No se puede abrir el archivo");
      }
    });
  };
    // Función para resetear el formulario y volver al modo de envío
  const resetForm = () => {
    setAnswers("");
    setSelectedFiles([]);
    setSubmissionData(null);
    setSubmissionSuccess(false);
    setQuestionAnswers({});
    setTimeRemaining(0);
    setTimerActive(false);
    setTimeExpired(false);
    console.log("Form state reset completed");
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => {
          // Solo permitir cerrar si el examen fue enviado exitosamente o si hay un error crítico
          if (submissionSuccess && !uploading) {
            resetForm();
            onDismiss();
          } else {
            // Mostrar alerta explicando que no se puede cerrar durante el examen
            Alert.alert(
              "Examen en Progreso",
              "No puedes cerrar el examen hasta completarlo. Si necesitas salir, debes enviar tus respuestas primero.",
              [{ text: "Entendido" }]
            );
          }
        }}
        dismissable={submissionSuccess} // Solo dismissable después de enviar
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {submissionSuccess && submissionData ? (
            // Vista de éxito después de enviar el examen
            <>
              <View style={styles.successHeader}>
                <Title style={styles.title}>¡Examen Enviado!</Title>
                <Chip 
                  icon={submissionData.is_late ? "clock-alert" : "check-circle"} 
                  style={[styles.statusChip, submissionData.is_late ? styles.lateChip : styles.onTimeChip]}
                >
                  {submissionData.is_late ? "Entrega tardía" : "A tiempo"}
                </Chip>
              </View>
              <Text style={styles.examTitle}>{examTitle}</Text>
              <Divider style={styles.divider} />
              
              <List.Section>
                {/* <List.Item 
                  title="ID de Entrega" 
                  description={submissionData.id}
                  left={props => <List.Icon {...props} icon="identifier" />}
                /> */}
                <List.Item 
                  title="Fecha de Envío" 
                  description={formatSubmissionDate(submissionData.submitted_at)}
                  left={props => <List.Icon {...props} icon="calendar-clock" />}
                />
                <Divider />
                <Text style={styles.sectionTitle}>Tus Respuestas:</Text>
                <View style={styles.answersContainer}>
                  {submissionData.answers.includes("PREGUNTA") && submissionData.answers.includes("RESPUESTA") ? (
                    <View>
                      {submissionData.answers.split(/---\n/).filter(qa => qa.trim()).map((qa, index) => {
                        // Buscar patrones de pregunta y respuesta
                        const questionMatch = qa.match(/PREGUNTA \d+:(.*?)(?=\n\nRESPUESTA)/s);
                        const answerMatch = qa.match(/RESPUESTA \d+:(.*?)$/s);
                        
                        if (!questionMatch || !answerMatch) return <Text key={index}>{qa}</Text>;
                        
                        const questionPart = questionMatch[1].trim();
                        const answerPart = answerMatch[1].trim();
                        
                        return (
                          <View key={index} style={styles.submittedQuestionContainer}>
                            <Text style={styles.submittedQuestionText}>
                              {`Pregunta ${index + 1}: ${questionPart}`}
                            </Text>
                            <View style={styles.submittedAnswerContainer}>
                              <Text style={styles.submittedAnswerText}>
                                {answerPart}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.submittedAnswers}>{submissionData.answers}</Text>
                  )}
                </View>
                
                {submissionData.is_late && (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                      ⚠️ Esta entrega fue realizada fuera del tiempo establecido. El profesor podría aplicar alguna penalización.
                    </Text>
                  </View>
                )}
                
                {submissionData.file_urls && submissionData.file_urls.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Archivo Adjunto:</Text>
                    <View style={styles.fileUrlsList}>
                      {submissionData.file_urls.map((url, index) => {
                        const fileName = url.split('/').pop() || `Archivo`;
                        return (
                          <Button
                            key={index}
                            mode="outlined"
                            icon="file-document"
                            style={styles.fileUrlButton}
                            onPress={() => openFileUrl(url)}
                          >
                            {fileName}
                          </Button>
                        );
                      })}
                    </View>
                  </>
                )}
              </List.Section>
              
              <View style={styles.buttonContainer}>
                {/* <Button 
                  mode="outlined" 
                  onPress={resetForm}
                  style={styles.resetButton}
                >
                  Nueva Entrega
                </Button> */}
                <Button 
                  mode="contained" 
                  onPress={() => {
                    resetForm();
                    onDismiss();
                  }}
                  style={styles.doneButton}
                >
                  Finalizar
                </Button>
              </View>
            </>
          ) : (
            // Vista de formulario para enviar el examen
            <>
              <Title style={styles.title}>Enviar Examen</Title>
              <Text style={styles.examTitle}>{examTitle}</Text>
              
              {/* Advertencia sobre no poder cerrar */}
              <View style={styles.examWarningContainer}>
                <Text style={styles.examWarningText}>
                  ⚠️ Una vez iniciado el examen, no podrás cerrar esta ventana hasta completarlo y enviarlo.
                </Text>
              </View>
              
              {/* Contador regresivo */}
              {timeRemaining > 0 && (
                <View style={[styles.timerContainer, timeExpired && styles.timerExpired]}>
                  <Text style={[styles.timerLabel, timeExpired && styles.timerExpiredText]}>
                    Tiempo restante:
                  </Text>
                  <Text style={[styles.timerText, timeExpired && styles.timerExpiredText]}>
                    {formatTimeRemaining(timeRemaining)}
                  </Text>
                  {timeRemaining <= 300 && !timeExpired && ( // 5 minutos = 300 segundos
                    <Text style={styles.timerWarning}>
                      ⚠️ Quedan pocos minutos
                    </Text>
                  )}
                </View>
              )}
              
              <Divider style={styles.divider} />
              
              {loading ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#0000ff" />
                  <Text style={styles.loadingText}>Cargando detalles del examen...</Text>
                </View>
              ) : examQuestions.length > 0 ? (
                // Mostrar formato estructurado de preguntas
                <>
                  {examDetails?.description && (
                    <View style={styles.instructionsContainer}>
                      <Text style={styles.sectionTitle}>Instrucciones Generales:</Text>
                      <Text style={styles.instructionsText}>{examDetails.description}</Text>
                    </View>
                  )}
                  
                  <Text style={styles.sectionTitle}>Preguntas:</Text>
                  
                  {examQuestions.map((question, index) => (
                    <View key={index} style={styles.questionContainer}>
                      <Text style={styles.questionText}>
                        {index + 1}. {question}
                      </Text>
                      <TextInput
                        multiline
                        numberOfLines={4}
                        value={questionAnswers[index] || ""}
                        onChangeText={(text) => updateQuestionAnswer(index, text)}
                        placeholder={`Escribe tu respuesta a la pregunta ${index + 1} aquí...`}
                        style={styles.answerInput}
                      />
                    </View>
                  ))}
                </>
              ) : (
                // Mostrar formato tradicional (texto libre)
                <>
                  <Text style={styles.sectionTitle}>Respuestas:</Text>
                  <TextInput
                    multiline
                    numberOfLines={8}
                    value={answers}
                    onChangeText={setAnswers}
                    placeholder="Escribe tus respuestas aquí..."
                    style={styles.answersInput}
                  />
                </>
              )}
              
              <Text style={styles.sectionTitle}>Archivo adjunto (máximo 1):</Text>
              {selectedFiles.length > 0 ? (
                <View style={styles.fileList}>
                  {selectedFiles.map((file, index) => (
                    <View key={index} style={styles.fileItem}>
                      <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                        {file.name}
                      </Text>
                      <Button 
                        compact 
                        mode="text" 
                        icon="close" 
                        onPress={() => removeFile(index)}
                        style={styles.removeButton}
                      >
                        Eliminar
                      </Button>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noFilesText}>No hay archivo seleccionado</Text>
              )}
              
              <Button 
                mode="outlined" 
                icon="file-upload" 
                onPress={pickDocuments}
                style={styles.fileButton}
                disabled={uploading || selectedFiles.length >= 1}
              >
                Adjuntar Archivo
              </Button>
                <View style={styles.buttonContainer}>
                <Button 
                  mode="contained" 
                  onPress={submitExam}
                  style={styles.submitButtonFullWidth}
                  loading={uploading}
                  disabled={uploading || (examQuestions.length === 0 && !answers.trim()) || timeExpired}
                >
                  {timeExpired ? 'Tiempo Agotado' : 'Enviar Examen'}
                </Button>
              </View>
              
              {uploading && (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="large" color="#0000ff" />
                  <Text style={styles.uploadingText}>Enviando examen...</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  examTitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  divider: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  answersInput: {
    marginBottom: 15,
  },
  // Nuevos estilos para las preguntas estructuradas
  loaderContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  instructionsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
  questionContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  questionText: {
    fontSize: 15,
    marginBottom: 10,
    fontWeight: '500',
  },
  answerInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  fileList: {
    marginBottom: 15,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fileName: {
    flex: 1,
    paddingRight: 10,
  },
  removeButton: {
    marginLeft: 10,
  },
  noFilesText: {
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 15,
  },
  fileButton: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },  submitButton: {
    flex: 1,
    marginLeft: 10,
  },
  submitButtonFullWidth: {
    width: '100%',
  },
  uploadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  // Estilos nuevos para la vista de éxito
  successHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusChip: {
    marginLeft: 10,
  },
  lateChip: {
    backgroundColor: '#FFCDD2',
  },
  onTimeChip: {
    backgroundColor: '#C8E6C9',
  },
  answersContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  submittedAnswers: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Styles for structured submitted answers
  submittedQuestionContainer: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 10,
  },
  submittedQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  submittedAnswerContainer: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  submittedAnswerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
  fileUrlsList: {
    marginVertical: 10,
  },
  fileUrlButton: {
    marginVertical: 5,
  },
  resetButton: {
    flex: 1,
    marginRight: 10,
  },
  doneButton: {
    flex: 1,
    marginLeft: 10,
  },
  warningContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFB74D',
  },
  warningText: {
    color: '#E65100',
    fontSize: 14,
  },
  // Estilos para el contador regresivo
  timerContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  timerExpired: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1976D2',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  timerExpiredText: {
    color: '#D32F2F',
  },
  timerWarning: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
    fontWeight: '500',
  },
  // Estilos para la advertencia del examen
  examWarningContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  examWarningText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ExamSubmissionModal;
