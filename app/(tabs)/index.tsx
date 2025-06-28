import { router } from "expo-router";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Button, Card, Title, Paragraph } from "react-native-paper";
import { CenteredView } from "@/components/views/CenteredView";
import { useSession } from "@/contexts/session";
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";

interface QuickAction {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  userTypes: ('student' | 'teacher' | 'admin')[];
}

const quickActions: QuickAction[] = [
  {
    title: 'Explorar Cursos',
    description: 'Descubre nuevos cursos disponibles',
    icon: 'search',
    route: '/course-list',
    color: '#4CAF50',
    userTypes: ['student', 'teacher', 'admin']
  },
  {
    title: 'Chat Asistente',
    description: 'Obtén ayuda instantánea',
    icon: 'chatbubble-ellipses',
    route: '/chat-asistencia',
    color: '#2196F3',
    userTypes: ['student', 'teacher', 'admin']
  },
  {
    title: 'Crear Curso',
    description: 'Diseña un nuevo curso',
    icon: 'add-circle',
    route: '/create-course',
    color: '#FF9800',
    userTypes: ['teacher', 'admin']
  },
  {
    title: 'Mis Tareas',
    description: 'Revisa tus asignaciones',
    icon: 'clipboard',
    route: '/student-assignments',
    color: '#9C27B0',
    userTypes: ['student']
  }
];

export default function HomeScreen() {
  const { signOut, session } = useSession();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const userType = session?.userType as 'student' | 'teacher' | 'admin';
  const userName = session?.email?.split('@')[0] || 'Usuario';
  
  const filteredActions = quickActions.filter(action => 
    action.userTypes.includes(userType)
  );

  const handleQuickAction = (route: string) => {
    router.push(route as any);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.welcomeText, { color: theme.text }]}>
          ¡Hola, {userName}! 👋
        </Text>
        <Text style={[styles.subtitle, { color: theme.text, opacity: 0.7 }]}>
          Bienvenido a ClassConnect
        </Text>
      </View>

      <View style={styles.quickActionsSection}>
        <Title style={[styles.sectionTitle, { color: theme.text }]}>
          Accesos Rápidos
        </Title>
        
        <View style={styles.actionsGrid}>
          {filteredActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => handleQuickAction(action.route)}
              activeOpacity={0.7}
            >
              <Card style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#ffffff' }]}>
                <Card.Content style={styles.cardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
                    <Ionicons 
                      name={action.icon} 
                      size={28} 
                      color={action.color} 
                    />
                  </View>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>
                    {action.title}
                  </Text>
                  <Text style={[styles.actionDescription, { color: theme.text, opacity: 0.6 }]}>
                    {action.description}
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.userSection}>
        <Card style={[styles.userCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#ffffff' }]}>
          <Card.Content>
            <View style={styles.userInfo}>
              <View style={[styles.userAvatar, { backgroundColor: theme.tint + '20' }]}>
                <Ionicons name="person" size={24} color={theme.tint} />
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userRole, { color: theme.text }]}>
                  {userType === 'student' ? 'Estudiante' : 
                   userType === 'teacher' ? 'Profesor' : 'Administrador'}
                </Text>
                <Text style={[styles.userEmail, { color: theme.text, opacity: 0.7 }]}>
                  {session?.email}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.bottomButtons}>
        <Button
          mode="contained"
          icon="account"
          onPress={() => router.push("/(tabs)/profile")}
          style={[styles.button, { backgroundColor: theme.tint }]}
          contentStyle={styles.buttonContent}
        >
          Mi Perfil
        </Button>
        
        <Button
          mode="outlined"
          icon="logout"
          onPress={signOut}
          style={[styles.button, styles.logoutButton]}
          contentStyle={styles.buttonContent}
          textColor={theme.text}
        >
          Cerrar Sesión
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  quickActionsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
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
    padding: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  userSection: {
    marginBottom: 30,
  },
  userCard: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userRole: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  bottomButtons: {
    gap: 12,
    paddingBottom: 20,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    height: 50,
  },
  logoutButton: {
    borderColor: '#666',
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  spacer: {
    height: 16,
  },
});