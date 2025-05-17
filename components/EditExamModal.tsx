import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import { Modal, Portal, Text, Title, Button, TextInput, Divider, Switch } from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

// Función para actualizar un examen
const updateExam = async (exam: Exam): Promise<any> => {
  try {
    const response = await courseClient.put(`/exams/${exam.id}`, exam);
    console.log("Examen actualizado exitosamente:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar el examen:', error);
    throw error;
  }
};

const EditExamModal = ({ visible, onDismiss, exam, courseId }: EditExamModalProps) => {
  const queryClient = useQueryClient();
  
  // Estados para los campos del formulario
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [examDate, setExamDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [openBook, setOpenBook] = useState(false);
  const [gracePeriod, setGracePeriod] = useState("");
  const [submissionRules, setSubmissionRules] = useState("");
  
  // Estado para manejar el botón de guardar
  const [isSaving, setIsSaving] = useState(false);

  // Actualizar los estados cuando el examen cambia
  useEffect(() => {
    if (exam) {
      setTitle(exam.title);
      setDescription(exam.description);
      setExamDate(new Date(exam.date));
      setDuration(exam.duration.toString());
      setLocation(exam.location);
      setOpenBook(exam.additional_info?.open_book || false);
      setGracePeriod(exam.additional_info?.grace_period || "");
      setSubmissionRules(exam.additional_info?.submission_rules || "");
    }
  }, [exam]);

  // Mutación para actualizar el examen
  const updateMutation = useMutation({
    mutationFn: updateExam,
    onMutate: () => {
      setIsSaving(true);
    },
    onSuccess: () => {
      // Invalidar consultas para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['teacherCourseExams', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courseExams', courseId] });
      
      setIsSaving(false);
      Alert.alert("Éxito", "El examen ha sido actualizado exitosamente.");
      onDismiss();
    },
    onError: (error) => {
      console.error("Error al actualizar examen:", error);
      Alert.alert("Error", "No se pudo actualizar el examen. Inténtelo nuevamente.");
      setIsSaving(false);
    }
  });

  // Manejar el cambio de fecha
  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || examDate;
    setShowDatePicker(false);
    setExamDate(currentDate);
  };

  // Manejar el guardado del examen
  const handleSaveExam = () => {
    if (!exam) return;
    
    // Validar campos obligatorios
    if (!title.trim() || !description.trim() || !duration || !location.trim()) {
      Alert.alert("Error", "Por favor complete todos los campos obligatorios.");
      return;
    }

    // Crear el objeto de examen actualizado
    const updatedExam: Exam = {
      ...exam,
      title: title.trim(),
      description: description.trim(),
      date: examDate.toISOString(),
      duration: parseInt(duration, 10),
      location: location.trim(),
      additional_info: {
        open_book: openBook,
        grace_period: gracePeriod.trim() || undefined,
        submission_rules: submissionRules.trim() || undefined
      }
    };

    // Ejecutar la mutación
    updateMutation.mutate(updatedExam);
  };

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

          <TextInput
            label="Título *"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Descripción *"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

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

          <TextInput
            label="Duración en minutos *"
            value={duration}
            onChangeText={text => {
              // Solo permitir números
              if (/^\d*$/.test(text)) {
                setDuration(text);
              }
            }}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />

          <TextInput
            label="Ubicación *"
            value={location}
            onChangeText={setLocation}
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.switchContainer}>
            <Text>Libro abierto</Text>
            <Switch value={openBook} onValueChange={setOpenBook} />
          </View>

          <TextInput
            label="Tiempo de tolerancia (minutos)"
            value={gracePeriod}
            onChangeText={text => {
              // Solo permitir números
              if (/^\d*$/.test(text)) {
                setGracePeriod(text);
              }
            }}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />

          <TextInput
            label="Reglas de entrega"
            value={submissionRules}
            onChangeText={setSubmissionRules}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

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
  }
});

export default EditExamModal;
