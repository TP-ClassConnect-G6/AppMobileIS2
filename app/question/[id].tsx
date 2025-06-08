import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

// Usado para el deep linking de preguntas
// Redirige a la pantalla principal del foro y pasa el id de la pregunta como parámetro

export default function QuestionIdAlias() {
    console.log("Todavía no está implementado el deep linking para preguntas");
    const router = useRouter();
    useEffect(() => {
        router.replace("/(tabs)/profile");
    }, []);
//     const router = useRouter();
//     useEffect(() => {
//         if (id) {
//             // Redirige a la pantalla principal del foro y pasa el id de la pregunta
//             router.replace({ pathname: "/(tabs)/forum", params: { questionId: id } });
//         }
//     }, [id]);
//     return null;
}