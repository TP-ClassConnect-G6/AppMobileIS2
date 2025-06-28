import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface QuickSuggestionsProps {
  onSuggestionPress: (suggestion: string) => void;
  visible: boolean;
}

const suggestions = [
  {
    id: '1',
    text: '¿Cómo crear una tarea?',
    message: 'Quiero saber cómo crear una tarea paso a paso'
  },
  {
    id: '2',
    text: '¿Cómo crear un curso?',
    message: 'Necesito ayuda para crear un curso nuevo en la aplicación'
  },
  {
    id: '3',
    text: '¿Cómo crear un examen?',
    message: 'Explícame cómo crear un examen para mis estudiantes'
  },
  {
    id: '4',
    text: '¿Cómo inscribirse a un curso?',
    message: 'Quiero saber cómo inscribirme a un curso como estudiante'
  },
  {
    id: '5',
    text: '¿Ver mis calificaciones?',
    message: 'Quiero ver mis calificaciones y feedbacks recibidos'
  },
  {
    id: '6',
    text: '¿Configurar notificaciones?',
    message: 'Ayúdame a configurar las notificaciones de la aplicación'
  },
  {
    id: '7',
    text: '¿Problemas con la app?',
    message: 'Tengo problemas técnicos con la aplicación, ¿puedes ayudarme?'
  },
  {
    id: '8',
    text: '¿Actualizar perfil?',
    message: 'Quiero actualizar mi información de perfil'
  }
];

export default function QuickSuggestions({ onSuggestionPress, visible }: QuickSuggestionsProps) {
  const colorScheme = useColorScheme();

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={[
        styles.title,
        { color: Colors[colorScheme ?? 'light'].text }
      ]}>
        Preguntas frecuentes:
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion.id}
            style={[
              styles.suggestionChip,
              { 
                backgroundColor: Colors[colorScheme ?? 'light'].background,
                borderColor: Colors[colorScheme ?? 'light'].tint,
                shadowColor: Colors[colorScheme ?? 'light'].text,
              }
            ]}
            onPress={() => onSuggestionPress(suggestion.message)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.suggestionText,
              { color: Colors[colorScheme ?? 'light'].tint }
            ]}>
              {suggestion.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    opacity: 0.8,
  },
  scrollView: {
    flexDirection: 'row',
  },
  scrollContent: {
    paddingRight: 15,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1.5,
    marginRight: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
