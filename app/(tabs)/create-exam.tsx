import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, Switch, Text as RNText } from "react-native";
import { Button, TextInput, Text, Card, Title, HelperText, Divider } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";
import { format } from "date-fns";
import { router } from "expo-router";
import jwtDecode from "jwt-decode";
import { Picker } from '@react-native-picker/picker';

// Definición del tipo para la solicitud de creación de examen
type CreateExamRequest = {
  course_id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  location: string;
  additional_info: {
    open_book: boolean;
    grace_period?: string;
    submission_rules?: string;
    questions?: string;
  };
  user_id: string;
  published: boolean;
};

// Respuesta del servidor al crear un examen
type CreateExamResponse = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  location: string;
  additional_info: {
    [key: string]: any;
  };
  user_id: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
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
const createExamSchema = z.object({
  course_id: z.string().min(1, "El curso es requerido"),
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().min(10, "Las instrucciones generales deben tener al menos 10 caracteres"),
  questionsList: z.array(z.string()).min(1, "Debe ingresar al menos una pregunta"),
  date: z.string()
    .min(1, "La fecha es requerida")
    .regex(/^\d{2}\/\d{2}\/\d{2,4}$/, "El formato debe ser DD/MM/YY"),
  duration: z.string().min(1, "La duración es requerida"),
  location: z.string()
    .min(1, "El número de aula es requerido")
    .regex(/^\d+$/, "Solo debe ingresar números")
    .refine(
      (value) => parseInt(value) > 0,
      "El número de aula debe ser positivo"
    ),
  open_book: z.boolean(),
  grace_period: z.string().optional(),
  submission_rules: z.string().optional(),
});

type FormValues = z.infer<typeof createExamSchema>;

