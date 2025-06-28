import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { 
  chatService, 
  ChatMessage, 
  formatChatMessage, 
  predefinedMessages, 
  validateMessage 
} from '@/lib/chat';
import { useSession } from '@/contexts/session';
import { getItemAsync, setItemAsync, deleteItemAsync } from '@/lib/storage';

const CHAT_STORAGE_KEY = 'chat_assistant_data';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (messageText?: string) => Promise<void>;
  clearChat: () => void;
  refreshHistory: () => Promise<void>;
  isInitialized: boolean;
  isSyncing: boolean;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { session } = useSession();

  // Cargar datos del chat guardados
  const loadChatData = useCallback(async () => {
    try {
      const savedData = await getItemAsync(CHAT_STORAGE_KEY);
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
  }, []);

  // Guardar datos del chat
  const saveChatData = useCallback(async (chatId: string, messages: ChatMessage[]) => {
    try {
      const dataToSave = {
        chatId,
        messages,
        lastUpdated: new Date().toISOString(),
      };
      await setItemAsync(CHAT_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error guardando datos del chat:', error);
    }
  }, []);

  // Inicializar chat
  const initializeChat = useCallback(async () => {
    if (!session?.token) {
      setError(predefinedMessages.noSession);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Intentar cargar datos guardados primero
      await loadChatData();

      // Si no hay chatId guardado después de cargar datos, crear uno nuevo
      let currentChatId = chatId;
      
      // Verificar si tenemos un chatId después de cargar datos
      const savedData = await getItemAsync(CHAT_STORAGE_KEY);
      if (savedData) {
        const { chatId: savedChatId } = JSON.parse(savedData);
        currentChatId = savedChatId;
        setChatId(savedChatId);
      }

      if (currentChatId) {
        // Si hay chatId, cargar historial del servidor
        try {
          const serverHistory = await chatService.getChatHistory(currentChatId, session.token);
          if (serverHistory.length > 0) {
            setMessages(serverHistory);
            await saveChatData(currentChatId, serverHistory);
          } else {
            // Si no hay historial en servidor pero sí chatId, mantener mensajes locales
            // y agregar mensaje de bienvenida si no hay mensajes
            if (messages.length === 0) {
              const welcomeMessage = formatChatMessage(predefinedMessages.welcome, false);
              setMessages([welcomeMessage]);
              await saveChatData(currentChatId, [welcomeMessage]);
            }
          }
        } catch (error) {
          console.error('Error cargando historial del servidor:', error);
          // Si falla cargar del servidor, usar datos locales o crear mensaje de bienvenida
          if (messages.length === 0) {
            const welcomeMessage = formatChatMessage(predefinedMessages.welcome, false);
            setMessages([welcomeMessage]);
            await saveChatData(currentChatId, [welcomeMessage]);
          }
        }
      } else {
        // Si no hay chatId guardado, crear uno nuevo
        const newChatId = await chatService.createChat(session.token);
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
  }, [session?.token, chatId, loadChatData, saveChatData, messages]);

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
      const response = await chatService.sendMessage(chatId, textToSend, session.token);
      const assistantMessage = formatChatMessage(response, false);
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

  // Limpiar chat
  const clearChat = useCallback(async () => {
    try {
      await deleteItemAsync(CHAT_STORAGE_KEY);
      setMessages([]);
      setChatId(null);
      setError(null);
      setIsInitialized(false);
      
      // Reinicializar
      await initializeChat();
    } catch (error) {
      console.error('Error limpiando chat:', error);
    }
  }, [initializeChat]);

  // Inicializar cuando cambie la sesión
  useEffect(() => {
    if (session?.token && !isInitialized) {
      initializeChat();
    }
  }, [session?.token, isInitialized, initializeChat]);

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
  };
}
