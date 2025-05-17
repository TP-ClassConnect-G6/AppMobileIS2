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
  };
  owner: string;
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
  owner: string;
  published: boolean;
  created_at: string;
  updated_at: string;
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
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  date: z.string().min(1, "La fecha es requerida"),
  duration: z.string().min(1, "La duración es requerida"),
  location: z.string().min(1, "La ubicación es requerida"),
  open_book: z.boolean(),
});

type FormValues = z.infer<typeof createExamSchema>;

export default function CreateExamScreen() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [fetchingCourses, setFetchingCourses] = useState(false);

  // Configurar React Hook Form con validación Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      course_id: "",
      title: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      duration: "120",
      location: "",
      open_book: false,
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

      // Preparar la solicitud
      const request: CreateExamRequest = {
        course_id: data.course_id,
        title: data.title,
        description: data.description,
        date: data.date,
        duration: parseInt(data.duration),
        location: data.location,
        additional_info: {
          open_book: data.open_book
        },
        owner: userId
      };

      console.log("Enviando solicitud:", request);

      // Enviar la solicitud al servidor
      const response = await courseClient.post("/exams", request);
      console.log("Respuesta:", response.data);

      // Mostrar mensaje de éxito
      Alert.alert(
        "Éxito",
        "Examen creado exitosamente",
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
          )}

          {/* Descripción */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Descripción *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
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

          {/* Fecha del examen */}
          <Controller
            control={control}
            name="date"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Fecha del Examen (YYYY-MM-DD) *"
                value={value}
                onChangeText={onChange}
                style={styles.input}
                error={!!errors.date}
                placeholder="YYYY-MM-DD"
              />
            )}
          />
          {errors.date && (
            <HelperText type="error">{errors.date.message}</HelperText>
          )}

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
                label="Ubicación *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                error={!!errors.location}
              />
            )}
          />
          {errors.location && (
            <HelperText type="error">{errors.location.message}</HelperText>
          )}

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
});