export default function CreateExamScreen() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [fetchingCourses, setFetchingCourses] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);

  // Verificar si el usuario es profesor
  const isTeacher = session?.userType === "teacher" || session?.userType === "admin" || session?.userType === "administrator";
  
  // Redireccionar si no es un profesor
  useEffect(() => {
    if (session && !isTeacher) {
      Alert.alert("Acceso denegado", "Solo los profesores pueden crear exámenes", [
        { text: "OK", onPress: () => router.replace("/(tabs)/course-list") }
      ]);
    }
  }, [session, isTeacher]);

  // Función para convertir fecha de formato DD/MM/YY a YYYY-MM-DD (para API)
  const convertToAPIDateFormat = (dateStr: string): string => {
    try {
      // Dividir la fecha en partes (día, mes, año)
      const parts = dateStr.split('/');
      if (parts.length !== 3) return dateStr;
      
      const day = parts[0];
      const month = parts[1];
      let year = parts[2];
      
      // Asegurar que el año tiene 4 dígitos
      if (year.length === 2) {
        year = `20${year}`;
      }
      
      // Crear formato YYYY-MM-DD
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error al convertir formato de fecha:", error);
      return dateStr;
    }
  };

  // Función para convertir fecha de formato YYYY-MM-DD a DD/MM/YY (para UI)
  const convertToUIDateFormat = (dateStr: string): string => {
    try {
      // Crear objeto Date desde la fecha en formato YYYY-MM-DD
      const date = new Date(dateStr);
      // Formatear a DD/MM/YY
      return format(date, "dd/MM/yy");
    } catch (error) {
      console.error("Error al convertir formato de fecha:", error);
      return dateStr;
    }
  };  // Configurar React Hook Form con validación Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      course_id: "",
      title: "",
      description: "",
      questionsList: [],
      date: format(new Date(), "dd/MM/yy"), // Formato para UI: DD/MM/YY
      duration: "120",
      location: "",
      open_book: false,
      grace_period: "",
      submission_rules: "",
    },
  });

  // Función para cargar la lista de cursos disponibles
  const fetchCourses = async () => {
    try {
      setFetchingCourses(true);
      const response = await courseClient.get('/courses');
      console.log("Respuesta del API:", response.data);
      
      // Extraer cursos según la estructura de la respuesta
      if (response.data && response.data.response && Array.isArray(response.data.response)) {
        // Nueva estructura: cursos dentro de "response"
        setCourses(response.data.response);
      } else if (response.data && Array.isArray(response.data)) {
        // Estructura alternativa: array directamente en data
        setCourses(response.data);
      } else if (response.data && response.data.courses && Array.isArray(response.data.courses)) {
        // Estructura anterior: cursos dentro de "courses"
        setCourses(response.data.courses);
      } else {
        console.warn("Formato de respuesta no reconocido:", response.data);
        setCourses([]);
      }
    } catch (error) {
      console.error("Error al cargar los cursos:", error);
      Alert.alert("Error", "No se pudieron cargar los cursos disponibles");
    } finally {
      setFetchingCourses(false);
    }
  };
  // Cargar los cursos al montar el componente
  useEffect(() => {
    fetchCourses();
  }, []);

  // Funciones para manejar las preguntas
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

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    setValue('questionsList', updatedQuestions);
  };

  // Función para crear un nuevo examen
  const onSubmit = async (data: FormValues) => {
    setLoading(true);

    // Comprobar si el usuario está autenticado
    if (!session) {
      Alert.alert("Error", "Necesitas iniciar sesión");
      setLoading(false);
      return;
    }

    try {
      // Extraer el id del usuario del token JWT
      let userId = "";
      try {
        const decodedToken: any = jwtDecode(session.token);
        userId = decodedToken.sub || decodedToken.id || decodedToken.user_id || "";
        console.log("ID de usuario extraído del token:", userId);
      } catch (error) {
        console.error("Error al decodificar token:", error);
      }

      // Verificar que tenemos un ID de usuario válido
      if (!userId) {
        userId = "user-uuid"; // ID de usuario por defecto si no se puede extraer del token
        console.warn("No se pudo obtener el ID del usuario del token, usando valor por defecto");
      }

      // Preparar la solicitud - convertir la fecha de DD/MM/YY a YYYY-MM-DD para el API
      // Verificar que el usuario sea profesor
      if (!isTeacher) {
        Alert.alert("Error", "Solo los profesores pueden crear exámenes");
        setLoading(false);
        return;
      }      const request: CreateExamRequest = {
        course_id: data.course_id,
        title: data.title,
        description: data.description,
        date: convertToAPIDateFormat(data.date), // Convertir la fecha al formato esperado por el API
        duration: parseInt(data.duration),
        location: `Aula ${data.location}`, // Agregar el prefijo "Aula" al número
        additional_info: {
          open_book: data.open_book,
          grace_period: data.grace_period || "",
          submission_rules: data.submission_rules || "",
          questions: data.questionsList.join("\n\n---\n\n"), // Convertir el array de preguntas a formato de texto
        },
        user_id: userId,
        published: false // Los exámenes se crean como no publicados por defecto
      };

      console.log("Enviando solicitud:", request);

      // Enviar la solicitud al servidor
      const response = await courseClient.post("/exams", request);
      console.log("Respuesta:", response.data);
      
      // Obtener los datos del examen creado
      const examData: CreateExamResponse = response.data;
      
      // La fecha ya viene en formato API (YYYY-MM-DD), la convertimos a formato amigable DD/MM/YYYY
      const examDate = new Date(examData.date);
      const formattedDate = format(examDate, "dd/MM/yyyy");
      
      // Encontrar el nombre del curso
      const courseName = courses.find(c => c.course_id === data.course_id)?.course_name || "el curso seleccionado";
      
      // Preparar información adicional para el mensaje de éxito
      let successMessage = `"${examData.title}" para ${courseName} ha sido creado exitosamente.\n\nFecha: ${formattedDate}\nDuración: ${examData.duration} minutos\nUbicación: ${examData.location}`;
      
      // Agregar información de tiempo de tolerancia si fue proporcionada
      if (data.grace_period && data.grace_period.trim() !== "") {
        successMessage += `\nTiempo de tolerancia: ${data.grace_period} minutos`;
      }
      
      // Agregar información de reglas de entrega si fueron proporcionadas
      if (data.submission_rules && data.submission_rules.trim() !== "") {
        successMessage += `\nReglas de entrega: ${data.submission_rules}`;
      }
      
      // Mostrar mensaje de éxito con todos los detalles
      Alert.alert(
        "Examen Creado",
        successMessage,
        [{ text: "OK", onPress: () => {
          reset(); // Resetear el formulario
          router.push("/(tabs)/course-list"); // Redirigir a la lista de cursos
        }}]
      );
    } catch (error: any) {
      console.error("Error al crear el examen:", error);
      
      // Manejar diferentes tipos de errores
      if (error.response) {
        // El servidor respondió con un código de error
        const status = error.response.status;
        let message = "Error al crear el examen";

        switch (status) {
          case 400:
            message = "Faltan datos requeridos";
            break;
          case 403:
            message = "No tienes permisos para crear exámenes";
            break;
          case 404:
            message = "Curso no encontrado";
            break;
          default:
            message = `Error del servidor: ${error.response.data?.message || "Error desconocido"}`;
        }

        Alert.alert("Error", message);
      } else {
        // Error de red o de cliente
        Alert.alert("Error", "No se pudo conectar con el servidor. Verifica tu conexión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Crear Nuevo Examen</Title>
          
          {/* Selector de Curso */}
          <Text style={styles.sectionTitle}>Curso *</Text>
          <Controller
            control={control}
            name="course_id"
            render={({ field: { onChange, value } }) => (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={value}
                  onValueChange={onChange}
                  style={styles.picker}
                  enabled={!fetchingCourses}
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
          {errors.course_id && (
            <HelperText type="error">{errors.course_id.message}</HelperText>
          )}

          {/* Título del examen */}
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Título del Examen *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                error={!!errors.title}
              />
            )}
          />
          {errors.title && (
            <HelperText type="error">{errors.title.message}</HelperText>
          )}          {/* Descripción e Instrucciones Generales */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Instrucciones Generales *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                multiline
                numberOfLines={3}
                error={!!errors.description}
                placeholder="Instrucciones generales del examen"
              />
            )}
          />
          {errors.description && (
            <HelperText type="error">{errors.description.message}</HelperText>
          )}
          
          {/* Preguntas del Examen */}
          <Text style={styles.sectionTitle}>Preguntas del Examen</Text>
          
          {/* Lista de preguntas ya agregadas */}
          {questions.length > 0 ? (
            <View style={styles.questionsList}>
              {questions.map((question, index) => (
                <View key={index} style={styles.questionItem}>
                  <View style={styles.questionNumberContainer}>
                    <Text style={styles.questionNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.questionTextContainer}>
                    <Text style={styles.questionText}>{question}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => removeQuestion(index)}
                    style={styles.removeQuestionButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noQuestionsContainer}>
              <Text style={styles.noQuestionsText}>Aún no hay preguntas agregadas</Text>
            </View>
          )}
          
          {/* Error de validación para preguntas */}
          {errors.questionsList && (
            <HelperText type="error">{errors.questionsList.message}</HelperText>
          )}
          
          {/* Campo para agregar nueva pregunta */}
          <View style={styles.addQuestionContainer}>
            <TextInput
              label="Nueva pregunta"
              value={currentQuestion}
              onChangeText={setCurrentQuestion}
              style={styles.questionInput}
              multiline
              numberOfLines={3}
              placeholder="Escribe aquí la pregunta..."
            />
            <Button 
              mode="contained" 
              onPress={addQuestion}
              style={styles.addQuestionButton}
              icon="plus"
            >
              Agregar
            </Button>
          </View>
          <HelperText type="info">
            Agregue las preguntas una por una usando el botón Agregar.
          </HelperText>

          {/* Fecha del examen */}
          <Controller
            control={control}
            name="date"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Fecha del Examen (DD/MM/YY) *"
                value={value}
                onChangeText={onChange}
                style={styles.input}
                error={!!errors.date}
                placeholder="DD/MM/YY"
              />
            )}
          />
          {errors.date && (
            <HelperText type="error">{errors.date.message}</HelperText>
          )}
          <HelperText type="info">Formato: día/mes/año (DD/MM/YY). Ejemplo: 01/06/25</HelperText>

          {/* Duración */}
          <Controller
            control={control}
            name="duration"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Duración (minutos) *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                keyboardType="numeric"
                error={!!errors.duration}
              />
            )}
          />
          {errors.duration && (
            <HelperText type="error">{errors.duration.message}</HelperText>
          )}

          {/* Ubicación */}
          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Número de Aula *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                keyboardType="numeric"
                error={!!errors.location}
                placeholder="Ej: 101"
              />
            )}
          />
          {errors.location && (
            <HelperText type="error">{errors.location.message}</HelperText>
          )}
          <HelperText type="info">
            Ingrese solo el número del aula donde se realizará el examen
          </HelperText>

          <Divider style={styles.divider} />

          {/* Información adicional */}
          <Text style={styles.sectionTitle}>Información Adicional</Text>
          
          {/* Libro abierto */}
          <View style={styles.switchContainer}>
            <Text>Examen a libro abierto</Text>
            <Controller
              control={control}
              name="open_book"
              render={({ field: { onChange, value } }) => (
                <Switch 
                  value={value} 
                  onValueChange={onChange}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={value ? "#f5dd4b" : "#f4f3f4"}
                />
              )}
            />
          </View>
          
          {/* Tiempo de tolerancia */}
          <Controller
            control={control}
            name="grace_period"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Tiempo de tolerancia (minutos)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                keyboardType="numeric"
                error={!!errors.grace_period}
              />
            )}
          />
          {errors.grace_period && (
            <HelperText type="error">{errors.grace_period.message}</HelperText>
          )}
          <HelperText type="info">Minutos adicionales permitidos después de la hora de entrega.</HelperText>
          
          {/* Reglas de entrega */}
          <Controller
            control={control}
            name="submission_rules"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Reglas de entrega"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                multiline
                numberOfLines={3}
                error={!!errors.submission_rules}
              />
            )}
          />
          {errors.submission_rules && (
            <HelperText type="error">{errors.submission_rules.message}</HelperText>
          )}

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
              Crear Examen
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
  input: {
    marginBottom: 10,
    backgroundColor: "white",
  },
  questionsInput: {
    minHeight: 200,
    textAlignVertical: "top",
  },
  pickerContainer: {
    backgroundColor: "white",
    borderRadius: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 10,
  },
  divider: {
    marginVertical: 20,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },
  submitButton: {
    flex: 1,
    marginLeft: 10,
  },
  // Estilos para el sistema de preguntas dinámicas
  questionsList: {
    marginBottom: 15,
  },
  questionItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  questionNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  questionNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  questionTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  questionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  removeQuestionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFE0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noQuestionsContainer: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  noQuestionsText: {
    color: '#666',
    fontStyle: 'italic',
  },
  addQuestionContainer: {
    marginBottom: 20,
  },
  questionInput: {
    backgroundColor: 'white',
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  addQuestionButton: {
    borderRadius: 8,
  },
});