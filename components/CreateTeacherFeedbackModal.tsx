import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, Divider, HelperText } from 'react-native-paper';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { courseClient } from '@/lib/http';
import { useSession } from '@/contexts/session';
import { Picker } from '@react-native-picker/picker';

// Tipo para un curso
type Course = {
  course_id: string;
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  category: string | null;
};

// Tipo para un estudiante
type Student = {
  id: string;
  email: string;
  name?: string;
};

// Props para el modal
interface CreateTeacherFeedbackModalProps {
  visible: boolean;
  onDismiss: () => void;
  onFeedbackCreated: () => void;
}

// Tipo para el formulario
type TeacherFeedbackFormData = {
  comment: string;
  rating: string;
};

const CreateTeacherFeedbackModal = ({ visible, onDismiss, onFeedbackCreated }: CreateTeacherFeedbackModalProps) => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  
  // React Hook Form
  const { control, handleSubmit, formState: { errors }, reset, setError, clearErrors } = useForm<TeacherFeedbackFormData>({
    defaultValues: {
      comment: '',
      rating: '5',
    }
  });
  
  // Estados adicionales
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
    // Obtener lista de cursos del teacher
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['teacher-courses', session?.userId],
    queryFn: async () => {
      try {
        // Primero obtenemos la lista básica de cursos
        const response = await courseClient.get(`/courses`, {
          headers: {
            'Authorization': `Bearer ${session?.token}`,
          }
        });
        console.log('Cursos básicos del teacher:', response.data);
        
        const allCourses = response.data?.response || [];
        
        // Ahora filtraremos los cursos donde el teacher actual es el instructor
        const teacherCourses = [];
        
        for (const course of allCourses) {
          try {
            console.log(course.course_id);
            // Hacer GET para obtener detalles del curso
            const courseDetailResponse = await courseClient.get(`/courses/${course.course_id}`, {
              headers: {
                'Authorization': `Bearer ${session?.token}`,
              }
            });
            
            const courseDetail = courseDetailResponse.data?.response;
            console.log(`Detalles del curso ${course.course_id}:`, courseDetail);
              // Verificar si el teacher actual es el instructor de este curso
              
            if (courseDetail && courseDetail.teacher === session?.email) {
              teacherCourses.push(course);
            }
          } catch (error) {
            console.error(`Error obteniendo detalles del curso ${course.course_id}:`, error);
          }
        }
        
        console.log('Cursos donde soy instructor:', teacherCourses);
        return teacherCourses;
      } catch (error) {
        console.error('Error fetching teacher courses:', error);
        return [];
      }
    },
    enabled: visible && session?.userType === 'teacher' && !!session?.userId && !!session?.email,
  });
    // Obtener lista de estudiantes del curso seleccionado
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['course-students', selectedCourseId],
    queryFn: async () => {
      try {
        if (!selectedCourseId) return [];
        
        // TODO: Implementar endpoint real para obtener estudiantes de un curso
        // Por ahora, retornamos datos mock basados en IDs reales
        const mockStudents = [
          { 
            id: '3b5d4062-95d0-4a36-b7a1-80ba09525093', 
            email: 'estudiante1@correo.com', 
            name: 'Ana García'
          },
          { 
            id: '2a4c3051-84c0-3a25-a6a0-79ab08414082', 
            email: 'estudiante2@correo.com', 
            name: 'Carlos López'
          },
          { 
            id: '1c2b3052-73b0-2a15-a5a0-68aa07313071', 
            email: 'estudiante3@correo.com', 
            name: 'María Rodríguez'
          },
        ];
        
        console.log('Estudiantes del curso:', mockStudents);
        return mockStudents;
      } catch (error) {
        console.error('Error fetching course students:', error);
        return [];
      }
    },
    enabled: !!selectedCourseId,
  });
  
  // Función para crear feedback
  const createFeedback = async (feedbackData: any) => {
    try {
      const response = await courseClient.post('/feedback/student', feedbackData, {
        headers: {
          'Authorization': `Bearer ${session?.token}`,
          'Content-Type': 'application/json',
        }
      });
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
      queryClient.invalidateQueries({ queryKey: ['teacher-feedbacks'] });
      reset();
      setSelectedCourseId('');
      setSelectedStudentId('');
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
  const onSubmit = (formData: TeacherFeedbackFormData) => {
    if (!selectedCourseId) {
      Alert.alert('Error', 'Por favor selecciona un curso.');
      return;
    }
    
    if (!selectedStudentId) {
      Alert.alert('Error', 'Por favor selecciona un estudiante.');
      return;
    }
    
    const feedbackData = {
      course_id: selectedCourseId,
      student_reviewed: selectedStudentId,
      rating: parseInt(formData.rating, 10),
      comment: formData.comment.trim(),
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
      setSelectedStudentId('');
    }
  }, [visible, reset]);
  
  // Reset de estudiante cuando cambia el curso
  useEffect(() => {
    setSelectedStudentId('');
  }, [selectedCourseId]);
  
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <ScrollView>
          <Text style={styles.title}>Crear Feedback para Estudiante</Text>
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
          
          {/* Selector de estudiante */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Estudiante *</Text>
            {studentsLoading ? (
              <Text>Cargando estudiantes...</Text>
            ) : selectedCourseId ? (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedStudentId}
                  onValueChange={(value) => setSelectedStudentId(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecciona un estudiante" value="" />
                  {students.map((student: Student) => (
                    <Picker.Item 
                      key={student.id} 
                      label={student.name || student.email} 
                      value={student.id} 
                    />
                  ))}
                </Picker>
              </View>
            ) : (
              <Text style={styles.helperText}>Primero selecciona un curso</Text>
            )}
          </View>
          
          {/* Campo de comentario */}
          <Controller
            control={control}
            name="comment"
            rules={{
              required: "El comentario es requerido",
              minLength: {
                value: 10,
                message: "El comentario debe tener al menos 10 caracteres"
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Comentario *"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (text.trim().length >= 10) {
                    clearErrors("comment");
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (!value || value.trim().length < 10) {
                    setError("comment", {
                      type: "manual",
                      message: !value ? "El comentario es requerido" : "El comentario debe tener al menos 10 caracteres"
                    });
                  }
                }}
                style={[styles.input, !!errors.comment && styles.inputError]}
                mode="outlined"
                multiline
                numberOfLines={4}
                error={!!errors.comment}
                placeholder="Escribe tu feedback para el estudiante..."
                right={
                  value && value.trim().length >= 10 ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.comment && <HelperText type="error">{errors.comment.message}</HelperText>}
          
          {/* Campo de calificación */}
          <Controller
            control={control}
            name="rating"
            rules={{
              required: "La calificación es requerida",
              validate: (value) => {
                const num = parseInt(value, 10);
                if (num < 1 || num > 5) return "La calificación debe ser entre 1 y 5";
                return true;
              }
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Calificación (1-5) *"
                value={value}
                onChangeText={(text) => {
                  // Solo permitir números del 1 al 5
                  if (/^[1-5]?$/.test(text)) {
                    onChange(text);
                    if (text && parseInt(text, 10) >= 1 && parseInt(text, 10) <= 5) {
                      clearErrors("rating");
                    }
                  }
                }}
                onBlur={() => {
                  onBlur();
                  if (!value || !value.trim()) {
                    setError("rating", {
                      type: "manual",
                      message: "La calificación es requerida"
                    });
                  } else {
                    const num = parseInt(value, 10);
                    if (num < 1 || num > 5) {
                      setError("rating", {
                        type: "manual",
                        message: "La calificación debe ser entre 1 y 5"
                      });
                    }
                  }
                }}
                style={[styles.input, !!errors.rating && styles.inputError]}
                mode="outlined"
                keyboardType="numeric"
                error={!!errors.rating}
                placeholder="Calificación del 1 al 5"
                right={
                  value && /^[1-5]$/.test(value) ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
              />
            )}
          />
          {errors.rating && <HelperText type="error">{errors.rating.message}</HelperText>}
          
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
              disabled={createMutation.isPending || !selectedCourseId || !selectedStudentId}
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
  helperText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
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

export default CreateTeacherFeedbackModal;
