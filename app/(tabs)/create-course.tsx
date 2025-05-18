import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, Text as RNText, Platform, FlatList, Modal } from "react-native";
import { Button, TextInput, Text, Card, Title, Chip, HelperText, Divider, ActivityIndicator, List, Searchbar } from "react-native-paper";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";
import { format } from "date-fns";
import { router } from "expo-router";
import jwtDecode from "jwt-decode";

// Definición del tipo para la solicitud de creación de curso
type ScheduleItem = {
  day: string;
  time: string;
};

type RequiredCourse = {
  course_name: string;
  course_id?: string;  // Añadimos el ID del curso para la selección
};

// Respuesta del servidor al crear un curso
type CreateCourseResponse = {
  response: {
    id: string;
    name: string;
    description: string;
    date_init: string;
  }
};

// Tipo para los cursos en la lista
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

type CreateCourseRequest = {
  user_login: string;
  role: string;
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  schedule: ScheduleItem[];
  quota: string;
  academic_level: string;
  required_course_name: RequiredCourse[];
};

// Esquema de validación con Zod
const scheduleItemSchema = z.object({
  day: z.string().min(1, "El día es requerido"),
  time: z.string().min(1, "La hora es requerida"),
});

const requiredCourseSchema = z.object({
  course_name: z.string().min(1, "El nombre del curso es requerido"),
  course_id: z.string().optional(),
});

