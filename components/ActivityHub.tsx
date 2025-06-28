import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSession } from '@/contexts/session';

interface ActivityOption {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  userTypes: ('student' | 'teacher' | 'admin')[];
}

const activityOptions: ActivityOption[] = [
  // Para estudiantes
  {
    title: 'Mis Tareas',
    description: 'Ver tareas asignadas y pendientes',
    icon: 'clipboard-outline',
    route: '/student-assignments',
    color: '#4CAF50',
    userTypes: ['student']
  },
  {
    title: 'Mis Exámenes',
    description: 'Revisar exámenes programados',
    icon: 'document-text-outline',
    route: '/student-assignments',
    color: '#FF9800',
    userTypes: ['student']
  },
  {
    title: 'Mis Feedbacks',
    description: 'Ver comentarios de profesores',
    icon: 'chatbox-outline',
    route: '/mis-feedbacks',
    color: '#2196F3',
    userTypes: ['student']
  },
  {
    title: 'Favoritos',
    description: 'Cursos marcados como favoritos',
    icon: 'star-outline',
    route: '/favorites',
    color: '#FFD700',
    userTypes: ['student']
  },
  
  // Para profesores
  {
    title: 'Crear Curso',
    description: 'Crear y configurar nuevo curso',
    icon: 'add-circle-outline',
    route: '/create-course',
    color: '#4CAF50',
    userTypes: ['teacher', 'admin']
  },
  {
    title: 'Crear Examen',
    description: 'Diseñar nuevo examen',
    icon: 'document-outline',
    route: '/create-exam',
    color: '#FF5722',
    userTypes: ['teacher', 'admin']
  },
  {
    title: 'Crear Tarea',
    description: 'Asignar nueva tarea',
    icon: 'checkbox-outline',
    route: '/create-task',
    color: '#9C27B0',
    userTypes: ['teacher', 'admin']
  },
  {
    title: 'Mis Asignaciones',
    description: 'Gestionar tareas y exámenes',
    icon: 'briefcase-outline',
    route: '/teacher-assignments',
    color: '#607D8B',
    userTypes: ['teacher', 'admin']
  },
  {
    title: 'Feedbacks',
    description: 'Revisar y dar feedbacks',
    icon: 'chatbubbles-outline',
    route: '/teacher-feedbacks',
    color: '#00BCD4',
    userTypes: ['teacher', 'admin']
  },
  
  // Para todos
  {
    title: 'Notificaciones',
    description: 'Configurar preferencias',
    icon: 'notifications-outline',
    route: '/notification-settings',
    color: '#795548',
    userTypes: ['student', 'teacher', 'admin']
  }
];

export default function ActivityHub() {
  const { session } = useSession();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const userType = session?.userType as 'student' | 'teacher' | 'admin';
  const filteredOptions = activityOptions.filter(option => 
    option.userTypes.includes(userType)
  );

  const handleOptionPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {userType === 'student' ? 'Mis Actividades' : 'Gestión de Cursos'}
      </Text>
      <Text style={[styles.subtitle, { color: theme.text, opacity: 0.7 }]}>
        {userType === 'student' 
          ? 'Accede rápidamente a tus tareas, exámenes y feedbacks'
          : 'Herramientas para crear y gestionar contenido educativo'
        }
      </Text>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {filteredOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.cardContainer}
              onPress={() => handleOptionPress(option.route)}
              activeOpacity={0.7}
            >
              <Card style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#ffffff' }]}>
                <Card.Content style={styles.cardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                    <Ionicons 
                      name={option.icon} 
                      size={32} 
                      color={option.color} 
                    />
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.cardDescription, { color: theme.text, opacity: 0.6 }]}>
                    {option.description}
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  cardContent: {
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
