import { Redirect, useLocalSearchParams } from "expo-router";

export default function TeacherFeedbackAlias() {
    // Aquí podrías obtener el course_id de alguna fuente, o pasarlo directamente en la URL

    let { course_id } = useLocalSearchParams();

    if (Array.isArray(course_id)) {
        course_id = course_id[0] ?? null; // Aseguramos que sea
        // un string o null
    } else {
        course_id = course_id ?? null; // Aseguramos que sea un string o null
    }

    console.log("Deep linking para teacher feedbacks con course_id:", course_id);

    return <Redirect href={`/(tabs)/teacher-feedbacks?course_id=${course_id}`} />;
}