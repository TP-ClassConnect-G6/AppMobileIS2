import { Redirect } from "expo-router";

// Usado para el deep linking de cursos
// Redirige a la lista de cursos

export default function CoursesAlias() {
    return <Redirect href="/(tabs)/course-list" />;
}