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

// Tipo para las propiedades del componente
type ExamSubmissionModalProps = {
  visible: boolean;
  onDismiss: () => void;
  examId: string;
  examTitle: string;
};

const ExamSubmissionModal = ({ visible, onDismiss, examId, examTitle }: ExamSubmissionModalProps) => {
  const { session } = useSession();
  const [answers, setAnswers] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [studentId, setStudentId] = useState<string>("");
  const [submissionData, setSubmissionData] = useState<ExamSubmissionResponse | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

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

  // Función para seleccionar archivos
  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Cualquier tipo de archivo
        multiple: true, // Permitir múltiples archivos
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets) {
        // Actualizar la lista de archivos seleccionados
        setSelectedFiles(prevFiles => [...prevFiles, ...result.assets]);
      }
    } catch (error) {
      console.error("Error al seleccionar archivos:", error);
      Alert.alert("Error", "No se pudieron seleccionar los archivos");
    }
  };

  // Eliminar un archivo de la lista
  const removeFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  // Función para enviar la entrega del examen
  const submitExam = async () => {
    if (!studentId) {
      Alert.alert("Error", "No se pudo obtener la información del estudiante");
      return;
    }

    if (!answers.trim()) {
      Alert.alert("Aviso", "Por favor, ingresa tus respuestas antes de enviar");
      return;
    }

    setUploading(true);

    try {
      // Crear un FormData para enviar los datos
      const formData = new FormData();
      
      // Agregar el ID del examen
      formData.append("exam_id", examId);
      
      // Agregar el ID del estudiante
      formData.append("student_id", studentId);
      
      // Agregar las respuestas
      formData.append("answers", answers);
      
      // Agregar los archivos seleccionados
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
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
        [{ text: "Ver detalles", style: "default" }]
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
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={(uploading || submissionSuccess) ? undefined : onDismiss} // Prevenir cierre durante la carga o después del éxito
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
                <List.Item 
                  title="ID de Entrega" 
                  description={submissionData.id}
                  left={props => <List.Icon {...props} icon="identifier" />}
                />
                <List.Item 
                  title="Fecha de Envío" 
                  description={formatSubmissionDate(submissionData.submitted_at)}
                  left={props => <List.Icon {...props} icon="calendar-clock" />}
                />
                <Divider />
                  <Text style={styles.sectionTitle}>Tus Respuestas:</Text>
                <View style={styles.answersContainer}>
                  <Text style={styles.submittedAnswers}>{submissionData.answers}</Text>
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
                    <Text style={styles.sectionTitle}>Archivos Adjuntos:</Text>
                    <View style={styles.fileUrlsList}>
                      {submissionData.file_urls.map((url, index) => {
                        const fileName = url.split('/').pop() || `Archivo ${index + 1}`;
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
                <Button 
                  mode="outlined" 
                  onPress={resetForm}
                  style={styles.resetButton}
                >
                  Nueva Entrega
                </Button>
                
                <Button 
                  mode="contained" 
                  onPress={onDismiss}
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
              <Divider style={styles.divider} />
              
              <Text style={styles.sectionTitle}>Respuestas:</Text>
              <TextInput
                multiline
                numberOfLines={8}
                value={answers}
                onChangeText={setAnswers}
                placeholder="Escribe tus respuestas aquí..."
                style={styles.answersInput}
              />
              
              <Text style={styles.sectionTitle}>Archivos adjuntos:</Text>
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
                <Text style={styles.noFilesText}>No hay archivos seleccionados</Text>
              )}
              
              <Button 
                mode="outlined" 
                icon="file-upload" 
                onPress={pickDocuments}
                style={styles.fileButton}
                disabled={uploading}
              >
                Adjuntar Archivos
              </Button>
              
              <View style={styles.buttonContainer}>
                <Button 
                  mode="outlined" 
                  onPress={onDismiss} 
                  style={styles.cancelButton}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                
                <Button 
                  mode="contained" 
                  onPress={submitExam}
                  style={styles.submitButton}
                  loading={uploading}
                  disabled={uploading || !answers.trim()}
                >
                  Enviar Examen
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
  },
  submitButton: {
    flex: 1,
    marginLeft: 10,
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
  fileUrlsList: {
    marginVertical: 10,
  },
  fileUrlButton: {
    marginVertical: 5,
  },  resetButton: {
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
});

export default ExamSubmissionModal;
