import React, { useState } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { Card, Title, Paragraph, Chip, Divider, Button } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { courseClient } from "@/lib/http";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TextInput } from "react-native-paper";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';


// Definición del tipo para los cursos
type Course = {
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  category: string | null;
  message: string;
};

// Función para obtener los cursos desde la API
const fetchCourses = async (): Promise<Course[]> => {
  const response = await courseClient.get('/courses');
  return response.data.courses;
};

// Componente principal para mostrar la lista de cursos
export default function CourseListScreen() {
  const [nameFilter, setNameFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<Date | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);


  // Usar React Query para manejar el estado de la petición
  const { data: courses, isLoading, error, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
  });

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  // Renderizar cada curso como una Card
  const renderCourseCard = ({ item }: { item: Course }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>{item.course_name}</Title>
        <Paragraph>{item.description}</Paragraph>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Inicio:</Text>
            <Text style={styles.infoValue}>{formatDate(item.date_init)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fin:</Text>
            <Text style={styles.infoValue}>{formatDate(item.date_end)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Cupos:</Text>
            <Text style={styles.infoValue}>{item.quota}</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.footerContainer}>
          {item.category && (
            <Chip mode="outlined" style={styles.categoryChip}>
              {item.category}
            </Chip>
          )}

          {item.message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>{item.message}</Text>
            </View>
          )}
        </View>
      </Card.Content>

      <Card.Actions>
        <Button mode="contained">Inscribirse</Button>
        <Button>Más información</Button>
      </Card.Actions>
    </Card>
  );

  // Si está cargando, mostrar un indicador de carga
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando cursos...</Text>
      </View>
    );
  }

  // Si hay un error, mostrar un mensaje de error
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Error al cargar los cursos: {(error as Error).message}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Intentar nuevamente
        </Button>
      </View>
    );
  }

  // const filteredCourses = courses?.filter((course) => {
  //   const matchesCategory =
  //     !selectedCategory || course.category === selectedCategory;
  //   const matchesName =
  //     course.course_name.toLowerCase().includes(nameFilter.toLowerCase());
  //   return matchesCategory && matchesName;
  // });

  const filteredCourses = courses?.filter((course) => {
    const matchesCategory =
      !selectedCategory || course.category === selectedCategory;
    const matchesName =
      course.course_name.toLowerCase().includes(nameFilter.toLowerCase());

    const courseStartDate = new Date(course.date_init);
    courseStartDate.setHours(courseStartDate.getHours() + 2); //Ajuste de hora por casteo

    const courseEndDate = new Date(course.date_end);
    courseEndDate.setHours(courseEndDate.getHours() + 2); //Ajuste de hora por casteo

    const matchesStartDate = !startDateFilter || courseStartDate >= startDateFilter;
    const matchesEndDate = !endDateFilter || courseEndDate <= endDateFilter;

    return matchesCategory && matchesName && matchesStartDate && matchesEndDate;
  });


  // Renderizar la lista de cursos
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Cursos Disponibles</Text>


      <View style={styles.dropdownContainer}>
        <Picker
          selectedValue={selectedCategory}
          onValueChange={(itemValue) => setSelectedCategory(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Todas las categorías" value={null} />
          <Picker.Item label="Art" value="Art" />
          {/* <Picker.Item label="Diseño" value="Diseño" />
          <Picker.Item label="Marketing" value="Marketing" />
          <Picker.Item label="Negocios" value="Negocios" /> */}
        </Picker>
      </View>


      <TextInput
        label="Buscar por nombre"
        value={nameFilter}
        onChangeText={setNameFilter}
        mode="outlined"
        style={{ marginBottom: 16 }}
      />

      <View style={styles.dateFilterContainer}>
        <Button mode="outlined" onPress={() => setShowStartDatePicker(true)}>
          {startDateFilter ? `Desde: ${format(startDateFilter, 'dd/MM/yyyy')}` : "Fecha de inicio"}
        </Button>
        <Button mode="outlined" onPress={() => setShowEndDatePicker(true)}>
          {endDateFilter ? `Hasta: ${format(endDateFilter, 'dd/MM/yyyy')}` : "Fecha de fin"}
        </Button>
      </View>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDateFilter || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              const dateWithInitOfDay = new Date(selectedDate);
              dateWithInitOfDay.setHours(0, 0, 0, 0);
              setStartDateFilter(dateWithInitOfDay);
            }
          }}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDateFilter || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              const dateWithEndOfDay = new Date(selectedDate);
              dateWithEndOfDay.setHours(23, 59, 59, 999);
              setEndDateFilter(dateWithEndOfDay);
            }
          }}
        />
      )}

      <Button
        mode="contained"
        onPress={() => {
          setNameFilter('');
          setSelectedCategory(null);
          setStartDateFilter(null);
          setEndDateFilter(null);
        }}
        style={{ marginTop: 16 }}
      >
        Limpiar filtros
      </Button>

      <FlatList
        data={filteredCourses}
        keyExtractor={(item, index) => `${item.course_name}-${index}`}
        renderItem={renderCourseCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay cursos disponibles</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 20,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 4,
  },
  infoContainer: {
    flexDirection: "row",
    marginTop: 10,
    flexWrap: "wrap",
  },
  infoItem: {
    marginRight: 20,
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    marginVertical: 10,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  categoryChip: {
    marginVertical: 5,
  },
  messageContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  messageText: {
    color: "#e67e22",
    fontStyle: "italic",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: 200,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
  },
  dropdownContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
  },

});