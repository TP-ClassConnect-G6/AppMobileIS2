import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, Checkbox, Divider, HelperText } from 'react-native-paper';
import { useQueryClient, useMutation } from '@tanstack/react-query';
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

const EditTaskModal = ({ visible, onDismiss, task, courseId }: EditTaskModalProps) => {
  const queryClient = useQueryClient();
  
  // Estado del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [type, setType] = useState('individual'); // individual o grupal
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Estado para errores
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [dueDateError, setDueDateError] = useState('');
  
  // Inicializar el formulario cuando se abre el modal con una tarea
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setInstructions(task.instructions || '');
      setType(task.extra_conditions?.type || 'individual');
      
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
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInstructions('');
    setDueDate(new Date());
    setType('individual');
    setTitleError('');
    setDescriptionError('');
    setDueDateError('');
  };
  
  // Validar el formulario
  const validateForm = () => {
    let isValid = true;
    
    if (!title.trim()) {
      setTitleError('El título es obligatorio');
      isValid = false;
    } else {
      setTitleError('');
    }
    
    if (!description.trim()) {
      setDescriptionError('La descripción es obligatoria');
      isValid = false;
    } else {
      setDescriptionError('');
    }
    
    return isValid;
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
      onDismiss();
    },
    onError: (error) => {
      console.error('Error al guardar la tarea:', error);
      // Aquí se puede manejar el error de manera más específica
    }
  });
  
  const handleSave = () => {
    if (!validateForm()) return;
    
    const taskData = {
      title,
      description,
      instructions,
      due_date: dueDate.toISOString(),
      course_id: courseId,
      extra_conditions: {
        type
      }
    };
    
    saveMutation.mutate(taskData);
  };
  
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
          
          <TextInput
            label="Título"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
            error={!!titleError}
          />
          {titleError ? <HelperText type="error">{titleError}</HelperText> : null}
          
          <TextInput
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            error={!!descriptionError}
          />
          {descriptionError ? <HelperText type="error">{descriptionError}</HelperText> : null}
          
          <TextInput
            label="Instrucciones"
            value={instructions}
            onChangeText={setInstructions}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
          />
          
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
});

export default EditTaskModal;
