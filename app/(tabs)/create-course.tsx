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
  course_name: z.string().min(3, "El nombre del curso debe tener al menos 3 caracteres").nonempty("El nombre del curso es obligatorio"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres").nonempty("La descripción es obligatoria"),
  date_init: z.string().min(1, "La fecha de inicio es requerida").nonempty("La fecha de inicio es obligatoria"),
  date_end: z.string().min(1, "La fecha de fin es requerida").nonempty("La fecha de fin es obligatoria"),
  schedule: z.array(scheduleItemSchema).min(1, "Debe agregar al menos un horario"),
  quota: z.string().min(1, "El cupo es requerido").nonempty("El cupo máximo es obligatorio"),
  academic_level: z.string().min(1, "El nivel académico es requerido").nonempty("El nivel académico es obligatorio"),
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
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
    trigger,
    setError,
    clearErrors,
  } = useForm<FormValues>({
    defaultValues: {
      course_name: "",
      description: "",
      date_init: format(startDate, "dd/MM/yy"),  // Formato argentino para la UI
      date_end: format(endDate, "dd/MM/yy"),     // Formato argentino para la UI
      schedule: [{ day: "Monday", time: "09:00" }],
      quota: "",
      academic_level: "Bachelors degree",
      required_course_name: [],
    },
    mode: "onChange", // Validar cambios en tiempo real
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
  const convertDateFormat = (dateStr: string): string | null => {
    try {
      // Primero validar el formato con una expresión regular
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{2})$/;
      const match = dateStr.match(dateRegex);
      
      if (!match) {
        console.error("Formato de fecha incorrecto:", dateStr);
        return null;
      }
      
      // Extraer día, mes y año
      const day = match[1];
      const month = match[2];
      const year = match[3];
      
      // Validar rangos lógicos para día y mes
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      
      if (dayNum < 1 || dayNum > 31) {
        console.error("Día inválido:", day);
        return null;
      }
      
      if (monthNum < 1 || monthNum > 12) {
        console.error("Mes inválido:", month);
        return null;
      }
      
      // Reorganizar las partes para formato MM/DD/YY
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error("Error al convertir formato de fecha:", error);
      return null;
    }
  };

  // Función para validar manualmente los campos obligatorios
  const validateRequiredFields = (data: FormValues) => {
    // Lista para almacenar campos que faltan
    const missingFields: string[] = [];
    
    // Verificar cada campo obligatorio
    if (!data.course_name || data.course_name.trim() === '') {
      missingFields.push("Nombre del curso");
    } else if (data.course_name.length < 3) {
      missingFields.push("El nombre del curso debe tener al menos 3 caracteres");
    }
    
    if (!data.description || data.description.trim() === '') {
      missingFields.push("Descripción");
    } else if (data.description.length < 10) {
      missingFields.push("La descripción debe tener al menos 10 caracteres");
    }
    
    // Validar formato de fecha (DD/MM/YY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{2}$/;
    
    if (!data.date_init || data.date_init.trim() === '') {
      missingFields.push("Fecha de inicio");
    } else if (!dateRegex.test(data.date_init.trim())) {
      missingFields.push("Fecha de inicio debe tener formato DD/MM/YY");
    }
    
    if (!data.date_end || data.date_end.trim() === '') {
      missingFields.push("Fecha de fin");
    } else if (!dateRegex.test(data.date_end.trim())) {
      missingFields.push("Fecha de fin debe tener formato DD/MM/YY");
    }
    
    if (!data.quota || data.quota.trim() === '') {
      missingFields.push("Cupo máximo");
    } else if (isNaN(Number(data.quota)) || Number(data.quota) <= 0) {
      missingFields.push("Cupo máximo debe ser un número positivo");
    }
    
    if (!data.academic_level || data.academic_level.trim() === '') {
      missingFields.push("Nivel académico");
    }
    
    if (!data.schedule || data.schedule.length === 0) {
      missingFields.push("Al menos un horario");
    } else {
      // Verificar que cada horario tenga día y hora
      data.schedule.forEach((item, index) => {
        if (!item.day || item.day.trim() === '') {
          missingFields.push(`Día en el horario ${index + 1}`);
        }
        if (!item.time || item.time.trim() === '') {
          missingFields.push(`Hora en el horario ${index + 1}`);
        } else {
          // Validar formato de hora (HH:MM)
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(item.time.trim())) {
            missingFields.push(`Formato de hora incorrecto en horario ${index + 1} (use HH:MM)`);
          }
        }
      });
    }
    
    return missingFields;
  };

  // Función para crear un nuevo curso
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    
    try {
      // Primero ejecutar la validación de React Hook Form
      const isFormValid = await trigger();
      
      if (!isFormValid) {
        Alert.alert(
          "Campos obligatorios",
          "Por favor, completa todos los campos obligatorios marcados con *"
        );
        return;
      }
      
      // Validación manual adicional
      const missingFields = validateRequiredFields(data);
      
      if (missingFields.length > 0) {
        Alert.alert(
          "Campos obligatorios",
          `Por favor, completa los siguientes campos:\n${missingFields.map(field => `- ${field}`).join('\n')}`
        );
        return;
      }
      
      // Comprobar si el usuario está autenticado y tiene el rol adecuado
      if (!session) {
        Alert.alert("Error", "Necesitas iniciar sesión");
        return;
      }
    } finally {
      setLoading(false);
    }
    
    setLoading(true);

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

      // Verificar una última vez los campos críticos
      const dateRegex = /^\d{2}\/\d{2}\/\d{2}$/;
      if (!dateRegex.test(data.date_init.trim()) || !dateRegex.test(data.date_end.trim())) {
        Alert.alert("Formato incorrecto", "Las fechas deben tener formato DD/MM/YY");
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
      
      // Convertir y validar las fechas antes de enviar
      const convertedDateInit = convertDateFormat(data.date_init);
      const convertedDateEnd = convertDateFormat(data.date_end);
      
      if (!convertedDateInit || !convertedDateEnd) {
        Alert.alert("Error de formato", "Las fechas tienen formato incorrecto. Utiliza DD/MM/YY");
        return;
      }
      
      const request: CreateCourseRequest = {
        user_login: userEmail, // Usar el email como user_login
        role: session.userType,
        ...processedData,
        date_init: convertedDateInit, // Fecha ya convertida
        date_end: convertedDateEnd,   // Fecha ya convertida
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
        
        // Verificar una vez más los campos obligatorios antes de mostrar errores específicos
        const missingFields = validateRequiredFields(data);
        if (missingFields.length > 0) {
          // Prioritariamente mostrar errores de campos obligatorios
          Alert.alert(
            "Campos obligatorios",
            `Por favor, completa los siguientes campos:\n${missingFields.map(field => `- ${field}`).join('\n')}`
          );
          return;
        }

        // Sólo después de verificar que no faltan campos, mostrar errores específicos
        switch (status) {
          case 400:
            message = "Faltan datos requeridos o están en formato incorrecto. Por favor, verifica todos los campos.";
            break;
          case 403:
            message = "No tienes permisos para crear cursos";
            break;
          case 404:
            message = "Curso requerido no encontrado";
            break;
          case 409:
            // Este código sólo debe mostrarse cuando realmente hay un conflicto de nombre
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
          
          {/* Mensaje de error global */}
          {Object.keys(errors).length > 0 && (
            <View style={styles.errorSummary}>
              <Text style={styles.errorSummaryText}>
                Por favor completa todos los campos obligatorios (marcados con *)
              </Text>
              {/* Mostrar lista de errores específicos */}
              <View style={styles.errorList}>
                {Object.entries(errors).map(([fieldName, error]: [string, any]) => (
                  <Text key={fieldName} style={styles.errorItem}>
                    • {error.message || `Error en ${fieldName.replace('_', ' ')}`}
                  </Text>
                ))}
              </View>
            </View>
          )}
          
          {/* Nombre del curso */}
          <Controller
            control={control}
            name="course_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Nombre del Curso *"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (text.trim().length >= 3) {
                    // Limpiar error cuando el campo es válido
                    clearErrors("course_name");
                  }
                }}
                onBlur={() => {
                  onBlur();
                  // Validar al perder el foco
                  if (!value || value.trim().length < 3) {
                    setError("course_name", {
                      type: "manual",
                      message: !value ? "El nombre del curso es requerido" : "El nombre debe tener al menos 3 caracteres"
                    });
                  }
                }}
                style={[styles.input, !!errors.course_name && styles.inputError]}
                error={!!errors.course_name}
                right={
                  value && value.trim().length >= 3 ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
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
                      
                      // Validar formato mientras se escribe
                      const dateRegex = /^\d{2}\/\d{2}\/\d{2}$/;
                      if (text && text.trim() !== '' && dateRegex.test(text.trim())) {
                        clearErrors("date_init");
                      }
                    }}
                    onBlur={() => {
                      // Validar al perder el foco
                      const dateRegex = /^\d{2}\/\d{2}\/\d{2}$/;
                      if (!value || value.trim() === '' || !dateRegex.test(value.trim())) {
                        setError("date_init", {
                          type: "manual",
                          message: !value ? "La fecha de inicio es requerida" : "Formato incorrecto, use DD/MM/YY"
                        });
                      }
                    }}
                    style={[styles.input, !!errors.date_init && styles.inputError]}
                    error={!!errors.date_init}
                    placeholder="DD/MM/YY"
                    right={
                      value && /^\d{2}\/\d{2}\/\d{2}$/.test(value.trim()) ? 
                      <TextInput.Icon icon="check-circle" color="green" /> : undefined
                    }
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
                      
                      // Validar formato mientras se escribe
                      const dateRegex = /^\d{2}\/\d{2}\/\d{2}$/;
                      if (text && text.trim() !== '' && dateRegex.test(text.trim())) {
                        clearErrors("date_end");
                      }
                    }}
                    onBlur={() => {
                      // Validar al perder el foco
                      const dateRegex = /^\d{2}\/\d{2}\/\d{2}$/;
                      if (!value || value.trim() === '' || !dateRegex.test(value.trim())) {
                        setError("date_end", {
                          type: "manual",
                          message: !value ? "La fecha de fin es requerida" : "Formato incorrecto, use DD/MM/YY"
                        });
                      }
                    }}
                    style={[styles.input, !!errors.date_end && styles.inputError]}
                    error={!!errors.date_end}
                    placeholder="DD/MM/YY"
                    right={
                      value && /^\d{2}\/\d{2}\/\d{2}$/.test(value.trim()) ? 
                      <TextInput.Icon icon="check-circle" color="green" /> : undefined
                    }
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
                onChangeText={(text) => {
                  // Asegurar que solo acepte números
                  if (text === '' || /^\d+$/.test(text)) {
                    onChange(text);
                    
                    // Limpiar error si el valor es válido
                    if (text && parseInt(text, 10) > 0) {
                      clearErrors("quota");
                    }
                  }
                }}
                onBlur={() => {
                  onBlur();
                  // Validar al perder el foco
                  if (!value || value.trim() === '' || isNaN(parseInt(value, 10)) || parseInt(value, 10) <= 0) {
                    setError("quota", {
                      type: "manual",
                      message: !value ? "El cupo máximo es requerido" : "El cupo debe ser un número mayor a cero"
                    });
                  }
                }}
                style={[styles.input, !!errors.quota && styles.inputError]}
                keyboardType="numeric"
                error={!!errors.quota}
                right={
                  value && parseInt(value, 10) > 0 ? 
                  <TextInput.Icon icon="check-circle" color="green" /> : undefined
                }
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
              onPress={async () => {
                // Validar formulario antes de enviar
                const isValid = await trigger();
                if (!isValid) {
                  Alert.alert(
                    "Campos incompletos",
                    "Por favor, completa todos los campos obligatorios antes de continuar."
                  );
                  return;
                }
                
                // Si la validación pasa, enviar el formulario
                handleSubmit(onSubmit)();
              }}
              style={styles.submitButton}
              loading={loading || isSubmitting}
              disabled={loading || isSubmitting}
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
    marginBottom: 5,
  },
  errorList: {
    marginTop: 5,
    paddingLeft: 5,
  },
  errorItem: {
    color: "#D32F2F",
    fontSize: 12,
    marginBottom: 2,
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