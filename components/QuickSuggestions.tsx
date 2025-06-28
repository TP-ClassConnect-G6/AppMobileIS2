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
    text: '¿Cómo crear un curso?',
    message: 'Quiero saber cómo crear un curso nuevo en la aplicación'
  },
  {
    id: '2',
    text: '¿Cómo subir una tarea?',
    message: 'Necesito ayuda para subir una tarea'
  },
  {
    id: '3',
    text: '¿Cómo ver mis calificaciones?',
    message: 'Quiero ver mis calificaciones y feedbacks'
  },
  {
    id: '4',
    text: '¿Cómo configurar notificaciones?',
    message: 'Ayúdame a configurar las notificaciones'
  },
  {
    id: '5',
    text: '¿Problemas técnicos?',
    message: 'Tengo problemas técnicos con la aplicación'
  },
  {
    id: '6',
    text: '¿Cómo cambiar mi perfil?',
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
        Sugerencias rápidas:
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {suggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion.id}
            style={[
              styles.suggestionChip,
              { 
                backgroundColor: Colors[colorScheme ?? 'light'].background,
                borderColor: Colors[colorScheme ?? 'light'].tint 
              }
            ]}
            onPress={() => onSuggestionPress(suggestion.message)}
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
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
