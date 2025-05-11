import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, Text as RNText, Platform } from "react-native";
import { Button, TextInput, Text, Chip, HelperText, Divider, Portal, Title, Modal } from "react-native-paper";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { courseClient } from "@/lib/http";
import { useSession } from "@/contexts/session";
import jwtDecode from "jwt-decode";
import { Course } from "@/app/(tabs)/course-list";

// Definición del tipo para la solicitud de edición de curso
type ScheduleItem = {
  day: string;
  time: string;
};

type EditCourseRequest = {
  role: string;
  course_name: string;
  description: string;
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

const editCourseSchema = z.object({
  course_name: z.string().min(3, "El nombre del curso debe tener al menos 3 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  date_init: z.string().min(1, "La fecha de inicio es requerida"),
  date_end: z.string().min(1, "La fecha de fin es requerida"),
  schedule: z.string().min(1, "El horario es requerido"),
  quota: z.number().min(1, "El cupo debe ser al menos 1"),
  academic_level: z.string().min(1, "El nivel académico es requerido"),
  required_course_name: z.array(requiredCourseSchema),
});

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

  // Configurar React Hook Form con validación Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
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

  // Cargar los datos del curso cuando cambie
  useEffect(() => {
    if (course) {
      setValue("course_name", course.course_name || "");
      setValue("description", course.description || "");
      setValue("date_init", course.date_init || "");
      setValue("date_end", course.date_end || "");
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
      const request: EditCourseRequest = {
        role: session.userType,
        course_name: data.course_name,
        description: data.description,
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
        objetives: response.data?.objetives || "string",
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
          <View style={styles.dateContainer}>
            <View style={styles.dateInputContainer}>
              <Controller
                control={control}
                name="date_init"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Fecha de inicio (DD/MM/YY) *"
                    value={value}
                    onChangeText={onChange}
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
                    onChangeText={onChange}
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