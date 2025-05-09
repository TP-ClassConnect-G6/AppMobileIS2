import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, Text as RNText, Platform } from "react-native";
import { Button, TextInput, Text, Card, Title, Chip, HelperText, Divider } from "react-native-paper";
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

  // Configurar React Hook Form con validación Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      course_name: "",
      description: "",
      date_init: format(startDate, "dd/MM/yy"),
      date_end: format(endDate, "dd/MM/yy"),
      schedule: [{ day: "Monday", time: "09:00" }],
      quota: "",
      academic_level: "Basic",
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

      // Preparar la solicitud
      const request: CreateCourseRequest = {
        user_login: userEmail, // Usar el email como user_login
        role: session.userType,
        ...data,
      };

      console.log("Enviando solicitud:", request);

      // Enviar la solicitud al servidor
      const response = await courseClient.post("/courses", request);
      console.log("Respuesta:", response.data);

      // Mostrar mensaje de éxito
      Alert.alert(
        "Éxito",
        "Curso creado exitosamente",
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
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Nombre del curso prerrequisito"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    style={styles.requiredCourseInput}
                    error={!!errors.required_course_name?.[index]?.course_name}
                  />
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
            onPress={() => appendRequiredCourse({ course_name: "" })}
            style={styles.addButton}
          >
            Agregar Prerequisito
          </Button>

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