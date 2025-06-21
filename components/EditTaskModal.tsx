import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, Checkbox, Divider, HelperText } from 'react-native-paper';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { courseClient } from '@/lib/http';
import DateTimePicker from '@react-native-community/datetimepicker';

// Tipo para las tareas
type Task = {
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
};

// Props para el modal de edición
interface EditTaskModalProps {
  visible: boolean;
  onDismiss: () => void;
  task: Task | null;
  courseId: string | null;
}

// Tipo para el formulario
type TaskFormData = {
  title: string;
  description: string;
  instructions: string;
  newQuestion: string;
};

const EditTaskModal = ({ visible, onDismiss, task, courseId }: EditTaskModalProps) => {
  const queryClient = useQueryClient();
    // React Hook Form
  const { control, handleSubmit, formState: { errors }, setValue, getValues, reset, setError, clearErrors, watch } = useForm<TaskFormData>({
    defaultValues: {
      title: '',
      description: '',
      instructions: '',
      newQuestion: '',
    }
  });
  
  // Watch the newQuestion field for real-time updates
  const newQuestionValue = watch('newQuestion');
  
  // Estados que no van en el formulario
  const [dueDate, setDueDate] = useState(new Date());
  const [type, setType] = useState('individual'); // individual o grupal
  const [questions, setQuestions] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);  // Inicializar el formulario cuando se abre el modal con una tarea
  useEffect(() => {
    if (task) {
      setValue('title', task.title || '');
      setValue('description', task.description || '');
      setValue('instructions', task.instructions || '');
      setType(task.extra_conditions?.type || 'individual');
      
      // Cargar preguntas si existen
      if (task.extra_conditions?.questions) {
        const questionsText = task.extra_conditions.questions;
        // Split questions by the delimiter "---"
        const questionsArray = questionsText.split(/\s*---\s*/).filter((q: string) => q.trim());
        setQuestions(questionsArray);
      } else {
        setQuestions([]);
      }
      
      if (task.due_date) {
        setDueDate(new Date(task.due_date));
      } else {
        setDueDate(new Date());
      }
    } else {
      // Valores por defecto para una nueva tarea
      resetForm();
    }
  }, [task, visible]);
    // Reset form state
  const resetForm = () => {
    reset({
      title: '',
      description: '',
      instructions: '',
      newQuestion: '',
    });
    setDueDate(new Date());
    setType('individual');
    setQuestions([]);
  };    // Add a new question to the list
  const addQuestion = () => {
    if (newQuestionValue?.trim()) {
      setQuestions([...questions, newQuestionValue.trim()]);
      setValue('newQuestion', '');
    }
  };
  
  // Remove a question from the list
  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };
    // Validar el formulario (no necesario con react-hook-form, pero se mantiene por compatibilidad)
  const validateForm = () => {
    return true; // React Hook Form maneja la validación automáticamente
  };
  
  // Función para actualizar una tarea existente
  const updateTask = async (taskData: any) => {
    try {
      const response = await courseClient.put(`/tasks/${task?.id}`, taskData);
      console.log('Tarea actualizada:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar la tarea:', error);
      throw error;
    }
  };
  
  // Función para crear una nueva tarea
  const createTask = async (taskData: any) => {
    try {
      const response = await courseClient.post('/tasks', taskData);
      console.log('Tarea creada:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error al crear la tarea:', error);
      throw error;
    }
  };
  
  // Mutación para guardar los cambios (crear o actualizar)
  const saveMutation = useMutation({
    mutationFn: (taskData: any) => (task ? updateTask(taskData) : createTask(taskData)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherCourseTasks', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courseTasks', courseId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      onDismiss();
    },
    onError: (error) => {
      console.error('Error al guardar la tarea:', error);
      // Aquí se puede manejar el error de manera más específica
    }
  });

  // Función para manejar el envío del formulario
  const onSubmit = (formData: TaskFormData) => {
    const taskData = {
      title: formData.title,
      description: formData.description,
      instructions: formData.instructions,
      due_date: dueDate.toISOString(),
      course_id: courseId,
      extra_conditions: {
        type,
        // Only include questions if there are any
        ...(questions.length > 0 ? { questions: questions.join("\n---\n") } : {})
      }
    };
    
    saveMutation.mutate(taskData);
  };

  const handleSave = handleSubmit(onSubmit);
  
  // Manejar cambios en el selector de fecha
  const onChangeDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dueDate;
    setShowDatePicker(Platform.OS === 'ios');
    setDueDate(currentDate);
  };
  
  const formatDate = (date: Date) => {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };
  
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <ScrollView>
          <Text style={styles.title}>{task ? 'Editar Tarea' : 'Nueva Tarea'}</Text>
          <Divider style={styles.divider} />
          <Controller
            control={control}
            name="title"
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
          
          <Controller
            control={control}
            name="instructions"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Instrucciones"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (text.trim().length >= 5) {
                    clearErrors("instructions");
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (value && value.trim().length > 0 && value.trim().length < 5) {
                    setError("instructions", {
                      type: "manual",
                      message: "Las instrucciones deben tener al menos 5 caracteres"
                    });
                  }
                }}
                style={[styles.input, !!errors.instructions && styles.inputError]}
                mode="outlined"
                multiline
                numberOfLines={4}
                error={!!errors.instructions}
                right={
                  value && value.trim().length >= 5 ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.instructions && <HelperText type="error">{errors.instructions.message}</HelperText>}
          
          <View style={styles.datePickerContainer}>
            <Text style={styles.label}>Fecha de entrega:</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>{formatDate(dueDate)}</Text>
            </TouchableOpacity>
          </View>
          
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={dueDate}
              mode="date"
              display="default"
              onChange={onChangeDate}
            />
          )}
          
          <View style={styles.checkboxContainer}>
            <Text>Tipo de tarea:</Text>
            <View style={styles.checkboxRow}>
              <Checkbox
                status={type === 'individual' ? 'checked' : 'unchecked'}
                onPress={() => setType('individual')}
              />
              <Text style={styles.checkboxLabel}>Individual</Text>
            </View>
            <View style={styles.checkboxRow}>
              <Checkbox
                status={type === 'grupal' ? 'checked' : 'unchecked'}
                onPress={() => setType('grupal')}
              />
              <Text style={styles.checkboxLabel}>Grupal</Text>
            </View>
          </View>
          
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
              style={[styles.button, styles.cancelButton]}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              loading={saveMutation.isPending}
              disabled={saveMutation.isPending}
            >
              Guardar
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
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
  label: {
    marginBottom: 5,
  },
  datePickerContainer: {
    marginBottom: 15,
  },
  dateButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  checkboxContainer: {
    marginVertical: 15,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  checkboxLabel: {
    marginLeft: 8,
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
  cancelButton: {
    borderColor: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
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
  },
});

export default EditTaskModal;
