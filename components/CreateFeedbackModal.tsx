import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, Divider, HelperText } from 'react-native-paper';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { courseClient } from '@/lib/http';
import { useSession } from '@/contexts/session';
import { Picker } from '@react-native-picker/picker';

// Tipo para el feedback
type Feedback = {
  id: string;
  course_id: string;
  student_id: string | null;
  published_at: string;
  content: string;
  score: number;
};

// Tipo para un curso
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

// Props para el modal
interface CreateFeedbackModalProps {
  visible: boolean;
  onDismiss: () => void;
  onFeedbackCreated: () => void;
}

// Tipo para el formulario
type FeedbackFormData = {
  content: string;
  score: string;
};

const CreateFeedbackModal = ({ visible, onDismiss, onFeedbackCreated }: CreateFeedbackModalProps) => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  
  // React Hook Form
  const { control, handleSubmit, formState: { errors }, setValue, reset, setError, clearErrors } = useForm<FeedbackFormData>({
    defaultValues: {
      content: '',
      score: '5',
    }
  });
  
  // Estados adicionales
  const [selectedCourseId, setSelectedCourseId] = useState('');
    // Obtener lista de cursos del estudiante
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['student-enrolled-courses', session?.userId],
    queryFn: async () => {
      try {
        const response = await courseClient.get(`/courses?user_login=${session?.userId}`);
        console.log('Cursos obtenidos:', response.data);
        
        // Filtrar solo los cursos donde el estudiante está inscrito
        const enrolledCourses = response.data?.response?.filter((course: Course) => 
          course.message === "Enrolled in course"
        ) || [];
        
        console.log('Cursos donde está inscrito:', enrolledCourses);
        return enrolledCourses;
      } catch (error) {
        console.error('Error fetching student courses:', error);
        return [];
      }
    },
    enabled: visible && session?.userType === 'student' && !!session?.userId,
  });
  
  // Función para crear feedback
  const createFeedback = async (feedbackData: any) => {
    try {
      const response = await courseClient.post('/feedback/course', feedbackData);
      console.log('Feedback creado:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error al crear feedback:', error);
      throw error;
    }
  };
  
  // Mutación para crear feedback
  const createMutation = useMutation({
    mutationFn: createFeedback,
    onSuccess: (data) => {
      console.log('Feedback creado exitosamente:', data);
      queryClient.invalidateQueries({ queryKey: ['student-feedbacks'] });
      reset();
      setSelectedCourseId('');
      onFeedbackCreated();
    },
    onError: (error: any) => {
      console.error('Error al crear feedback:', error);
      let errorMessage = 'No se pudo crear el feedback. Inténtelo nuevamente.';
      
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    }
  });
  
  // Función para manejar el envío del formulario
  const onSubmit = (formData: FeedbackFormData) => {
    if (!selectedCourseId) {
      Alert.alert('Error', 'Por favor selecciona un curso.');
      return;
    }
    
    const feedbackData = {
      course_id: selectedCourseId,
      content: formData.content.trim(),
      score: parseInt(formData.score, 10),
    };
    
    console.log('Enviando feedback:', feedbackData);
    createMutation.mutate(feedbackData);
  };
  
  const handleSave = handleSubmit(onSubmit);
  
  // Reset del formulario cuando se cierra el modal
  useEffect(() => {
    if (!visible) {
      reset();
      setSelectedCourseId('');
    }
  }, [visible, reset]);
  
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <ScrollView>
          <Text style={styles.title}>Crear Feedback</Text>
          <Divider style={styles.divider} />
          
          {/* Selector de curso */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Curso *</Text>
            {coursesLoading ? (
              <Text>Cargando cursos...</Text>
            ) : (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedCourseId}
                  onValueChange={(value) => setSelectedCourseId(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecciona un curso" value="" />
                  {courses.map((course: Course) => (
                    <Picker.Item 
                      key={course.course_id} 
                      label={course.course_name} 
                      value={course.course_id} 
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>
          
          {/* Campo de contenido */}
          <Controller
            control={control}
            name="content"
            rules={{
              required: "El contenido del feedback es requerido",
              minLength: {
                value: 10,
                message: "El feedback debe tener al menos 10 caracteres"
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Contenido del Feedback *"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (text.trim().length >= 10) {
                    clearErrors("content");
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (!value || value.trim().length < 10) {
                    setError("content", {
                      type: "manual",
                      message: !value ? "El contenido del feedback es requerido" : "El feedback debe tener al menos 10 caracteres"
                    });
                  }
                }}
                style={[styles.input, !!errors.content && styles.inputError]}
                mode="outlined"
                multiline
                numberOfLines={4}
                error={!!errors.content}
                placeholder="Comparte tu experiencia con este curso..."
                right={
                  value && value.trim().length >= 10 ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.content && <HelperText type="error">{errors.content.message}</HelperText>}
          
          {/* Campo de puntuación */}
          <Controller
            control={control}
            name="score"
            rules={{
              required: "La puntuación es requerida",
              validate: (value) => {
                const num = parseInt(value, 10);
                if (num < 1 || num > 5) return "La puntuación debe ser entre 1 y 5";
                return true;
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Puntuación (1-5) *"
                value={value}
                onChangeText={(text) => {
                  // Solo permitir números del 1 al 5
                  if (/^[1-5]?$/.test(text)) {
                    onChange(text);
                    if (text && parseInt(text, 10) >= 1 && parseInt(text, 10) <= 5) {
                      clearErrors("score");
                    }
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (!value || !value.trim()) {
                    setError("score", {
                      type: "manual",
                      message: "La puntuación es requerida"
                    });
                  } else {
                    const num = parseInt(value, 10);
                    if (num < 1 || num > 5) {
                      setError("score", {
                        type: "manual",
                        message: "La puntuación debe ser entre 1 y 5"
                      });
                    }
                  }
                }}
                style={[styles.input, !!errors.score && styles.inputError]}
                mode="outlined"
                keyboardType="numeric"
                error={!!errors.score}
                placeholder="Puntuación del 1 al 5"
                right={
                  value && /^[1-5]$/.test(value) ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.score && <HelperText type="error">{errors.score.message}</HelperText>}
          
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
              loading={createMutation.isPending}
              disabled={createMutation.isPending || !selectedCourseId}
            >
              Crear Feedback
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
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
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
});

export default CreateFeedbackModal;
