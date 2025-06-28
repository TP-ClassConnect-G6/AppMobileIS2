import { chatClient } from './http';

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
}

class ChatServiceImpl implements ChatService {
  async createChat(token: string): Promise<string> {
    try {
      const response = await chatClient.post('/chat', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.data.chat_id) {
        throw new Error('No se recibió chat_id del servidor');
      }

      return response.data.chat_id;
    } catch (error) {
      console.error('Error creando chat:', error);
      throw new Error('No se pudo crear el chat');
    }
  }

  async sendMessage(chatId: string, message: string, token: string): Promise<string> {
    try {
      const response = await chatClient.post(`/chat/${chatId}/message`, {
        message: message.trim(),
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.response || 'Lo siento, no pude procesar tu mensaje.';
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw new Error('No se pudo enviar el mensaje');
    }
  }

  async getChatHistory(chatId: string, token: string): Promise<ChatMessage[]> {
    try {
      const response = await chatClient.get(`/chat/${chatId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Mapear la respuesta del servidor al formato de ChatMessage
      return response.data.messages?.map((msg: any, index: number) => ({
        id: msg.id || index.toString(),
        text: msg.content || msg.text || '',
        isUser: msg.role === 'user',
        timestamp: new Date(msg.timestamp || Date.now()),
      })) || [];
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return [];
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
