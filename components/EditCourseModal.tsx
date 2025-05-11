import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, Text as RNText, Platform } from "react-native";
import { Button, TextInput, Text, Chip, HelperText, Divider, Portal, Title, Modal } from "react-native-paper";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";
import jwtDecode from "jwt-decode";
import { Course } from "@/app/(tabs)/course-list";
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from "date-fns";

// Definición del tipo para la solicitud de edición de curso
type ScheduleItem = {
  day: string;
  time: string;
};

type EditCourseRequest = {
  role: string;
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  objetives: string[];
  syllabus: string;
  required_courses: string[];
  instructor_profile: string;
  modality: string;
  schedule: ScheduleItem[];
};

// Esquema de validación con Zod
const requiredCourseSchema = z.object({
  course_name: z.string().min(1, "El nombre del curso es requerido"),
});

const editCourseSchema = z
  .object({
    course_name: z.string().min(3, "El nombre del curso debe tener al menos 3 caracteres"),
    description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
    date_init: z.string().min(1, "La fecha de inicio es requerida"),
    date_end: z.string().min(1, "La fecha de fin es requerida"),
    schedule: z.string().min(1, "El horario es requerido"),
    quota: z.number().min(1, "El cupo debe ser al menos 1"),
    academic_level: z.string().min(1, "El nivel académico es requerido"),
    required_course_name: z.array(requiredCourseSchema),
  })
  .refine(
    (data) => {
      // Si alguna fecha está vacía, no validamos (ya hay otra validación para eso)
      if (!data.date_init || !data.date_end) return true;
      
      try {
        // Convertir fechas del formato DD/MM/YY a Date para comparar
        const startDateParts = data.date_init.split('/');
        const endDateParts = data.date_end.split('/');
        
        // Si el año tiene 2 dígitos (ej. 23), asumimos 20XX
        const startYear = startDateParts[2].length === 2 ? `20${startDateParts[2]}` : startDateParts[2];
        const endYear = endDateParts[2].length === 2 ? `20${endDateParts[2]}` : endDateParts[2];
        
        const startDate = new Date(`${startYear}-${startDateParts[1]}-${startDateParts[0]}`);
        const endDate = new Date(`${endYear}-${endDateParts[1]}-${endDateParts[0]}`);
        
        // Verificar que la fecha de inicio sea menor o igual que la fecha de fin
        return startDate <= endDate;
      } catch (error) {
        // Si hay error al parsear las fechas, consideramos que no pasa la validación
        return false;
      }
    },
    {
      message: "La fecha de inicio debe ser menor o igual que la fecha de fin",
      path: ["date_end"], // Mostramos el error en el campo de fecha fin
    }
  );

type FormValues = z.infer<typeof editCourseSchema>;

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

type EditCourseModalProps = {
  visible: boolean;
  onDismiss: () => void;
  course: Course | null;
  onSuccess: (updatedCourseData?: Partial<Course>) => void;
};

