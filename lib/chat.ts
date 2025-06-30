import { chatClient } from './http';
import { getItemAsync, setItemAsync } from './storage';

/**
 * Chat Service para el sistema de asistencia
 * 
 * IMPORTANTE: Este servicio maneja chats por usuario individual.
 * Cada usuario tiene su propio chatId único que se almacena localmente 
 * usando la clave "chat_assistant_data_{userId}" en el storage.
 * 
 * Al cambiar de usuario, se debe limpiar el estado del chat actual
 * y cargar/crear un nuevo chatId específico para el nuevo usuario.
 */

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  rated?: string; // 'not_rated', 'positive', 'negative'
  low_confidence?: boolean;
}

export interface ChatService {
  createChat: (token: string, userId: string) => Promise<string>;
  sendMessage: (chatId: string, message: string, token: string) => Promise<ChatMessage>;
  getChatHistory: (chatId: string, token: string) => Promise<ChatMessage[]>;
  testConnection: (token: string) => Promise<boolean>;
  getChatId: (userId: string) => Promise<string | null>;
  setChatId: (userId: string, chatId: string) => Promise<void>;
}

class ChatServiceImpl implements ChatService {
  // Helper para obtener la clave de storage por usuario
  private getChatStorageKey(userId: string): string {
    return `chat_assistant_data_${userId}`;
  }

  async getChatId(userId: string): Promise<string | null> {
    try {
      const chatStorageKey = this.getChatStorageKey(userId);
      const savedData = await getItemAsync(chatStorageKey);
      if (savedData) {
        const { chatId } = JSON.parse(savedData);
        return chatId;
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo chatId:', error);
      return null;
    }
  }

  async setChatId(userId: string, chatId: string): Promise<void> {
    try {
      const chatStorageKey = this.getChatStorageKey(userId);
      const chatData = { chatId, messages: [] };
      await setItemAsync(chatStorageKey, JSON.stringify(chatData));
    } catch (error) {
      console.error('Error guardando chatId:', error);
    }
  }

  async createChat(token: string, userId: string): Promise<string> {
    try {
      console.log('Creando nuevo chat...');
      
      const response = await chatClient.post('/chat', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Chat creado exitosamente:', response.data);

      if (!response.data.chat_id) {
        throw new Error('No se recibió chat_id del servidor');
      }

      // Guardar el chatId en storage asociado al usuario
      await this.setChatId(userId, response.data.chat_id);

      return response.data.chat_id;
    } catch (error: any) {
      console.error('Error creando chat:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      throw new Error('No se pudo crear el chat');
    }
  }

  async sendMessage(chatId: string, message: string, token: string): Promise<ChatMessage> {
    try {
      console.log('Enviando mensaje al chat:', { chatId, message: message.trim() });
      
      const response = await chatClient.post(`/chat/${chatId}`, {
        message: message.trim(),
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Respuesta del servidor:', response.data);
      
      // Crear un objeto ChatMessage con todos los campos de la respuesta
      const responseMessage: ChatMessage = {
        id: response.data.id || `assistant-${Date.now()}`,
        text: processMarkdownToPlainText(response.data.content || response.data.response || 'Lo siento, no pude procesar tu mensaje.'),
        isUser: false,
        timestamp: new Date(response.data.timestamp || new Date().toISOString()),
        rated: response.data.rated,
        low_confidence: response.data.low_confidence,
      };
      
      return responseMessage;
    } catch (error: any) {
      console.error('Error enviando mensaje:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      throw new Error('No se pudo enviar el mensaje');
    }
  }

  async getChatHistory(chatId: string, token: string): Promise<ChatMessage[]> {
    try {
        console.log('CHAT ID:', chatId);
      const response = await chatClient.get(`/chat/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Mapear la respuesta del servidor al formato de ChatMessage y procesar markdown
      return response.data.messages?.map((msg: any, index: number) => ({
        id: msg.id || `${msg.role}-${msg.timestamp}-${index}`,
        text: msg.role === 'assistant' ? processMarkdownToPlainText(msg.content || '') : (msg.content || ''),
        isUser: msg.role === 'user',
        timestamp: new Date(msg.timestamp),
        rated: msg.rated,
        low_confidence: msg.low_confidence,
      })) || [];
    } catch (error) {
      //console.error('Error obteniendo historial:', error);
      return [];
    }
  }

  // Método para probar la conectividad
  async testConnection(token: string): Promise<boolean> {
    try {
      console.log('Probando conectividad del chat...');
      
      // Para la prueba de conectividad, usar un userId temporal
      const testUserId = 'test-connectivity';
      const testChatId = await this.createChat(token, testUserId);
      console.log('Conectividad exitosa, chat de prueba creado:', testChatId);
      
      return true;
    } catch (error) {
      console.error('Error de conectividad:', error);
      return false;
    }
  }
}

export const chatService = new ChatServiceImpl();

// Tipos adicionales para el chat
export interface ChatState {
  chatId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

// Helper para formatear mensajes
export const formatChatMessage = (text: string, isUser: boolean): ChatMessage => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  text: text.trim(),
  isUser,
  timestamp: new Date(),
});

// Mensajes predefinidos para casos comunes
export const predefinedMessages = {
  welcome: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
  error: 'Lo siento, hubo un error al procesar tu mensaje. Inténtalo de nuevo.',
  loading: 'Escribiendo...',
  noSession: 'No hay sesión activa. Por favor, inicia sesión para usar el chat.',
  connectionError: 'Error de conexión. Verifica tu internet e inténtalo de nuevo.',
};

// Validaciones
export const validateMessage = (message: string): { isValid: boolean; error?: string } => {
  if (!message.trim()) {
    return { isValid: false, error: 'El mensaje no puede estar vacío' };
  }
  
  if (message.length > 500) {
    return { isValid: false, error: 'El mensaje es demasiado largo (máximo 500 caracteres)' };
  }
  
  return { isValid: true };
};

// Helper para procesar markdown y convertirlo a texto plano
export const processMarkdownToPlainText = (text: string): string => {
  return text
    // Eliminar títulos (# ## ###)
    .replace(/^#{1,6}\s+/gm, '')
    // Eliminar negritas (**texto** o __texto__)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Eliminar cursivas (*texto* o _texto_) - mejorado para evitar conflictos
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1')
    // Eliminar código inline (`código`)
    .replace(/`([^`]+)`/g, '$1')
    // Procesar listas con asterisco (* texto)
    .replace(/^[\s]*\*\s+/gm, '• ')
    // Procesar listas con guión (- texto)  
    .replace(/^[\s]*-\s+/gm, '• ')
    // Procesar listas con más (+)
    .replace(/^[\s]*\+\s+/gm, '• ')
    // Procesar listas numeradas (1. texto)
    .replace(/^[\s]*\d+\.\s+/gm, '• ')
    // Eliminar enlaces [texto](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Eliminar código de bloque (```código```)
    .replace(/```[\s\S]*?```/g, '')
    // Procesar comillas específicas
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    // Limpiar saltos de línea múltiples
    .replace(/\n{3,}/g, '\n\n')
    // Trim espacios
    .trim();
};