const createCourseSchema = z.object({
  course_name: z.string().min(3, "El nombre del curso debe tener al menos 3 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  date_init: z.string().min(1, "La fecha de inicio es requerida"),
  date_end: z.string().min(1, "La fecha de fin es requerida"),
  schedule: z.array(scheduleItemSchema).min(1, "Debe agregar al menos un horario"),
  quota: z.string().min(1, "El cupo es requerido"),
  academic_level: z.string().min(1, "El nivel académico es requerido"),
  required_course_name: z.array(requiredCourseSchema),
});

type FormValues = z.infer<typeof createCourseSchema>;

// Días de la semana disponibles
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Niveles académicos disponibles
const ACADEMIC_LEVELS = [
  "Primary School", 
  "Middle School", 
  "High School degree", 
  "Associate Degree", 
  "Bachelors degree", 
  "Masters degree", 
  "Doctorate",
];

export default function CreateCourseScreen() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [availableCourses, setAvailableCourses] = useState<CourseItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [currentPrerequisiteIndex, setCurrentPrerequisiteIndex] = useState<number | null>(null);

  // Configurar React Hook Form con validación Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({        defaultValues: {
      course_name: "",
      description: "",
      date_init: format(startDate, "dd/MM/yy"),  // Formato argentino para la UI
      date_end: format(endDate, "dd/MM/yy"),     // Formato argentino para la UI
      schedule: [{ day: "Monday", time: "09:00" }],
      quota: "",
      academic_level: "Bachelors degree",
      required_course_name: [],
    },
  });

  // Configurar Field Array para horarios
  const {
    fields: scheduleFields,
    append: appendSchedule,
    remove: removeSchedule,
  } = useFieldArray({
    control,
    name: "schedule",
  });

  // Configurar Field Array para cursos requeridos
  const {
    fields: requiredCourseFields,
    append: appendRequiredCourse,
    remove: removeRequiredCourse,
  } = useFieldArray({
    control,
    name: "required_course_name",
  });

  // Función para convertir fecha de formato DD/MM/YY a MM/DD/YY
  const convertDateFormat = (dateStr: string): string => {
    try {
      // Dividir la fecha en partes (día, mes, año)
      const parts = dateStr.split('/');
      if (parts.length !== 3) return dateStr;
      
      // Reorganizar las partes para formato MM/DD/YY
      return `${parts[1]}/${parts[0]}/${parts[2]}`;
    } catch (error) {
      console.error("Error al convertir formato de fecha:", error);
      return dateStr;
    }
  };

  // Función para crear un nuevo curso
  const onSubmit = async (data: FormValues) => {
    setLoading(true);

    // Comprobar si el usuario está autenticado y tiene el rol adecuado
    if (!session) {
      Alert.alert("Error", "Necesitas iniciar sesión");
      setLoading(false);
      return;
    }

    try {
      // Extraer el email del token JWT
      let userEmail = "";
      try {
        const decodedToken: any = jwtDecode(session.token);
        userEmail = decodedToken.email || "";
        console.log("Email extraído del token:", userEmail);
      } catch (error) {
        console.error("Error al decodificar token:", error);
      }

      // Verificar que tenemos un email válido
      if (!userEmail) {
        Alert.alert("Error", "No se pudo obtener el email del usuario");
        setLoading(false);
        return;
      }

      // Preparar la solicitud con las fechas convertidas al formato esperado por el backend (MM/DD/YY)
      // También ajustamos los cursos requeridos para usar solo el nombre
      const processedData = {
        ...data,
        required_course_name: data.required_course_name.map(course => ({
          course_name: course.course_name
        }))
      };
      
      const request: CreateCourseRequest = {
        user_login: userEmail, // Usar el email como user_login
        role: session.userType,
        ...processedData,
        date_init: convertDateFormat(data.date_init), // Convertir formato para el backend
        date_end: convertDateFormat(data.date_end),   // Convertir formato para el backend
      };

      console.log("Enviando solicitud:", request);

      // Enviar la solicitud al servidor
      const response = await courseClient.post("/courses", request);
      console.log("Respuesta:", response.data);
      
      // Extraer información de la respuesta con la nueva estructura
      const courseData = response.data.response;

      // Mostrar mensaje de éxito
      Alert.alert(
        "Éxito",
        `Curso "${courseData.name}" creado exitosamente`,
        [{ text: "OK", onPress: () => {
          reset(); // Resetear el formulario
          router.push("/(tabs)/course-list"); // Redirigir a la lista de cursos
        }}]
      );
    } catch (error: any) {
      console.error("Error al crear el curso:", error);
      
      // Manejar diferentes tipos de errores
      if (error.response) {
        // El servidor respondió con un código de error
        const status = error.response.status;
        let message = "Error al crear el curso";

        switch (status) {
          case 400:
            message = "Faltan datos requeridos";
            break;
          case 403:
            message = "No tienes permisos para crear cursos";
            break;
          case 404:
            message = "Curso requerido no encontrado";
            break;
          case 409:
            message = "Ya existe un curso con este nombre, intenta con otro";
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

  // Función para manejar selección de fechas manualmente
  const handleDateManualInput = (type: 'start' | 'end', value: string) => {
    // Simplemente actualizar el valor en el formulario
    if (type === 'start') {
      setValue("date_init", value);
    } else {
      setValue("date_end", value);
    }
  };
  
  // Función para cargar los cursos disponibles
  const fetchAvailableCourses = async () => {
    setLoadingCourses(true);
    try {
      const response = await courseClient.get("/courses");
      console.log("Cursos disponibles:", response.data);
      
      // Extraer los cursos de la respuesta
      if (response.data && Array.isArray(response.data.response)) {
        setAvailableCourses(response.data.response);
      } else {
        setAvailableCourses([]);
      }
    } catch (error) {
      console.error("Error al cargar los cursos:", error);
      Alert.alert("Error", "No se pudieron cargar los cursos disponibles");
      setAvailableCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };
  
  // Función para abrir el selector de cursos
  const openCourseSelector = (index: number) => {
    setCurrentPrerequisiteIndex(index);
    setShowCourseSelector(true);
    fetchAvailableCourses(); // Cargar los cursos disponibles
  };
  
  // Función para seleccionar un curso como prerrequisito
  const selectCoursePrerequisite = (course: CourseItem) => {
    if (currentPrerequisiteIndex !== null) {
      // Actualizar el valor del campo de curso requerido
      setValue(`required_course_name.${currentPrerequisiteIndex}`, {
        course_name: course.course_name,
        course_id: course.course_id
      });
    }
    setShowCourseSelector(false);
    setCourseSearchQuery('');
  };
  
  // Filtrar cursos basados en la búsqueda
  const filteredCourses = courseSearchQuery
    ? availableCourses.filter(course => 
        course.course_name.toLowerCase().includes(courseSearchQuery.toLowerCase()))
    : availableCourses;
  
  // Cargar los cursos disponibles al montar el componente
  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Crear Nuevo Curso</Title>
          
          {/* Nombre del curso */}
          <Controller
            control={control}
            name="course_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Nombre del Curso *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                error={!!errors.course_name}
              />
            )}
          />
          {errors.course_name && (
            <HelperText type="error">{errors.course_name.message}</HelperText>
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

          {/* Fechas - Entrada de texto manual en lugar de DatePicker */}
          <View style={styles.dateContainer}>
            <View style={styles.dateInputContainer}>
              <Controller
                control={control}
                name="date_init"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Fecha de inicio (DD/MM/YY) *"
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      handleDateManualInput('start', text);
                    }}
                    style={styles.input}
                    error={!!errors.date_init}
                    placeholder="DD/MM/YY"
                  />
                )}
              />
              {errors.date_init && (
                <HelperText type="error">{errors.date_init.message}</HelperText>
              )}
              <HelperText type="info">Formato: día/mes/año (DD/MM/YY)</HelperText>
            </View>

            <View style={styles.dateInputContainer}>
              <Controller
                control={control}
                name="date_end"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Fecha de fin (DD/MM/YY) *"
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      handleDateManualInput('end', text);
                    }}
                    style={styles.input}
                    error={!!errors.date_end}
                    placeholder="DD/MM/YY"
                  />
                )}
              />
              {errors.date_end && (
                <HelperText type="error">{errors.date_end.message}</HelperText>
              )}
            </View>
          </View>

          {/* Cupo */}
          <Controller
            control={control}
            name="quota"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Cupo máximo *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                keyboardType="numeric"
                error={!!errors.quota}
              />
            )}
          />
          {errors.quota && (
            <HelperText type="error">{errors.quota.message}</HelperText>
          )}

          {/* Nivel académico */}
          <Text style={styles.sectionTitle}>Nivel Académico *</Text>
          <View style={styles.chipContainer}>
            {ACADEMIC_LEVELS.map((level) => (
              <Controller
                key={level}
                control={control}
                name="academic_level"
                render={({ field: { onChange, value } }) => (
                  <Chip
                    selected={value === level}
                    onPress={() => onChange(level)}
                    style={[
                      styles.chip,
                      value === level && styles.selectedChip,
                    ]}
                    textStyle={value === level ? styles.selectedChipText : undefined}
                  >
                    {level}
                  </Chip>
                )}
              />
            ))}
          </View>
          {errors.academic_level && (
            <HelperText type="error">{errors.academic_level.message}</HelperText>
          )}

          <Divider style={styles.divider} />

          {/* Horarios */}
          <Text style={styles.sectionTitle}>Horarios *</Text>
          {scheduleFields.map((field, index) => (
            <View key={field.id} style={styles.scheduleItem}>
              <View style={styles.scheduleInputs}>
                <Controller
                  control={control}
                  name={`schedule.${index}.day`}
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.selectContainer}>
                      <Text style={styles.selectLabel}>Día:</Text>
                      <View style={styles.chipContainer}>
                        {DAYS_OF_WEEK.map((day) => (
                          <Chip
                            key={day}
                            selected={value === day}
                            onPress={() => onChange(day)}
                            style={[
                              styles.dayChip,
                              value === day && styles.selectedChip,
                            ]}
                            textStyle={value === day ? styles.selectedChipText : undefined}
                          >
                            {day.slice(0, 3)}
                          </Chip>
                        ))}
                      </View>
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name={`schedule.${index}.time`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Hora"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      style={styles.timeInput}
                      placeholder="HH:MM"
                      error={!!errors.schedule?.[index]?.time}
                    />
                  )}
                />
              </View>

              <TouchableOpacity 
                onPress={() => removeSchedule(index)}
                style={styles.removeButton}
                disabled={scheduleFields.length === 1}
              >
                <RNText style={[
                  styles.removeButtonText,
                  scheduleFields.length === 1 && styles.disabledText
                ]}>
                  ✕
                </RNText>
              </TouchableOpacity>
            </View>
          ))}

          <Button 
            mode="outlined" 
            onPress={() => appendSchedule({ day: "Monday", time: "09:00" })}
            style={styles.addButton}
          >
            Agregar Horario
          </Button>

          {errors.schedule && (
            <HelperText type="error">
              {typeof errors.schedule.message === 'string' 
                ? errors.schedule.message 
                : "Verifica los horarios"}
            </HelperText>
          )}

          <Divider style={styles.divider} />

          {/* Cursos requeridos */}
          <Text style={styles.sectionTitle}>Cursos Prerequisitos (Opcional)</Text>
          
          {requiredCourseFields.map((field, index) => (
            <View key={field.id} style={styles.requiredCourseItem}>
              <Controller
                control={control}
                name={`required_course_name.${index}.course_name`}
                render={({ field: { value } }) => (
                  <TouchableOpacity
                    style={styles.courseSelectButton}
                    onPress={() => openCourseSelector(index)}
                  >
                    <Text style={styles.courseSelectButtonText}>
                      {value ? value : "Seleccionar curso prerequisito"}
                    </Text>
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity 
                onPress={() => removeRequiredCourse(index)}
                style={styles.removeButton}
              >
                <RNText style={styles.removeButtonText}>✕</RNText>
              </TouchableOpacity>
            </View>
          ))}

          <Button 
            mode="outlined" 
            onPress={() => appendRequiredCourse({ course_name: "", course_id: "" })}
            style={styles.addButton}
          >
            Agregar Prerequisito
          </Button>
          
          {/* Modal para seleccionar curso */}
          <Modal
            visible={showCourseSelector}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              setShowCourseSelector(false);
              setCourseSearchQuery('');
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Seleccionar Curso Prerequisito</Text>
                
                <Searchbar
                  placeholder="Buscar curso..."
                  onChangeText={setCourseSearchQuery}
                  value={courseSearchQuery}
                  style={styles.searchBar}
                />
                
                {loadingCourses ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6200ee" />
                  </View>
                ) : filteredCourses.length === 0 ? (
                  <Text style={styles.noCoursesText}>
                    {courseSearchQuery ? "No se encontraron cursos" : "No hay cursos disponibles"}
                  </Text>
                ) : (
                  <FlatList
                    data={filteredCourses}
                    keyExtractor={(item) => item.course_id}
                    renderItem={({ item }) => (
                      <List.Item
                        title={item.course_name}
                        description={`${item.description?.substring(0, 50)}${item.description?.length > 50 ? '...' : ''}`}
                        onPress={() => selectCoursePrerequisite(item)}
                        style={styles.courseListItem}
                      />
                    )}
                    style={styles.courseList}
                  />
                )}
                
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setShowCourseSelector(false);
                    setCourseSearchQuery('');
                  }}
                  style={styles.cancelModalButton}
                >
                  Cancelar
                </Button>
              </View>
            </View>
          </Modal>

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
              Crear Curso
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
  // Estilos para el selector de cursos
  courseSelectButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 15,
    justifyContent: "center",
  },
  courseSelectButtonText: {
    color: "#333",
    fontSize: 16,
  },
  // Estilos para el modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: "#f5f5f5",
  },
  courseList: {
    maxHeight: 300,
  },
  courseListItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  noCoursesText: {
    textAlign: "center",
    padding: 20,
    color: "#757575",
  },
  cancelModalButton: {
    marginTop: 16,
  },
  input: {
    marginBottom: 10,
    backgroundColor: "white",
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dateInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  dateInput: {
    padding: 15,
    backgroundColor: "white",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateText: {
    fontSize: 16,
  },
  inputError: {
    borderColor: "#cf6679",
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
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  chip: {
    margin: 4,
  },
  dayChip: {
    margin: 2,
    height: 30,
  },
  selectedChip: {
    backgroundColor: "#6200ee",
  },
  selectedChipText: {
    color: "white",
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 10,
  },
  scheduleInputs: {
    flex: 1,
  },
  selectContainer: {
    marginBottom: 10,
  },
  selectLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: "#757575",
  },
  timeInput: {
    backgroundColor: "white",
  },
  requiredCourseItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  requiredCourseInput: {
    flex: 1,
    backgroundColor: "white",
  },
  removeButton: {
    marginLeft: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f44336",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "white",
    fontSize: 16,
  },
  disabledText: {
    color: "#e0e0e0",
  },
  addButton: {
    marginTop: 5,
    marginBottom: 15,
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