export default function EditCourseModal({ visible, onDismiss, course, onSuccess }: EditCourseModalProps) {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  
  // Estados para controlar la visibilidad de los DatePickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Configurar React Hook Form con validación Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      course_name: "",
      description: "",
      date_init: "",
      date_end: "",
      schedule: "08:00",
      quota: 10,
      academic_level: "Primary School",
      required_course_name: [],
    },
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

  // Función para convertir cualquier formato de fecha a DD/MM/YYYY
  const formatDateToStandard = (dateStr: string): string => {
    if (!dateStr) return "";
    
    try {
      // Intentar crear un objeto Date a partir de la cadena
      const date = new Date(dateStr);
      console.log("Fecha", date);
      
      // Verificar si es una fecha válida
      if (isNaN(date.getTime())) {
        // Si no es una fecha ISO, podría ser otro formato como DD/MM/YY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          let year = parseInt(parts[2]);
          
          if (year < 100) year = 2000 + year;
          
          const newDate = new Date(year, month, day);
          if (!isNaN(newDate.getTime())) {
            return format(newDate, 'dd/MM/yyyy');
          }
        }
        return dateStr; // Devolver la cadena original si no se pudo convertir
      }
      
      // Formatear la fecha a DD/MM/YYYY
      return format(date, 'dd/MM/yyyy');
    } catch (e) {
      console.error("Error al formatear fecha:", e);
      return dateStr; // Devolver la cadena original en caso de error
    }
  };

  // Cargar los datos del curso cuando cambie
  useEffect(() => {
    if (course) {
      setValue("course_name", course.course_name || "");
      setValue("description", course.description || "");
      setValue("date_init", formatDateToStandard(course.date_init || ""));
      setValue("date_end", formatDateToStandard(course.date_end || ""));
      setValue("schedule", "08:00"); // Valor por defecto ya que no tenemos el horario en el objeto course
      setValue("quota", course.quota || 10);
      setValue("academic_level", "Primary School"); // Valor por defecto ya que no tenemos el nivel académico en el objeto course
    }
  }, [course, setValue]);

  // Resetear el formulario cuando se cierre el modal
  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible, reset]);

  // Función para editar el curso
  const onSubmit = async (data: FormValues) => {
    if (!course) return;
    
    setLoading(true);

    // Comprobar si el usuario está autenticado y tiene el rol adecuado
    if (!session) {
      alert("Error: Necesitas iniciar sesión");
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
        alert("Error: No se pudo obtener el email del usuario");
        setLoading(false);
        return;
      }

      // Preparar la solicitud
      // Convertir fechas del formato DD/MM/YYYY al formato ISO
      const startDateParts = data.date_init.split('/');
      const endDateParts = data.date_end.split('/');
      
      // Asumimos formato DD/MM/YYYY
      let startYear = startDateParts[2];
      let endYear = endDateParts[2];
      
      // Para compatibilidad con formatos anteriores, si el año tiene 2 dígitos, asumimos 20XX
      if (startYear.length === 2) {
        startYear = `20${startYear}`;
      }
      
      if (endYear.length === 2) {
        endYear = `20${endYear}`;
      }
      
      // Crear fechas como objetos Date y luego convertirlos a ISO string
      const startDate = new Date(`${startYear}-${startDateParts[1]}-${startDateParts[0]}T00:00:00.000Z`);
      const endDate = new Date(`${endYear}-${endDateParts[1]}-${endDateParts[0]}T00:00:00.000Z`);
      
      const request: EditCourseRequest = {
        role: session.userType,
        course_name: data.course_name,
        description: data.description,
        date_init: startDate.toISOString(),
        date_end: endDate.toISOString(),
        objetives: ["string"],
        syllabus: "Unit 1: colours, Unit 2: ...",
        required_courses: data.required_course_name.map(course => course.course_name),
        instructor_profile: "Engineer",
        modality: "virtual",
        schedule: [
          {
            day: "Monday",
            time: "18:00"
          }
        ]
      };

      console.log("Enviando solicitud de edición:", request);

      // Enviar la solicitud al servidor
      const response = await courseClient.patch(`/courses/${course.course_id}`, request);
      console.log("Respuesta:", response.data);

      // Mostrar mensaje de éxito
      alert("Curso actualizado exitosamente");
      
      // Crear un objeto con los datos actualizados del curso para actualizar la caché
      const updatedCourseData: Partial<Course> = {
        course_name: data.course_name,
        description: data.description,
        date_init: data.date_init,
        date_end: data.date_end,
        objetives: response.data?.objetives || ["string"],
        syllabus: response.data?.syllabus || "Unit 1: colours, Unit 2: ...",
        instructor_profile: response.data?.instructor_profile || "Engineer",
        modality: response.data?.modality || "virtual",
        schedule: response.data?.schedule || [{day: "Monday", time: "18:00"}]
      };
      
      // Llamamos a onSuccess con los datos actualizados para actualizar manualmente la caché
      onSuccess(updatedCourseData);
      
      // Esperar un poco más antes de cerrar el modal
      setTimeout(() => {
        onDismiss();
      }, 500);
    } catch (error: any) {
      console.error("Error al actualizar el curso:", error);
      
      // Manejar diferentes tipos de errores
      if (error.response) {
        // El servidor respondió con un código de error
        const status = error.response.status;
        let message = "Error al actualizar el curso";

        switch (status) {
          case 400:
            message = "Faltan datos requeridos o formato incorrecto";
            break;
          case 403:
            message = "No tienes permisos para editar este curso";
            break;
          case 404:
            message = "Curso no encontrado";
            break;
          default:
            message = `Error del servidor: ${error.response.data?.message || "Error desconocido"}`;
        }

        alert(`Error: ${message}`);
      } else {
        // Error de red o de cliente
        alert("Error: No se pudo conectar con el servidor. Verifica tu conexión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Title style={styles.title}>Editar Curso</Title>
          
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

          {/* Fechas */}
          <Text style={styles.sectionTitle}>Fechas *</Text>
          <View style={styles.dateFilterContainer}>
            <Controller
              control={control}
              name="date_init"
              render={({ field: { onChange, value } }) => (
                <Button mode="outlined" onPress={() => setShowStartDatePicker(true)}>
                  {value ? `Inicio: ${value}` : "Fecha de inicio"}
                </Button>
              )}
            />
            <Controller
              control={control}
              name="date_end"
              render={({ field: { onChange, value } }) => (
                <Button mode="outlined" onPress={() => setShowEndDatePicker(true)}>
                  {value ? `Fin: ${value}` : "Fecha de fin"}
                </Button>
              )}
            />
          </View>
          
          {showStartDatePicker && (
            <DateTimePicker
              value={(() => {
                // Usar fecha actual como valor predeterminado
                const defaultDate = new Date();
                
                if (!watch("date_init")) return defaultDate;
                
                try {
                  // Si la fecha ya existe, intentar parsearla de manera segura
                  const dateStr = watch("date_init");
                  const dateParts = dateStr.split('/');
                  
                  // Verificar que tenemos 3 partes (día, mes, año)
                  if (dateParts.length !== 3) return defaultDate;
                  
                  // Convertir a números, asumiendo formato DD/MM/YYYY o DD/MM/YY
                  const day = parseInt(dateParts[0]);
                  const month = parseInt(dateParts[1]) - 1; // Meses en JavaScript son 0-indexed
                  let year = parseInt(dateParts[2]);
                  
                  // Manejar años de 2 dígitos
                  if (year < 100) {
                    year = 2000 + year;
                  }
                  
                  // Crear y validar la fecha
                  const date = new Date(year, month, day);
                  
                  // Verificar si es una fecha válida
                  if (isNaN(date.getTime())) return defaultDate;
                  
                  return date;
                } catch (e) {
                  console.error("Error al parsear fecha:", e);
                  return defaultDate;
                }
              })()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowStartDatePicker(false);
                if (selectedDate) {
                  // Formatear la fecha al formato DD/MM/YYYY
                  const formattedDate = format(selectedDate, 'dd/MM/yyyy');
                  setValue("date_init", formattedDate);
                  
                  // Verificar si la fecha seleccionada es posterior a la fecha de fin
                  const endDateValue = watch("date_end");
                  if (endDateValue) {
                    try {
                      const endDateParts = endDateValue.split('/');
                      
                      // Verificar que hay 3 partes (día, mes, año)
                      if (endDateParts.length === 3) {
                        const day = parseInt(endDateParts[0]);
                        const month = parseInt(endDateParts[1]) - 1;
                        let year = parseInt(endDateParts[2]);
                        
                        if (year < 100) {
                          year = 2000 + year;
                        }
                        
                        const endDate = new Date(year, month, day);
                        
                        // Si la fecha de inicio es posterior a la de fin, actualizar la de fin
                        if (selectedDate > endDate) {
                          const newEndDate = format(selectedDate, 'dd/MM/yyyy');
                          setValue("date_end", newEndDate);
                        }
                      }
                    } catch (error) {
                      console.error("Error al validar fechas:", error);
                    }
                  }
                }
              }}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={(() => {
                // Usar fecha actual como valor predeterminado
                const defaultDate = new Date();
                
                if (!watch("date_end")) return defaultDate;
                
                try {
                  // Si la fecha ya existe, intentar parsearla de manera segura
                  const dateStr = watch("date_end");
                  const dateParts = dateStr.split('/');
                  
                  // Verificar que tenemos 3 partes (día, mes, año)
                  if (dateParts.length !== 3) return defaultDate;
                  
                  // Convertir a números, asumiendo formato DD/MM/YYYY o DD/MM/YY
                  const day = parseInt(dateParts[0]);
                  const month = parseInt(dateParts[1]) - 1; // Meses en JavaScript son 0-indexed
                  let year = parseInt(dateParts[2]);
                  
                  // Manejar años de 2 dígitos
                  if (year < 100) {
                    year = 2000 + year;
                  }
                  
                  // Crear y validar la fecha
                  const date = new Date(year, month, day);
                  
                  // Verificar si es una fecha válida
                  if (isNaN(date.getTime())) return defaultDate;
                  
                  return date;
                } catch (e) {
                  console.error("Error al parsear fecha:", e);
                  return defaultDate;
                }
              })()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowEndDatePicker(false);
                if (selectedDate) {
                  // Formatear la fecha al formato DD/MM/YYYY
                  const formattedDate = format(selectedDate, 'dd/MM/yyyy');
                  
                  // Verificar si la fecha seleccionada es anterior a la fecha de inicio
                  const startDateValue = watch("date_init");
                  if (startDateValue) {
                    try {
                      const startDateParts = startDateValue.split('/');
                      
                      // Verificar que hay 3 partes (día, mes, año)
                      if (startDateParts.length === 3) {
                        const day = parseInt(startDateParts[0]);
                        const month = parseInt(startDateParts[1]) - 1;
                        let year = parseInt(startDateParts[2]);
                        
                        if (year < 100) {
                          year = 2000 + year;
                        }
                        
                        const startDate = new Date(year, month, day);
                        
                        // Solo actualizamos si la fecha de fin es igual o posterior a la de inicio
                        if (selectedDate >= startDate) {
                          setValue("date_end", formattedDate);
                        } else {
                          // Mostrar mensaje de error y mantener la fecha anterior
                          alert("La fecha de fin debe ser igual o posterior a la fecha de inicio");
                        }
                      } else {
                        // Si no hay un formato válido, simplemente actualizamos la fecha
                        setValue("date_end", formattedDate);
                      }
                    } catch (error) {
                      // Si hay error al parsear la fecha, simplemente actualizamos la fecha
                      setValue("date_end", formattedDate);
                      console.error("Error al validar fechas:", error);
                    }
                  } else {
                    // Si no hay fecha de inicio, simplemente actualizamos la fecha
                    setValue("date_end", formattedDate);
                  }
                }
              }}
            />
          )}

          {/* Horario */}
          <Controller
            control={control}
            name="schedule"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Horario (HH:MM) *"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                error={!!errors.schedule}
                placeholder="HH:MM"
              />
            )}
          />
          {errors.schedule && (
            <HelperText type="error">{errors.schedule.message}</HelperText>
          )}

          {/* Cupo */}
          <Controller
            control={control}
            name="quota"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Cupo máximo *"
                value={value.toString()}
                onChangeText={(text) => onChange(parseInt(text) || 0)}
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
              onPress={onDismiss}
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
              Actualizar Curso
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
    maxHeight: '90%',
  },
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
    backgroundColor: "#fff",
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
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
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
  selectedChip: {
    backgroundColor: "#6200ee",
  },
  selectedChipText: {
    color: "white",
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