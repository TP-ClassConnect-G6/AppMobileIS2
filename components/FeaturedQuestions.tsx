import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface FeaturedQuestionsProps {
  onQuestionPress: (question: string) => void;
  visible: boolean;
}

const featuredQuestions = [
  {
    id: '1',
    title: 'Crear Tarea',
    question: '¿Cómo crear una tarea?',
    message: 'Quiero saber cómo crear una tarea paso a paso',
    icon: 'checklist',
    color: '#2196F3',
  },
  {
    id: '2',
    title: 'Crear Curso',
    question: '¿Cómo crear un curso?',
    message: 'Necesito ayuda para crear un curso nuevo en la aplicación',
    icon: 'book',
    color: '#4CAF50',
  },
  {
    id: '3',
    title: 'Crear Examen',
    question: '¿Cómo crear un examen?',
    message: 'Explícame cómo crear un examen para mis estudiantes',
    icon: 'doc.text',
    color: '#FF9800',
  },
  {
    id: '4',
    title: 'Inscribirse',
    question: '¿Cómo inscribirse a un curso?',
    message: 'Quiero saber cómo inscribirme a un curso como estudiante',
    icon: 'person.badge.plus',
    color: '#9C27B0',
  },
];

export default function FeaturedQuestions({ onQuestionPress, visible }: FeaturedQuestionsProps) {
  const colorScheme = useColorScheme();

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={[
        styles.title,
        { color: Colors[colorScheme ?? 'light'].text }
      ]}>
        ¿En qué puedo ayudarte?
      </Text>
      
      <View style={styles.grid}>
        {featuredQuestions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.questionCard,
              { 
                backgroundColor: Colors[colorScheme ?? 'light'].background,
                borderColor: item.color + '30',
                shadowColor: Colors[colorScheme ?? 'light'].text,
              }
            ]}
            onPress={() => onQuestionPress(item.message)}
            activeOpacity={0.8}
          >
            <View style={[
              styles.iconContainer,
              { backgroundColor: item.color + '20' }
            ]}>
              <IconSymbol 
                name={item.icon as any} 
                size={24} 
                color={item.color} 
              />
            </View>
            
            <Text style={[
              styles.questionTitle,
              { color: Colors[colorScheme ?? 'light'].text }
            ]}>
              {item.title}
            </Text>
            
            <Text style={[
              styles.questionText,
              { color: Colors[colorScheme ?? 'light'].text + '80' }
            ]}>
              {item.question}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  questionCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  questionText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
