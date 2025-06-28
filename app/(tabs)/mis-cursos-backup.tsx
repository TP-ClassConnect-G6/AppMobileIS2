import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from "react-native";
import { Text, Title, Card, Button, Chip, Divider, Paragraph, Provider, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from "@/contexts/session";
import { courseClient } from "@/lib/http";
import { router } from "expo-router";
import CourseDetailModal from "@/components/CourseDetailModal";
import ActivityHub from "@/components/ActivityHub";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from "date-fns";

// Types
interface Schedule {
    day: string;
    time: string;
}

interface Course {
    course_id: string;
    course_name: string;
    description: string;
    date_init: string;
    date_end: string;
    quota: number;
    max_quota: number;
    academic_level: string;
    category: string | null;
    objetives: string;
    content: string;
    required_courses: any[];
    teacher: string;
    instructor_profile: string;
    modality: string;
    schedule: Schedule[];
    course_status: string;
    status: string;
    current_page: number;
    total_pages: number;
}

interface CourseHistory {
    active_courses: Course[];
    ended_courses: Course[];
    active_pages: number;
    ended_pages: number;
}

export default function MisCursosScreen() {
    const { session } = useSession();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [courseHistory, setCourseHistory] = useState<CourseHistory | null>(null);
    const [activePage, setActivePage] = useState(1);
    const [endedPage, setEndedPage] = useState(1);
    const [activeLimit] = useState(3); // Fixed limit as requested
    const [endedLimit] = useState(3); // Fixed limit as requested
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    // Filter states
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [filters, setFilters] = useState({
        course_name: '',
        status: '',
        date_init: null as Date | null,
        date_end: null as Date | null
    });

    const [searchFilters, setSearchFilters] = useState({
        course_name: '',
        status: '',
        date_init: null as Date | null,
        date_end: null as Date | null
    });

    const [isSearching, setIsSearching] = useState(false); useEffect(() => {
        fetchCourseHistory();
    }, [activePage, endedPage, searchFilters]);

    useEffect(() => {
        // Reset loading state if it's stuck
        const timer = setTimeout(() => {
            if (isSearching) {
                setIsSearching(false);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [isSearching]);

    const fetchCourseHistory = async () => {
        if (!session?.token) {
            Alert.alert("Error", "Debes iniciar sesión para ver tus cursos");
            return;
        }

        try {
            setLoading(true);

            // Build query parameters
            let queryParams = `active_limit=${activeLimit}&active_page=${activePage}&ended_limit=${endedLimit}&ended_page=${endedPage}`;

            // Add filters if set
            if (searchFilters.course_name) {
                queryParams += `&course_name=${encodeURIComponent(searchFilters.course_name)}`;
            }

            if (searchFilters.status) {
                queryParams += `&status=${encodeURIComponent(searchFilters.status)}`;
            }

            if (searchFilters.date_init) {
                const formattedDate = format(searchFilters.date_init, 'yyyy-MM-dd');
                queryParams += `&date_init=${encodeURIComponent(formattedDate)}`;
            }

            if (searchFilters.date_end) {
                const formattedDate = format(searchFilters.date_end, 'yyyy-MM-dd');
                queryParams += `&date_end=${encodeURIComponent(formattedDate)}`;
            }

            console.log("Fetching courses with params:", queryParams);

            const response = await courseClient.get(
                `/courses/history?${queryParams}`,
                {
                    headers: {
                        'Authorization': `Bearer ${session.token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.status === 200 && response.data && response.data.response) {
                console.log("Course history response:", response.data.response);
                setCourseHistory(response.data.response);
            } else {
                throw new Error('Respuesta inesperada del servidor');
            }
        } catch (error) {
            console.error("Error al obtener el historial de cursos:", error);
            Alert.alert(
                "Error",
                "No se pudieron cargar tus cursos. Por favor, intenta nuevamente."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    const onRefresh = () => {
        setRefreshing(true);

        // Reset to first page when refreshing
        setActivePage(1);
        setEndedPage(1);

        fetchCourseHistory();
    };

    const navigateToCourseDetail = (courseId: string) => {
        router.push({
            pathname: "/(tabs)/course-list",
            params: { courseId }
        });
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    const getCourseStatusText = (status: string) => {
        switch (status) {
            case 'studiying':
                return 'Cursando';
            case 'approved':
                return 'Aprobado';
            case 'disapproved':
                return 'Desaprobado';
            default:
                return status;
        }
    };

    const getCourseStatusColor = (status: string) => {
        switch (status) {
            case 'studiying':
                return styles.statusStudying;
            case 'approved':
                return styles.statusApproved;
            case 'disapproved':
                return styles.statusDisapproved;
            default:
                return {};
        }
    };

    const renderCourseItem = (course: Course) => {
        return (
            <Card
                style={styles.courseCard}
                key={course.course_id}
                onPress={() => navigateToCourseDetail(course.course_id)}
            >
                <Card.Content>
                    <Title style={styles.courseTitle}>{course.course_name}</Title>

                    <View style={styles.courseInfo}>
                        <View style={styles.infoItem}>
                            <MaterialCommunityIcons name="account-tie" size={16} color="#666" />
                            <Text style={styles.infoText}>{course.teacher}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <MaterialCommunityIcons name="calendar-range" size={16} color="#666" />
                            <Text style={styles.infoText}>
                                {formatDate(course.date_init)} - {formatDate(course.date_end)}
                            </Text>
                        </View>

                        {course.modality && (
                            <View style={styles.infoItem}>
                                <MaterialCommunityIcons
                                    name={course.modality === 'virtual' ? "laptop" : "school"}
                                    size={16}
                                    color="#666"
                                />
                                <Text style={styles.infoText}>
                                    {course.modality === 'virtual' ? 'Virtual' : 'Presencial'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Paragraph numberOfLines={2} style={styles.courseDescription}>
                        {course.description}
                    </Paragraph>

                    {course.schedule && course.schedule.length > 0 && (
                        <View style={styles.scheduleContainer}>
                            <Text style={styles.sectionTitle}>Horarios:</Text>
                            <View style={styles.scheduleList}>
                                {course.schedule.map((item, index) => (
                                    <Chip key={index} style={styles.scheduleChip} icon="clock-outline">
                                        {item.day} {item.time}
                                    </Chip>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.statusContainer}>
                        <Chip
                            mode="outlined"
                            style={[styles.statusChip, getCourseStatusColor(course.status)]}
                        >
                            {getCourseStatusText(course.status)}
                        </Chip>

                        {course.category && (
                            <Chip mode="outlined" style={styles.categoryChip}>
                                {course.category}
                            </Chip>
                        )}
                    </View>
                </Card.Content>
                <Card.Actions style={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'flex-start',
                    padding: 10,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#eee',
                    borderRadius: 0,
                    elevation: 0,
                }}>
                    <Button
                        onPress={() => {
                            setSelectedCourseId(course.course_id);
                            setDetailModalVisible(true);
                        }}
                        style={{ width: '100%', marginBottom: 8 }}
                        contentStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 12 }}
                        icon="information-outline"
                    >
                        Más información
                    </Button>
                </Card.Actions>
            </Card>
        );
    };

    const renderPagination = (
        currentPage: number,
        totalPages: number,
        setPageFunction: React.Dispatch<React.SetStateAction<number>>
    ) => {
        return (
            <View style={styles.paginationContainer}>
                <Button
                    mode="outlined"
                    disabled={currentPage <= 1}
                    onPress={() => setPageFunction(prev => Math.max(1, prev - 1))}
                    icon="chevron-left"
                >
                    Anterior
                </Button>

                <Text style={styles.pageInfo}>
                    Página {currentPage} de {totalPages || 1}
                </Text>

                <Button
                    mode="outlined"
                    disabled={currentPage >= totalPages}
                    onPress={() => setPageFunction(prev => prev + 1)}
                    icon="chevron-right"
                    contentStyle={{ flexDirection: 'row-reverse' }}
                >
                    Siguiente
                </Button>
            </View>
        );
    };

    if (loading && !courseHistory) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Cargando tus cursos...</Text>
            </View>
        );
    } return (
        <Provider>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Title style={styles.screenTitle}>Mis Cursos</Title>
                {/* Filters toggle */}
                <View style={styles.filterToggleContainer}>
                    <TouchableOpacity
                        onPress={() => setFiltersVisible(!filtersVisible)}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                        <MaterialCommunityIcons
                            name={filtersVisible ? "filter-menu" : "filter-menu-outline"}
                            size={22}
                            color="#333"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.filterToggleText}>
                            {filtersVisible ? "Ocultar filtros ▲" : "Mostrar filtros ▼"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Filters section */}
                {filtersVisible && (
                    <View style={styles.filtersContainer}>
                        <TextInput
                            label="Buscar por nombre del curso"
                            value={filters.course_name}
                            onChangeText={(text) => setFilters((prev) => ({ ...prev, course_name: text }))}
                            mode="outlined"
                            style={styles.filterInput}
                            left={<TextInput.Icon icon="magnify" />}
                            placeholder="Ej: Programación, Matemáticas..."
                        />

                        <View style={styles.dropdownContainer}>
                            <Text style={{ fontSize: 14, color: '#666', marginLeft: 4, marginBottom: 4 }}>
                                Estado del curso
                            </Text>
                            <Picker
                                selectedValue={filters.status}
                                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                                style={styles.picker}
                            >
                                <Picker.Item label="Todos los estados" value="" />
                                <Picker.Item label="Cursando" value="studiying" />
                                <Picker.Item label="Aprobado" value="approved" />
                                <Picker.Item label="Desaprobado" value="disapproved" />
                            </Picker>
                        </View>

                        <Text style={{ fontSize: 14, color: '#666', marginLeft: 4, marginBottom: 8, marginTop: 4 }}>
                            Rango de fechas
                        </Text>

                        <View style={styles.dateFilterContainer}>
                            <Button
                                mode="outlined"
                                onPress={() => setShowStartDatePicker(true)}
                                style={styles.dateButton}
                                icon="calendar-start"
                            >
                                {filters.date_init
                                    ? `Desde: ${format(filters.date_init, 'dd/MM/yyyy')}`
                                    : "Fecha de inicio"}
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={() => setShowEndDatePicker(true)}
                                style={styles.dateButton}
                                icon="calendar-end"
                            >
                                {filters.date_end
                                    ? `Hasta: ${format(filters.date_end, 'dd/MM/yyyy')}`
                                    : "Fecha de fin"}
                            </Button>
                        </View>

                        {showStartDatePicker && (
                            <DateTimePicker
                                value={filters.date_init || new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowStartDatePicker(false);
                                    if (selectedDate) {
                                        const dateWithInitOfDay = new Date(selectedDate);
                                        dateWithInitOfDay.setHours(0, 0, 0, 0);
                                        setFilters((prev) => ({ ...prev, date_init: dateWithInitOfDay }));
                                    }
                                }}
                            />
                        )}

                        {showEndDatePicker && (
                            <DateTimePicker
                                value={filters.date_end || new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowEndDatePicker(false);
                                    if (selectedDate) {
                                        const dateWithEndOfDay = new Date(selectedDate);
                                        dateWithEndOfDay.setHours(23, 59, 59, 999);
                                        setFilters((prev) => ({ ...prev, date_end: dateWithEndOfDay }));
                                    }
                                }}
                            />
                        )}

                        <View style={styles.filterButtonsContainer}>
                            <Button
                                mode="contained"
                                onPress={() => {
                                    setIsSearching(true);
                                    setSearchFilters(filters);
                                    // Reset to first page when searching
                                    setActivePage(1);
                                    setEndedPage(1);

                                    // Allow UI to update before fetching
                                    setTimeout(() => {
                                        setIsSearching(false);
                                    }, 500);
                                }}
                                style={styles.searchButton}
                                icon="magnify"
                                loading={isSearching}
                                disabled={isSearching}
                                contentStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 8 }}
                            >
                                {isSearching ? 'Buscando...' : 'Buscar'}
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={() => {
                                    const resetFilters = {
                                        course_name: '',
                                        status: '',
                                        date_init: null,
                                        date_end: null
                                    };
                                    setFilters(resetFilters);
                                    setSearchFilters(resetFilters);

                                    // Reset to first page when clearing filters
                                    setActivePage(1);
                                    setEndedPage(1);
                                }}
                                style={styles.clearButton}
                                icon="refresh"
                                disabled={isSearching}
                                contentStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 8 }}
                            >
                                Limpiar Filtros
                            </Button>
                        </View>
                    </View>
                )}
                <Text style={styles.screenDescription}>
                    Aquí puedes ver todos tus cursos activos y finalizados
                </Text>

                {/* Active filters indicator */}
                {(searchFilters.course_name || searchFilters.status || searchFilters.date_init || searchFilters.date_end) && (
                    <View style={styles.activeFiltersContainer}>
                        <MaterialCommunityIcons name="filter-check" size={18} color="#2196f3" style={{ marginRight: 8 }} />
                        <Text style={styles.activeFiltersText}>
                            Filtros aplicados: {' '}
                            {[
                                searchFilters.course_name ? `Nombre: "${searchFilters.course_name}"` : null,
                                searchFilters.status ? `Estado: "${getCourseStatusText(searchFilters.status)}"` : null,
                                searchFilters.date_init ? `Desde: ${format(searchFilters.date_init, 'dd/MM/yyyy')}` : null,
                                searchFilters.date_end ? `Hasta: ${format(searchFilters.date_end, 'dd/MM/yyyy')}` : null
                            ].filter(Boolean).join(', ')}
                        </Text>
                    </View>
                )}

                {/* Active filters indicator */}
                {(searchFilters.course_name || searchFilters.status || searchFilters.date_init || searchFilters.date_end) && (
                    <View style={styles.activeFiltersContainer}>
                        <MaterialCommunityIcons name="filter-check" size={18} color="#2196f3" style={{ marginRight: 8 }} />
                        <Text style={styles.activeFiltersText}>
                            Filtros aplicados: {' '}
                            {[
                                searchFilters.course_name ? `Nombre: "${searchFilters.course_name}"` : null,
                                searchFilters.status ? `Estado: "${getCourseStatusText(searchFilters.status)}"` : null,
                                searchFilters.date_init ? `Desde: ${format(searchFilters.date_init, 'dd/MM/yyyy')}` : null,
                                searchFilters.date_end ? `Hasta: ${format(searchFilters.date_end, 'dd/MM/yyyy')}` : null
                            ].filter(Boolean).join(', ')}
                        </Text>
                    </View>
                )}

                {/* Active Courses Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="book-open-variant" size={24} color="#333" />
                        <Title style={styles.sectionTitle}>Cursos Activos</Title>
                    </View>

                    {loading ? (
                        <ActivityIndicator style={styles.sectionLoading} />) : courseHistory && courseHistory.active_courses.length > 0 ? (
                            <>
                                {courseHistory.active_courses.map(renderCourseItem)}
                                {renderPagination(activePage, courseHistory.active_pages, setActivePage)}
                            </>
                        ) : (
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={48} color="#ccc" />
                            <Text style={styles.emptyMessage}>
                                {(searchFilters.course_name || searchFilters.status || searchFilters.date_init || searchFilters.date_end)
                                    ? "No se encontraron cursos activos con los filtros aplicados"
                                    : "No tienes cursos activos actualmente"}
                            </Text>
                            {(searchFilters.course_name || searchFilters.status || searchFilters.date_init || searchFilters.date_end) && (
                                <Button
                                    mode="outlined"
                                    onPress={() => {
                                        const resetFilters = {
                                            course_name: '',
                                            status: '',
                                            date_init: null,
                                            date_end: null
                                        };
                                        setFilters(resetFilters);
                                        setSearchFilters(resetFilters);
                                    }}
                                    style={{ marginTop: 16 }}
                                    icon="filter-remove"
                                >
                                    Limpiar filtros
                                </Button>
                            )}
                        </View>
                    )}
                </View>

                <Divider style={styles.divider} />

                {/* Ended Courses Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="book-check" size={24} color="#333" />
                        <Title style={styles.sectionTitle}>Cursos Finalizados</Title>
                    </View>

                    {loading ? (
                        <ActivityIndicator style={styles.sectionLoading} />) : courseHistory && courseHistory.ended_courses.length > 0 ? (
                            <>
                                {courseHistory.ended_courses.map(renderCourseItem)}
                                {renderPagination(endedPage, courseHistory.ended_pages, setEndedPage)}
                            </>
                        ) : (
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="book-check-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyMessage}>
                                {(searchFilters.course_name || searchFilters.status || searchFilters.date_init || searchFilters.date_end)
                                    ? "No se encontraron cursos finalizados con los filtros aplicados"
                                    : "No tienes cursos finalizados"}
                            </Text>
                            {(searchFilters.course_name || searchFilters.status || searchFilters.date_init || searchFilters.date_end) && (
                                <Button
                                    mode="outlined"
                                    onPress={() => {
                                        const resetFilters = {
                                            course_name: '',
                                            status: '',
                                            date_init: null,
                                            date_end: null
                                        };
                                        setFilters(resetFilters);
                                        setSearchFilters(resetFilters);
                                    }}
                                    style={{ marginTop: 16 }}
                                    icon="filter-remove"
                                >
                                    Limpiar filtros
                                </Button>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Modal de detalles del curso */}
            <CourseDetailModal
                visible={detailModalVisible}
                onDismiss={() => setDetailModalVisible(false)}
                courseId={selectedCourseId}
            />
        </Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 40,
        marginBottom: 8,
    },
    screenDescription: {
        fontSize: 16,
        color: "#666",
        marginBottom: 24,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginLeft: 8,
    },
    divider: {
        height: 1,
        marginVertical: 24,
    },
    courseCard: {
        marginBottom: 16,
        borderRadius: 8,
        elevation: 2,
    },
    courseTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 8,
    },
    courseInfo: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 8,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 16,
        marginBottom: 4,
    },
    infoText: {
        fontSize: 14,
        color: "#666",
        marginLeft: 4,
    },
    courseDescription: {
        fontSize: 14,
        color: "#666",
        marginBottom: 12,
    },
    scheduleContainer: {
        marginVertical: 8,
    },
    scheduleList: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 4,
    },
    scheduleChip: {
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: "#f0f0f0",
    },
    statusContainer: {
        flexDirection: "row",
        marginTop: 8,
        flexWrap: "wrap",
    },
    statusChip: {
        marginRight: 8,
        marginBottom: 8,
    },
    categoryChip: {
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: "#e8f5e9",
    },
    statusStudying: {
        backgroundColor: "#e3f2fd",
        borderColor: "#2196f3",
    },
    statusApproved: {
        backgroundColor: "#e8f5e9",
        borderColor: "#4caf50",
    },
    statusDisapproved: {
        backgroundColor: "#ffebee",
        borderColor: "#f44336",
    },
    paginationContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
        marginBottom: 8,
    },
    pageInfo: {
        fontSize: 14,
        color: "#666",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    emptyMessage: {
        marginTop: 8,
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    }, sectionLoading: {
        padding: 20,
    },
    cardActions: {
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        padding: 10,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        borderRadius: 0,
        elevation: 0,
    },
    buttonLabel: {
        fontSize: 14,
        marginHorizontal: 4,
        paddingLeft: 8,
    },
    filtersContainer: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eaeaea',
    },
    filterToggleContainer: {
        marginBottom: 16,
    },
    filterToggleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    filterInput: {
        marginBottom: 12,
    },
    dropdownContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    picker: {
        height: 50,
    },
    dateFilterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    dateButton: {
        width: '48%',
    },
    filterButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    searchButton: {
        width: '48%',
    },
    clearButton: {
        width: '48%',
    },
    activeFiltersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#e3f2fd',
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#2196f3',
    },
    activeFiltersText: {
        flex: 1,
        fontSize: 14,
        color: '#0d47a1',
    },
});
