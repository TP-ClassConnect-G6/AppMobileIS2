import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity } from "react-native";
import { Button, TextInput, Text, Card, Title, HelperText, Divider } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";
import { format } from "date-fns";
import { router } from "expo-router";
import jwtDecode from "jwt-decode";
import { Picker } from '@react-native-picker/picker';

// Definición del tipo para la solicitud de creación de tarea
type CreateTaskRequest = {
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  instructions: string;
  extra_conditions: {
    type: string;
    questions?: string;
  };
  user_id: string;
};

// Respuesta del servidor al crear una tarea
type CreateTaskResponse = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  user_id: string;
  instructions: string;
  extra_conditions: {
    type: string;
    questions?: string;
  };
};

// Tipo para la lista de cursos
type CourseItem = {
  course_id: string;
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  category?: string;
  message?: string;
};

// Esquema de validación con Zod
const createTaskSchema = z.object({
  course_id: z.string().nonempty("Debe seleccionar un curso"),
  title: z.string().min(3, "El título debe tener al menos 3 caracteres").nonempty("El título es obligatorio"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres").nonempty("La descripción es obligatoria"),  
  due_date: z.string()
    .nonempty("La fecha de entrega es obligatoria")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato debe ser YYYY-MM-DD")
    .refine(val => !isNaN(new Date(val).getTime()), "Fecha inválida")
    .refine(val => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Inicio del día
      const selectedDate = new Date(val);
      return selectedDate >= today;
    }, "La fecha de entrega no puede ser anterior a hoy"),
  instructions: z.string().min(10, "Las instrucciones deben tener al menos 10 caracteres").nonempty("Las instrucciones son obligatorias"),
  questionsList: z.array(z.string()).min(1, "Debe ingresar al menos una pregunta"),
  task_type: z.enum(["individual", "group"], {
    errorMap: () => ({ message: "Debe seleccionar un tipo de tarea" })
  }),
});

type FormValues = z.infer<typeof createTaskSchema>;

