import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { Modal, Portal, Text, Title, Button, TextInput, Divider, Switch, HelperText } from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from 'react-hook-form';
import { courseClient } from "@/lib/http";
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from "date-fns";

type Exam = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  location: string;
  owner: string;
  additional_info: {
    open_book: boolean;
    grace_period?: string;
    submission_rules?: string;
    questions?: string;
  };
  published: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

type EditExamModalProps = {
  visible: boolean;
  onDismiss: () => void;
  exam: Exam | null;
  courseId: string | null;
};

// Tipo para el formulario
type ExamFormData = {
  title: string;
  description: string;
  duration: string;
  location: string;
  gracePeriod: string;
  submissionRules: string;
  newQuestion: string;
};

// Función para actualizar un examen
const updateExam = async (exam: Exam): Promise<any> => {
  try {
    // Creamos el objeto en el formato esperado por el API
    const examData = {
      title: exam.title,
      description: exam.description,
      date: exam.date.split('T')[0], // Enviamos solo la fecha sin hora
      duration: exam.duration,
      location: exam.location,
      additional_info: exam.additional_info
    };
    
    console.log("Enviando datos de actualización:", examData);
    const response = await courseClient.put(`/exams/${exam.id}`, examData);
    console.log("Examen actualizado exitosamente:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar el examen:', error);
    throw error;
  }
};

const EditExamModal = ({ visible, onDismiss, exam, courseId }: EditExamModalProps) => {
  const queryClient = useQueryClient();
  
  // React Hook Form
  const { control, handleSubmit, formState: { errors }, setValue, getValues, reset, setError, clearErrors, watch } = useForm<ExamFormData>({
    defaultValues: {
      title: '',
      description: '',
      duration: '',
      location: '',
      gracePeriod: '',
      submissionRules: '',
      newQuestion: '',
    }
  });
  
  // Watch the newQuestion field for real-time updates
  const newQuestionValue = watch('newQuestion');
  
  // Estados que no van en el formulario
  const [examDate, setExamDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openBook, setOpenBook] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  
  // Estado para manejar el botón de guardar
  const [isSaving, setIsSaving] = useState(false);  // Actualizar los estados cuando el examen cambia
  useEffect(() => {
    if (exam) {
      setValue('title', exam.title);
      setValue('description', exam.description);
      setExamDate(new Date(exam.date));
      setValue('duration', exam.duration.toString());
      setValue('location', exam.location);
      setOpenBook(exam.additional_info?.open_book || false);
      setValue('gracePeriod', exam.additional_info?.grace_period || "");
      setValue('submissionRules', exam.additional_info?.submission_rules || "");
      
      // Cargar preguntas si existen
      if (exam.additional_info?.questions) {
        const questionsText = exam.additional_info.questions;
        // Split questions by the delimiter "---"
        const questionsArray = questionsText.split(/\s*---\s*/).filter((q: string) => q.trim());
        setQuestions(questionsArray);
      } else {
        setQuestions([]);
      }
      
      setValue('newQuestion', "");
    }
  }, [exam]);

  // Mutación para actualizar el examen
  const updateMutation = useMutation({
    mutationFn: updateExam,
    onMutate: () => {
      setIsSaving(true);
    },
    onSuccess: (data) => {
      console.log("Respuesta exitosa del servidor:", data);
      
      // Invalidar consultas para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['teacherCourseExams', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courseExams', courseId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      
      setIsSaving(false);
      Alert.alert("Éxito", "El examen ha sido actualizado exitosamente.");
      onDismiss();
    },
    onError: (error: any) => {
      console.error("Error al actualizar examen:", error);
      
      let errorMessage = "No se pudo actualizar el examen. Inténtelo nuevamente.";
      
      // Intentar extraer un mensaje más específico si está disponible
      if (error.response) {
        console.log("Detalles del error:", {
          status: error.response.status,
          data: error.response.data
        });
        
        // Usar el mensaje de error del API si está disponible
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      Alert.alert("Error", errorMessage);
      setIsSaving(false);
    }
  });
  // Manejar el cambio de fecha
  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || examDate;
    setShowDatePicker(false);
    setExamDate(currentDate);
  };
  // Añadir una nueva pregunta
  const addQuestion = () => {
    if (newQuestionValue?.trim()) {
      setQuestions([...questions, newQuestionValue.trim()]);
      setValue('newQuestion', "");
    }
  };

  // Eliminar una pregunta
  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };
  // Función para manejar el envío del formulario
  const onSubmit = (formData: ExamFormData) => {
    if (!exam) return;
    
    // Validar campos obligatorios
    if (!formData.title.trim() || !formData.description.trim() || !formData.duration || !formData.location.trim()) {
      Alert.alert("Error", "Por favor complete todos los campos obligatorios.");
      return;
    }
    
    // Crear el objeto de examen actualizado
    const updatedExam: Exam = {
      ...exam,
      title: formData.title.trim(),
      description: formData.description.trim(),
      date: examDate.toISOString(),
      duration: parseInt(formData.duration, 10),
      location: formData.location.trim(),
      additional_info: {
        open_book: openBook,
        // Solo incluimos estos campos si tienen valor
        ...(formData.gracePeriod.trim() ? { grace_period: formData.gracePeriod.trim() } : {}),
        ...(formData.submissionRules.trim() ? { submission_rules: formData.submissionRules.trim() } : {}),
        // Incluir preguntas si hay
        ...(questions.length > 0 ? { questions: questions.join("\n---\n") } : {})
      }
    };

    console.log("Enviando examen actualizado:", updatedExam);
    // Ejecutar la mutación
    updateMutation.mutate(updatedExam);
  };

  // Manejar el guardado del examen
  const handleSaveExam = handleSubmit(onSubmit);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Title style={styles.title}>Editar Examen</Title>
          <Divider style={styles.divider} />
          <Controller
            control={control}
            name="title"
            rules={{
              required: "El título es requerido",
              minLength: {
                value: 3,
                message: "El título debe tener al menos 3 caracteres"
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Título *"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (text.trim().length >= 3) {
                    clearErrors("title");
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (!value || value.trim().length < 3) {
                    setError("title", {
                      type: "manual",
                      message: !value ? "El título es requerido" : "El título debe tener al menos 3 caracteres"
                    });
                  }
                }}
                style={[styles.input, !!errors.title && styles.inputError]}
                mode="outlined"
                error={!!errors.title}
                right={
                  value && value.trim().length >= 3 ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.title && <HelperText type="error">{errors.title.message}</HelperText>}
          <Controller
            control={control}
            name="description"
            rules={{
              required: "La descripción es requerida",
              minLength: {
                value: 10,
                message: "La descripción debe tener al menos 10 caracteres"
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Descripción *"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (text.trim().length >= 10) {
                    clearErrors("description");
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (!value || value.trim().length < 10) {
                    setError("description", {
                      type: "manual",
                      message: !value ? "La descripción es requerida" : "La descripción debe tener al menos 10 caracteres"
                    });
                  }
                }}
                style={[styles.input, !!errors.description && styles.inputError]}
                mode="outlined"
                multiline
                numberOfLines={3}
                error={!!errors.description}
                right={
                  value && value.trim().length >= 10 ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.description && <HelperText type="error">{errors.description.message}</HelperText>}

          <View style={styles.datePickerContainer}>
            <Text style={styles.inputLabel}>Fecha del examen *</Text>
            <Button mode="outlined" onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
              {format(examDate, 'dd/MM/yyyy')}
            </Button>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={examDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
          <Controller
            control={control}
            name="duration"
            rules={{
              required: "La duración es requerida",
              pattern: {
                value: /^\d+$/,
                message: "La duración debe ser un número válido"
              },
              validate: (value) => {
                const num = parseInt(value, 10);
                if (num <= 0) return "La duración debe ser mayor a 0";
                if (num > 600) return "La duración no puede ser mayor a 600 minutos";
                return true;
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Duración en minutos *"
                value={value}
                onChangeText={(text) => {
                  // Solo permitir números
                  if (/^\d*$/.test(text)) {
                    onChange(text);
                    if (text && parseInt(text, 10) > 0 && parseInt(text, 10) <= 600) {
                      clearErrors("duration");
                    }
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (!value || !value.trim()) {
                    setError("duration", {
                      type: "manual",
                      message: "La duración es requerida"
                    });
                  } else {
                    const num = parseInt(value, 10);
                    if (num <= 0) {
                      setError("duration", {
                        type: "manual",
                        message: "La duración debe ser mayor a 0"
                      });
                    } else if (num > 600) {
                      setError("duration", {
                        type: "manual",
                        message: "La duración no puede ser mayor a 600 minutos"
                      });
                    }
                  }
                }}
                style={[styles.input, !!errors.duration && styles.inputError]}
                mode="outlined"
                keyboardType="numeric"
                error={!!errors.duration}
                right={
                  value && /^\d+$/.test(value) && parseInt(value, 10) > 0 && parseInt(value, 10) <= 600 ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.duration && <HelperText type="error">{errors.duration.message}</HelperText>}
          <Controller
            control={control}
            name="location"
            rules={{
              required: "La ubicación es requerida",
              minLength: {
                value: 3,
                message: "La ubicación debe tener al menos 3 caracteres"
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Ubicación *"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (text.trim().length >= 3) {
                    clearErrors("location");
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (!value || value.trim().length < 3) {
                    setError("location", {
                      type: "manual",
                      message: !value ? "La ubicación es requerida" : "La ubicación debe tener al menos 3 caracteres"
                    });
                  }
                }}
                style={[styles.input, !!errors.location && styles.inputError]}
                mode="outlined"
                error={!!errors.location}
                right={
                  value && value.trim().length >= 3 ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.location && <HelperText type="error">{errors.location.message}</HelperText>}

          <View style={styles.switchContainer}>
            <Text>Libro abierto</Text>
            <Switch value={openBook} onValueChange={setOpenBook} />
          </View>
          <Controller
            control={control}
            name="gracePeriod"
            rules={{
              pattern: {
                value: /^\d*$/,
                message: "El tiempo de tolerancia debe ser un número válido"
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Tiempo de tolerancia (minutos)"
                value={value}
                onChangeText={(text) => {
                  // Solo permitir números
                  if (/^\d*$/.test(text)) {
                    onChange(text);
                    if (!text || /^\d+$/.test(text)) {
                      clearErrors("gracePeriod");
                    }
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (value && !/^\d+$/.test(value)) {
                    setError("gracePeriod", {
                      type: "manual",
                      message: "El tiempo de tolerancia debe ser un número válido"
                    });
                  }
                }}
                style={[styles.input, !!errors.gracePeriod && styles.inputError]}
                mode="outlined"
                keyboardType="numeric"
                error={!!errors.gracePeriod}
                right={
                  value && /^\d+$/.test(value) ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.gracePeriod && <HelperText type="error">{errors.gracePeriod.message}</HelperText>}
            <Controller
            control={control}
            name="submissionRules"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Reglas de entrega"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (text && text.trim().length >= 5) {
                    clearErrors("submissionRules");
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (value && value.trim().length > 0 && value.trim().length < 5) {
                    setError("submissionRules", {
                      type: "manual",
                      message: "Las reglas de entrega deben tener al menos 5 caracteres"
                    });
                  }
                }}
                style={[styles.input, !!errors.submissionRules && styles.inputError]}
                mode="outlined"
                multiline
                numberOfLines={3}
                error={!!errors.submissionRules}
                right={
                  value && value.trim().length >= 5 ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.submissionRules && <HelperText type="error">{errors.submissionRules.message}</HelperText>}

          {/* Sección de preguntas dinámicas */}
          <Text style={styles.sectionTitle}>Preguntas</Text>
          <Divider style={styles.divider} />
          
          {questions.length > 0 && (
            <View style={styles.questionsContainer}>
              {questions.map((question, index) => (
                <View key={index} style={styles.questionItem}>
                  <Text>{`Pregunta ${index + 1}: ${question}`}</Text>
                  <Button 
                    icon="delete" 
                    mode="text" 
                    onPress={() => removeQuestion(index)}
                  >
                    Eliminar
                  </Button>
                </View>
              ))}
            </View>
          )}
            <View style={styles.addQuestionContainer}>
            <Controller
              name="newQuestion"
              control={control}
              rules={{
                minLength: {
                  value: 5,
                  message: 'La pregunta debe tener al menos 5 caracteres'
                }
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Nueva pregunta"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={[styles.input, errors.newQuestion && styles.inputError]}
                  error={!!errors.newQuestion}
                  right={value && value.trim().length >= 5 ? 
                    <TextInput.Icon icon="check-circle" color="green" /> : undefined
                  }
                />
              )}
            />
            {errors.newQuestion && (
              <HelperText type="error" visible={!!errors.newQuestion}>
                {errors.newQuestion.message}
              </HelperText>
            )}
            <Button 
              mode="contained"
              onPress={addQuestion}
              disabled={!newQuestionValue?.trim()}
              style={[styles.button, { marginBottom: 20 }]}
            >
              Añadir Pregunta
            </Button>
          </View>

          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              onPress={onDismiss} 
              style={styles.button}
            >
              Cancelar
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSaveExam} 
              style={styles.button}
              loading={isSaving}
              disabled={isSaving}
            >
              Guardar Cambios
            </Button>
          </View>
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
    maxHeight: '80%',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  divider: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  inputError: {
    borderColor: '#cf6679',
  },
  datePickerContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 5,
    color: '#666',
  },
  dateButton: {
    marginTop: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 15,
    paddingHorizontal: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  questionsContainer: {
    marginBottom: 15,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addQuestionContainer: {
    marginBottom: 20,
  }
});

export default EditExamModal;
