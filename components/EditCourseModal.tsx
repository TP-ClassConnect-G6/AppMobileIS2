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
  user_login: string;  // Campo requerido según la nueva estructura
  course_name?: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  content?: string;
  objetives: string[];
  required_course_name?: { course_name: string }[];
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
    content: z.string().optional(),
    objetives: z.string().optional(),
    instructor_profile: z.string().optional(),
    modality: z.string().min(1, "La modalidad es requerida"),
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

// Modalidades disponibles para los cursos
const MODALITY_OPTIONS = [
  "virtual",
  "present",
  "hybrid"
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
      content: "",
      objetives: "",
      instructor_profile: "",
      modality: "virtual", // Valor predeterminado para modalidad
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

  // Función para convertir cualquier formato de fecha a DD/MM/YYYY (formato argentino) para la UI
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
  
  // Función para convertir fecha de formato DD/MM/YY a formato ISO para el API
  const convertDateToISOFormat = (dateStr: string): string => {
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
      
      // Crear una fecha y convertirla a formato ISO
      const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      return date.toISOString();
    } catch (error) {
      console.error("Error al convertir fecha a ISO:", error);
      return dateStr;
    }
  };

  // Cargar los datos del curso cuando cambie
  useEffect(() => {
    if (course) {
      console.log("course_name", course.course_name);
      setValue("course_name", course.course_name || "");
      setValue("description", course.description || "");
      setValue("date_init", formatDateToStandard(course.date_init || ""));
      setValue("date_end", formatDateToStandard(course.date_end || ""));
      setValue("schedule", "18:00"); // Usar un valor por defecto para el horario
      setValue("quota", course.quota || 2);
      setValue("academic_level", course.academic_level || "Primary School");
      setValue("content", course.content || ""); // Cargar contenido del curso
      setValue("objetives", Array.isArray(course.objetives) ? course.objetives.join(", ") : (course.objetives || "")); // Convertir array a string
      setValue("instructor_profile", course.instructor_profile || ""); // Cargar el perfil del instructor
      setValue("modality", course.modality || "virtual"); // Cargar la modalidad del curso
      
      // Configurar cursos requeridos si existen
      if (Array.isArray(course.required_courses)) {
        // El API puede devolver diferentes formatos, manejar ambos casos
        if (typeof course.required_courses[0] === 'string') {
          const requiredCourses = (course.required_courses as string[]).map(name => ({ course_name: name }));
          reset(prevState => ({ ...prevState, required_course_name: requiredCourses }));
        } else {
          // Ya está en formato { course_name: string }
          reset(prevState => ({ ...prevState, required_course_name: course.required_courses as { course_name: string }[] }));
        }
      } else {
        reset(prevState => ({ ...prevState, required_course_name: [] }));
      }
    }
  }, [course, setValue, reset]);

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
      // Extraer el email del token JWT para el campo user_login
      let userEmail = "";
      try {
        const decodedToken: any = jwtDecode(session.token);
        userEmail = decodedToken.email || decodedToken.sub || "";
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

      // Preparar los objetivos como un array a partir del string ingresado por el usuario
      const objetives = data.objetives ? data.objetives.split(',').map(obj => obj.trim()) : ["hola"];
      
      const request:Partial<EditCourseRequest> = {
        role: session.userType,
        user_login: userEmail,  // Agregamos el campo requerido user_login
        description: data.description,
        date_init: convertDateToISOFormat(data.date_init),
        date_end: convertDateToISOFormat(data.date_end),
        quota: data.quota,
        content: data.content || "Unit 1 ..... Unit 2",
        objetives: objetives,
        required_course_name: data.required_course_name,
        instructor_profile: data.instructor_profile || "Engineer A",
        modality: data.modality,
        schedule: [
          {
            day: "Monday",
            time: "18:00"
          }
        ]
      };

      // Solo incluir el course_name si ha cambiado respecto al original
      if (data.course_name !== course.course_name) {
        request.course_name = data.course_name;
      }

      console.log("Enviando solicitud de edición:", request);

      // Enviar la solicitud al servidor
      const response = await courseClient.patch(`/courses/${course.course_id}`, request);
      console.log("Respuesta:", response.data);

      // Extraer la información del curso actualizado de la nueva estructura de respuesta
      const updatedCourse = response.data.course;

      // Mostrar mensaje de éxito
      alert("Curso actualizado exitosamente");
      
      // Preparar los datos actualizados para la UI según la nueva estructura de respuesta
      const updatedCourseData: Partial<Course> = {
        course_name: updatedCourse.course_name,
        description: updatedCourse.description,
        date_init: updatedCourse.date_init,
        date_end: updatedCourse.date_end,
        quota: updatedCourse.quota,
        content: updatedCourse.content,
        objetives: updatedCourse.objetives,
        instructor_profile: updatedCourse.instructor_profile,
        modality: updatedCourse.modality
      };
      
      // Si la respuesta incluye schedule, lo añadimos a los datos actualizados
      if (updatedCourse.schedule && Array.isArray(updatedCourse.schedule)) {
        updatedCourseData.schedule = updatedCourse.schedule;
      }
      
      onSuccess(updatedCourseData);
      
      setTimeout(() => {
        onDismiss();
      }, 500);
    } catch (error: any) {
      console.error("Error al actualizar el curso:", error);
      
      if (error.response) {
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
                const defaultDate = new Date();
                
                if (!watch("date_init")) return defaultDate;
                
                try {
                  const dateStr = watch("date_init");
                  const dateParts = dateStr.split('/');
                  
                  if (dateParts.length !== 3) return defaultDate;
                  
                  const day = parseInt(dateParts[0]);
                  const month = parseInt(dateParts[1]) - 1;
                  let year = parseInt(dateParts[2]);
                  
                  if (year < 100) {
                    year = 2000 + year;
                  }
                  
                  const date = new Date(year, month, day);
                  
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
                  const formattedDate = format(selectedDate, 'dd/MM/yyyy');
                  setValue("date_init", formattedDate);
                  
                  const endDateValue = watch("date_end");
                  if (endDateValue) {
                    try {
                      const endDateParts = endDateValue.split('/');
                      
                      if (endDateParts.length === 3) {
                        const day = parseInt(endDateParts[0]);
                        const month = parseInt(endDateParts[1]) - 1;
                        let year = parseInt(endDateParts[2]);
                        
                        if (year < 100) {
                          year = 2000 + year;
                        }
                        
                        const endDate = new Date(year, month, day);
                        
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
                const defaultDate = new Date();
                
                if (!watch("date_end")) return defaultDate;
                
                try {
                  const dateStr = watch("date_end");
                  const dateParts = dateStr.split('/');
                  
                  if (dateParts.length !== 3) return defaultDate;
                  
                  const day = parseInt(dateParts[0]);
                  const month = parseInt(dateParts[1]) - 1;
                  let year = parseInt(dateParts[2]);
                  
                  if (year < 100) {
                    year = 2000 + year;
                  }
                  
                  const date = new Date(year, month, day);
                  
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
                  const formattedDate = format(selectedDate, 'dd/MM/yyyy');
                  
                  const startDateValue = watch("date_init");
                  if (startDateValue) {
                    try {
                      const startDateParts = startDateValue.split('/');
                      
                      if (startDateParts.length === 3) {
                        const day = parseInt(startDateParts[0]);
                        const month = parseInt(startDateParts[1]) - 1;
                        let year = parseInt(startDateParts[2]);
                        
                        if (year < 100) {
                          year = 2000 + year;
                        }
                        
                        const startDate = new Date(year, month, day);
                        
                        if (selectedDate >= startDate) {
                          setValue("date_end", formattedDate);
                        } else {
                          alert("La fecha de fin debe ser igual o posterior a la fecha de inicio");
                        }
                      } else {
                        setValue("date_end", formattedDate);
                      }
                    } catch (error) {
                      setValue("date_end", formattedDate);
                      console.error("Error al validar fechas:", error);
                    }
                  } else {
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

          {/* Modalidad del Curso */}
          <Text style={styles.sectionTitle}>Modalidad del Curso *</Text>
          <View style={styles.chipContainer}>
            {MODALITY_OPTIONS.map((modalityOption) => (
              <Controller
                key={modalityOption}
                control={control}
                name="modality"
                render={({ field: { onChange, value } }) => (
                  <Chip
                    selected={value === modalityOption}
                    onPress={() => onChange(modalityOption)}
                    style={[
                      styles.chip,
                      value === modalityOption && styles.selectedChip,
                    ]}
                    textStyle={value === modalityOption ? styles.selectedChipText : undefined}
                  >
                    {modalityOption}
                  </Chip>
                )}
              />
            ))}
          </View>
          {errors.modality && (
            <HelperText type="error">{errors.modality.message}</HelperText>
          )}

          {/* Contenido del Curso */}
          <Text style={styles.sectionTitle}>Contenido del Curso</Text>
          <Controller
            control={control}
            name="content"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Contenido"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                multiline
                numberOfLines={4}
                placeholder="Ej. Unit 1: Introducción, Unit 2: Conceptos básicos..."
              />
            )}
          />

          {/* Objetivos del Curso */}
          <Text style={styles.sectionTitle}>Objetivos del Curso</Text>
          <Controller
            control={control}
            name="objetives"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Objetivos"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                multiline
                numberOfLines={4}
                placeholder="Ingrese los objetivos separados por comas"
              />
            )}
          />

          {/* Perfil del Instructor */}
          <Text style={styles.sectionTitle}>Perfil del Instructor</Text>
          <Controller
            control={control}
            name="instructor_profile"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Perfil del Instructor"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                multiline
                numberOfLines={3}
                placeholder="Ej. Ingeniero con experiencia en..."
              />
            )}
          />

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