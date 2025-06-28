import { chatClient } from './http';

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
}

export interface ChatService {
  createChat: (token: string) => Promise<string>;
  sendMessage: (chatId: string, message: string, token: string) => Promise<string>;
  getChatHistory: (chatId: string, token: string) => Promise<ChatMessage[]>;
  testConnection: (token: string) => Promise<boolean>;
}

class ChatServiceImpl implements ChatService {
  async createChat(token: string): Promise<string> {
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

  async sendMessage(chatId: string, message: string, token: string): Promise<string> {
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
      
      return response.data.content || response.data.response || 'Lo siento, no pude procesar tu mensaje.';
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
        id: `${msg.role}-${msg.timestamp}-${index}`,
        text: msg.role === 'assistant' ? processMarkdownToPlainText(msg.content || '') : (msg.content || ''),
        isUser: msg.role === 'user',
        timestamp: new Date(msg.timestamp),
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
      
      // Intentar crear un chat de prueba
      const testChatId = await this.createChat(token);
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