export default function CreateTaskScreen() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [dueDate, setDueDate] = useState(new Date());
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  // Configurar React Hook Form con validación Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<FormValues>({
    defaultValues: {
      course_id: "",
      title: "",
      description: "",
      due_date: format(dueDate, "yyyy-MM-dd"),
      instructions: "",
      task_type: "individual",
      questionsList: []
    },
  });

  // Cargar los cursos cuando se monta el componente
  useEffect(() => {
    fetchCourses();
  }, []);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Función para obtener los cursos del profesor
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const response = await courseClient.get("/courses");
      if (response.data && Array.isArray(response.data.response)) {
        setCourses(response.data.response);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error("Error al cargar los cursos:", error);
      Alert.alert("Error", "No se pudieron cargar los cursos");
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  // Función para crear una nueva tarea
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    
    try {
      // Verificar si el usuario está autenticado
      if (!session) {
        Alert.alert("Error", "Necesitas iniciar sesión");
        return;
      }

      // Extraer el email del token JWT
      let userId = "";
      try {
        const decodedToken: any = jwtDecode(session.token);
        userId = decodedToken.sub || decodedToken.id || "";
        console.log("ID de usuario extraído del token:", userId);
      } catch (error) {
        console.error("Error al decodificar token:", error);
      }

      // Verificar que tenemos un ID de usuario válido
      if (!userId) {
        Alert.alert("Error", "No se pudo obtener la información del usuario");
        return;
      }      // Preparar la solicitud
      const request: CreateTaskRequest = {
        course_id: data.course_id,
        title: data.title,
        description: data.description,
        due_date: data.due_date,
        instructions: data.instructions,
        extra_conditions: {
          type: data.task_type,
          questions: questions.length > 0 ? questions.join("\n\n---\n\n") : undefined
        },
        user_id: userId
      };

      console.log("Enviando solicitud:", request);

      // Enviar la solicitud al servidor
      const response = await courseClient.post("/tasks", request);
      console.log("Respuesta:", response.data);
      
      // Mostrar mensaje de éxito
      Alert.alert(
        "Éxito",
        `Tarea "${data.title}" creada exitosamente`,
        [{ text: "OK", onPress: () => {
          reset(); // Resetear el formulario
          router.push("/(tabs)/course-list"); // Redirigir a la lista de cursos
        }}]
      );
    } catch (error: any) {
      //console.error("Error al crear la tarea:", error);
      
      // Manejar diferentes tipos de errores
      if (error.response) {
        const status = error.response.status;
        let message = "Error al crear la tarea";
        
        switch (status) {
          case 400:
            message = "Datos incorrectos o incompletos. Por favor, verifica todos los campos.";
            break;
          case 403:
            message = "No tienes permisos para crear tareas";
            break;
          case 404:
            message = "Curso no encontrado";
            break;
          default:
            message = `Error del servidor: ${error.response.data?.message || "Error desconocido"}`;
        }

        Alert.alert("Error", message);
      } else {
        Alert.alert("Error", "No se pudo conectar con el servidor. Verifica tu conexión");
      }
    } finally {
      setLoading(false);
    }
  };
  // Función para manejar selección de fecha manualmente
  const handleDateManualInput = (value: string) => {
    setDueDate(new Date(value));
  };

  // Función para formatear la fecha para mostrarla
  const formatDate = (date: Date): string => {
    return format(date, "yyyy-MM-dd");
  };  
  // Función para agregar una nueva pregunta
  const addQuestion = () => {
    if (currentQuestion.trim().length === 0) {
      Alert.alert("Validación", "La pregunta no puede estar vacía");
      return;
    }
    
    const updatedQuestions = [...questions, currentQuestion.trim()];
    setQuestions(updatedQuestions);
    setValue('questionsList', updatedQuestions);
    setCurrentQuestion("");
  };

  // Función para eliminar una pregunta
  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    setValue('questionsList', updatedQuestions);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Crear Nueva Tarea</Title>
          
          {/* Mensaje de error global */}
          {Object.keys(errors).length > 0 && (
            <View style={styles.errorSummary}>
              <Text style={styles.errorSummaryText}>
                Por favor completa todos los campos obligatorios (marcados con *)
              </Text>
            </View>
          )}
            {/* Selector de curso */}
          <Text style={styles.sectionTitle}>Curso *</Text>
          {loadingCourses ? (
            <View style={styles.loadingContainer}>
              <Text>Cargando cursos...</Text>
            </View>
          ) : courses.length === 0 ? (
            <View style={styles.noCourseContainer}>
              <Text style={styles.noCourseText}>No hay cursos disponibles</Text>
              <Button mode="outlined" onPress={fetchCourses} style={styles.refreshButton}>
                Refrescar
              </Button>
            </View>
          ) : (
            <Controller
              control={control}
              name="course_id"
              render={({ field: { onChange, value } }) => (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={value}
                    onValueChange={(itemValue) => onChange(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Selecciona un curso" value="" />
                    {courses.map((course) => (
                      <Picker.Item
                        key={course.course_id}
                        label={course.course_name}
                        value={course.course_id}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            />
          )}
          {errors.course_id && (
            <HelperText type="error">{errors.course_id.message}</HelperText>
          )}
          
          {/* Título */}
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Título de la tarea *"
                value={value}
                onChangeText={onChange}
                style={styles.input}
                error={!!errors.title}
              />
            )}
          />
          {errors.title && (
            <HelperText type="error">{errors.title.message}</HelperText>
          )}
          
          {/* Descripción */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Descripción *"
                value={value}
                onChangeText={onChange}
                style={styles.input}
                multiline
                numberOfLines={3}
                error={!!errors.description}
              />
            )}
          />
          {errors.description && (
            <HelperText type="error">{errors.description.message}</HelperText>
          )}
          
          {/* Fecha de entrega */}
          <Controller
            control={control}
            name="due_date"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Fecha de entrega (YYYY-MM-DD) *"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  handleDateManualInput(text);
                }}
                style={styles.input}
                error={!!errors.due_date}
                placeholder="YYYY-MM-DD"
              />
            )}
          />
          {errors.due_date && (
            <HelperText type="error">{errors.due_date.message}</HelperText>
          )}
          {/* <HelperText type="info">Formato de fecha: YYYY-MM-DD (Año-Mes-Día)</HelperText> */}
          
          {/* Instrucciones */}
          <Controller
            control={control}
            name="instructions"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Instrucciones *"
                value={value}
                onChangeText={onChange}
                style={styles.input}
                multiline
                numberOfLines={4}
                error={!!errors.instructions}
              />
            )}
          />
          {errors.instructions && (
            <HelperText type="error">{errors.instructions.message}</HelperText>
          )}
          
          {/* Tipo de tarea */}
          <Text style={styles.sectionTitle}>Tipo de Tarea *</Text>
          <Controller
            control={control}
            name="task_type"
            render={({ field: { onChange, value } }) => (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={value}
                  onValueChange={(itemValue) => onChange(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Individual" value="individual" />
                  <Picker.Item label="Grupal" value="group" />
                </Picker>
              </View>
            )}
          />
          {errors.task_type && (
            <HelperText type="error">{errors.task_type.message}</HelperText>
          )}
          
          <Divider style={styles.divider} />
          
          {/* Preguntas adicionales */}
          <Text style={styles.sectionTitle}>Preguntas Adicionales</Text>
          <View style={styles.questionsContainer}>
            {questions.map((question, index) => (
              <View key={index} style={styles.questionItem}>
                <TextInput
                  label={`Pregunta ${index + 1}`}
                  value={question}
                  onChangeText={(text) => {
                    const updatedQuestions = [...questions];
                    updatedQuestions[index] = text;
                    setQuestions(updatedQuestions);
                  }}
                  style={styles.questionInput}
                  error={false}
                />
                <TouchableOpacity
                  onPress={() => removeQuestion(index)}
                  style={styles.removeQuestionButton}
                >
                  <Text style={styles.removeQuestionButtonText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>          
          <View style={styles.addQuestionContainer}>
            <TextInput
              label="Nueva pregunta"
              value={currentQuestion}
              onChangeText={setCurrentQuestion}
              style={styles.addQuestionInput}
              multiline
              numberOfLines={3}
              error={!!errors.questionsList}
            />            
            <Button 
              mode="contained" 
              onPress={addQuestion}
              style={styles.addQuestionButton}
              icon="plus"
            >
              Agregar Pregunta
            </Button>
          </View>
          {errors.questionsList && (
            <HelperText type="error">{errors.questionsList.message}</HelperText>
          )}
          <Divider style={styles.divider} />
          
          {/* Botones de acción */}
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              onPress={() => reset()}
              style={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </Button>
            
            <Button 
              mode="contained" 
              onPress={handleSubmit(onSubmit)}
              style={styles.submitButton}
              loading={loading}
              disabled={loading}
            >
              Crear Tarea
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
    backgroundColor: "#f5f5f5",
  },
  card: {
    marginTop: 20,
    elevation: 4,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 22,
    fontWeight: "bold",
  },
  errorSummary: {
    backgroundColor: "#FFEBEE",
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#F44336",
  },
  errorSummaryText: {
    color: "#D32F2F",
    fontSize: 14,
    fontWeight: "bold",
  },
  loadingContainer: {
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
    marginBottom: 15,
  },
  noCourseContainer: {
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
    marginBottom: 15,
  },
  noCourseText: {
    marginBottom: 10,
    color: "#666",
  },
  refreshButton: {
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 15,
    backgroundColor: "white",
  },
  picker: {
    height: 50,
  },
  input: {
    marginBottom: 15,
    backgroundColor: "white",
  },
  divider: {
    marginVertical: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },
  submitButton: {
    flex: 1,
    marginLeft: 10,
  },
  questionsContainer: {
    marginBottom: 15,
  },
  questionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  questionInput: {
    flex: 1,
    marginRight: 10,
    backgroundColor: "white",
  },
  removeQuestionButton: {
    backgroundColor: "#F44336",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  removeQuestionButtonText: {
    color: "white",
    fontWeight: "bold",
  },  addQuestionContainer: {
    marginBottom: 15,
  },
  addQuestionInput: {
    backgroundColor: "white",
    marginBottom: 10,
    textAlignVertical: "top",
  },
  addQuestionButton: {
    width: '100%',
    marginTop: 5,
  },
});
