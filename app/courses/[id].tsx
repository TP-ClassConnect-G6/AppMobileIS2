import { useRouter, useLocalSearchParams } from "expo-router";
import { Redirect } from "expo-router";

// Usado para el deep linking de cursos
// Redirige a la lista de cursos y abre el modal de detalles del curso

export default function CourseIdAlias() {
    const { id } = useLocalSearchParams();

    console.log("Deep linking para cursos con id:", id);

    //Por alguna razon no funciona. Revisar
    return <Redirect href={`/(tabs)/course-list?courseId=${id}`} />;
}