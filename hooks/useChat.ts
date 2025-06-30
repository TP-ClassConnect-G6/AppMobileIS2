import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { 
  chatService, 
  ChatMessage, 
  formatChatMessage, 
  predefinedMessages, 
  validateMessage,
  processMarkdownToPlainText
} from '@/lib/chat';
import { useSession } from '@/contexts/session';
import { getItemAsync, setItemAsync, deleteItemAsync } from '@/lib/storage';

const getChatStorageKey = (userId: string) => `chat_assistant_data_${userId}`;

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (messageText?: string) => Promise<void>;
  clearChat: () => void;
  refreshHistory: () => Promise<void>;
  isInitialized: boolean;
  isSyncing: boolean;
  rateMessage: (messageId: string, rating: 'positive' | 'negative', comment?: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { session } = useSession();

  // Cargar datos del chat guardados
  const loadChatData = useCallback(async () => {
    if (!session?.userId) return;
    
    try {
      const chatStorageKey = getChatStorageKey(session.userId);
      const savedData = await getItemAsync(chatStorageKey);
      if (savedData) {
        const { chatId: savedChatId, messages: savedMessages } = JSON.parse(savedData);
        setChatId(savedChatId);
        
        // Convertir timestamps de string a Date
        const messagesWithDates = savedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        
        setMessages(messagesWithDates);
      }
    } catch (error) {
      console.error('Error cargando datos del chat:', error);
    }
  }, [session?.userId]);

  // Guardar datos del chat
  const saveChatData = useCallback(async (chatId: string, messages: ChatMessage[]) => {
    if (!session?.userId) return;
    
    try {
      const chatStorageKey = getChatStorageKey(session.userId);
      const dataToSave = {
        chatId,
        messages,
        lastUpdated: new Date().toISOString(),
      };
      await setItemAsync(chatStorageKey, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error guardando datos del chat:', error);
    }
  }, [session?.userId]);

  // Inicializar chat
  const initializeChat = useCallback(async () => {
    if (!session?.token || !session?.userId) {
      setError(predefinedMessages.noSession);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Intentar cargar datos guardados primero
      await loadChatData();

      // Verificar si tenemos un chatId usando el servicio
      let currentChatId = await chatService.getChatId(session.userId);
      
      if (currentChatId) {
        setChatId(currentChatId);
        // Si hay chatId, cargar historial del servidor
        try {
          const serverHistory = await chatService.getChatHistory(currentChatId, session.token);
          if (serverHistory.length > 0) {
            setMessages(serverHistory);
            await saveChatData(currentChatId, serverHistory);
          } else {
            // Si no hay historial en servidor pero sí chatId, no agregar mensaje automáticamente
            // El usuario puede empezar a escribir cuando quiera
            console.log('Chat existente sin historial en servidor');
          }
        } catch (error) {
          console.error('Error cargando historial del servidor:', error);
          // Si falla cargar del servidor pero ya hay mensajes locales, mantenerlos
          // Si no hay mensajes, dejar el chat vacío para que el usuario escriba
          console.log('Error cargando historial, manteniendo estado actual');
        }
      } else {
        // Si no hay chatId guardado, crear uno nuevo
        const newChatId = await chatService.createChat(session.token, session.userId);
        setChatId(newChatId);
        
        // Agregar mensaje de bienvenida solo para chats nuevos
        const welcomeMessage = formatChatMessage(predefinedMessages.welcome, false);
        setMessages([welcomeMessage]);
        
        await saveChatData(newChatId, [welcomeMessage]);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error inicializando chat:', error);
      setError('No se pudo inicializar el chat');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, session?.userId, chatId, loadChatData, saveChatData, messages]);

  // Enviar mensaje
  const sendMessage = useCallback(async (messageText?: string) => {
    if (!session?.token || !chatId) {
      setError(predefinedMessages.noSession);
      return;
    }

    const textToSend = messageText?.trim();
    if (!textToSend) {
      return;
    }

    const validation = validateMessage(textToSend);
    if (!validation.isValid) {
      Alert.alert('Error', validation.error);
      return;
    }

    const userMessage = formatChatMessage(textToSend, true);
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      const assistantMessage = await chatService.sendMessage(chatId, textToSend, session.token);
      const finalMessages = [...newMessages, assistantMessage];
      
      setMessages(finalMessages);
      await saveChatData(chatId, finalMessages);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      const errorMessage = formatChatMessage(predefinedMessages.error, false);
      const finalMessages = [...newMessages, errorMessage];
      
      setMessages(finalMessages);
      setError('Error al enviar mensaje');
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, chatId, messages, saveChatData]);

  // Refrescar historial manualmente
  const refreshHistory = useCallback(async () => {
    if (!session?.token || !chatId) {
      return;
    }

    try {
      setIsSyncing(true);
      setError(null);
      
      const serverHistory = await chatService.getChatHistory(chatId, session.token);
      if (serverHistory.length > 0) {
        setMessages(serverHistory);
        await saveChatData(chatId, serverHistory);
      }
    } catch (error) {
      console.error('Error refrescando historial:', error);
      setError('Error al sincronizar historial');
    } finally {
      setIsSyncing(false);
    }
  }, [session?.token, chatId, saveChatData]);

  // Calificar mensaje
  const rateMessage = useCallback(async (messageId: string, rating: 'positive' | 'negative', comment?: string) => {
    if (!session?.token || !chatId) {
      setError(predefinedMessages.noSession);
      return;
    }

    try {
      await chatService.rateMessage(chatId, messageId, rating, comment, session.token);
      
      // Actualizar el mensaje en el estado local
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, rated: rating }
            : msg
        )
      );
      
      // Guardar los mensajes actualizados
      const updatedMessages = messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, rated: rating }
          : msg
      );
      await saveChatData(chatId, updatedMessages);
      
    } catch (error) {
      console.error('Error calificando mensaje:', error);
      setError('Error al calificar el mensaje');
    }
  }, [session?.token, chatId, messages, saveChatData]);

  // Limpiar chat
  const clearChat = useCallback(async () => {
    if (!session?.userId) return;
    
    try {
      const chatStorageKey = getChatStorageKey(session.userId);
      await deleteItemAsync(chatStorageKey);
      
      // Limpiar estados pero mantener inicializado para que el input esté visible
      setMessages([]);
      setChatId(null);
      setError(null);
      // NO cambiar isInitialized - mantener el input visible
      setIsLoading(false);
      setIsSyncing(false);
      
      // Crear nuevo chatId pero sin mensaje de bienvenida automático
      if (session?.token && session?.userId) {
        const newChatId = await chatService.createChat(session.token, session.userId);
        setChatId(newChatId);
        
        // Guardar solo el chatId sin mensajes
        await saveChatData(newChatId, []);
      }
    } catch (error) {
      console.error('Error limpiando chat:', error);
    }
  }, [session?.userId, session?.token, saveChatData]);

  // Inicializar cuando cambie la sesión
  useEffect(() => {
    // Si cambia el usuario, limpiar estado anterior
    if (session?.userId && session.userId !== currentUserId) {
      setMessages([]);
      setChatId(null);
      setError(null);
      setIsInitialized(false);
      setIsLoading(false);
      setIsSyncing(false);
      setCurrentUserId(session.userId);
    }
    
    if (session?.token && session?.userId && !isInitialized) {
      initializeChat();
    }
    
    // Si se cierra sesión, limpiar estado
    if (!session?.token || !session?.userId) {
      setMessages([]);
      setChatId(null);
      setError(null);
      setIsInitialized(false);
      setIsLoading(false);
      setIsSyncing(false);
      setCurrentUserId(null);
    }
  }, [session?.token, session?.userId, isInitialized, initializeChat, currentUserId]);

  // Guardar datos cuando cambien los mensajes
  useEffect(() => {
    if (chatId && messages.length > 0 && isInitialized) {
      saveChatData(chatId, messages);
    }
  }, [messages, chatId, isInitialized, saveChatData]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    refreshHistory,
    isInitialized,
    isSyncing,
    rateMessage,
  };
}
