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
      const response = await chatClient.get(`/chat/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Mapear la respuesta del servidor al formato de ChatMessage
      return response.data.messages?.map((msg: any, index: number) => ({
        id: `${msg.role}-${msg.timestamp}-${index}`,
        text: msg.content || '',
        isUser: msg.role === 'user',
        timestamp: new Date(msg.timestamp),
      })) || [];
    } catch (error) {
      console.error('Error obteniendo historial:', error);
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
