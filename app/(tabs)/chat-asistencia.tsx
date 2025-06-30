import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import QuickSuggestions from '@/components/QuickSuggestions';
import FeaturedQuestions from '@/components/FeaturedQuestions';
import ChatHeader from '@/components/ChatHeader';
import MessageStatus from '@/components/MessageStatus';
import SyncStatusToast from '@/components/SyncStatusToast';
import { ChatMessage, predefinedMessages } from '@/lib/chat';
import { useChat } from '@/hooks/useChat';
import { useSyncToast } from '@/hooks/useSyncToast';

export default function ChatAsistencia() {
  const [inputText, setInputText] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingComment, setRatingComment] = useState('');
  const [pendingRating, setPendingRating] = useState<{
    messageId: string;
    rating: 'positive' | 'negative';
  } | null>(null);
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    clearChat, 
    refreshHistory,
    isInitialized,
    isSyncing,
    rateMessage
  } = useChat();
  const { toast, hideToast, showSyncSuccess, showSyncError, showChatCleared } = useSyncToast();
  const colorScheme = useColorScheme();
  const flatListRef = useRef<FlatList>(null);

  const handleSendMessage = async () => {
    await sendMessage(inputText);
    setInputText('');
  };

  const handleSuggestionPress = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleClearChat = () => {
    Alert.alert(
      'Limpiar Chat',
      '¿Estás seguro de que quieres borrar toda la conversación y empezar un nuevo chat?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            await clearChat();
            setInputText(''); // Limpiar el input text también
            showChatCleared();
          },
        },
      ]
    );
  };

  const handleRefreshHistory = async () => {
    try {
      await refreshHistory();
      showSyncSuccess(messages.length);
    } catch (error) {
      showSyncError();
    }
  };

  const handleRateMessage = async (messageId: string, rating: 'positive' | 'negative') => {
    // Guardar la calificación pendiente y mostrar el modal
    setPendingRating({ messageId, rating });
    setRatingComment('');
    setShowRatingModal(true);
  };

  const submitRating = async () => {
    if (!pendingRating) return;

    try {
      console.log('Intentando calificar mensaje:', { 
        messageId: pendingRating.messageId, 
        rating: pendingRating.rating,
        comment: ratingComment.trim() || undefined
      });
      
      // Buscar el mensaje para ver si ya tenía una calificación
      const currentMessage = messages.find(msg => msg.id === pendingRating.messageId);
      const wasAlreadyRated = currentMessage?.rated && currentMessage.rated !== 'not_rated';
      
      await rateMessage(pendingRating.messageId, pendingRating.rating, ratingComment.trim() || undefined);
      
      // Feedback visual opcional para mostrar que se cambió la calificación
      if (wasAlreadyRated) {
        console.log(`Calificación cambiada a ${pendingRating.rating} para mensaje ${pendingRating.messageId}`);
      }

      // Cerrar modal y limpiar estados
      setShowRatingModal(false);
      setPendingRating(null);
      setRatingComment('');
      
    } catch (error) {
      console.error('Error en submitRating:', error);
      Alert.alert('Error', 'No se pudo calificar el mensaje. Inténtalo de nuevo.');
    }
  };

  const cancelRating = () => {
    setShowRatingModal(false);
    setPendingRating(null);
    setRatingComment('');
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.isUser;
    const messageBackgroundColor = isUser 
      ? Colors[colorScheme ?? 'light'].tint 
      : Colors[colorScheme ?? 'light'].background;
    const messageTextColor = isUser 
      ? '#FFFFFF' 
      : Colors[colorScheme ?? 'light'].text;

    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.assistantMessage
      ]}>
        <View style={[
          styles.messageBubble,
          { backgroundColor: messageBackgroundColor }
        ]}>
          <Text style={[
            styles.messageText,
            { color: messageTextColor }
          ]}>
            {item.text}
          </Text>
          {/* Mostrar indicador de baja confianza si es una respuesta del asistente */}
          {!isUser && item.low_confidence && (
            <View style={styles.lowConfidenceIndicator}>
              <Ionicons name="warning-outline" size={12} color="#ff9800" />
              <Text style={styles.lowConfidenceText}>Respuesta incierta</Text>
            </View>
          )}
          {/* Mostrar indicador de recurso si es una respuesta del asistente con recurso */}
          {!isUser && item.resource && (
            <View style={styles.resourceIndicator}>
              <Ionicons name="library-outline" size={12} color="#2196f3" />
              <Text style={styles.resourceText}>Basado en: {item.resource}</Text>
            </View>
          )}
          {/* Botones de calificación para mensajes del asistente (excepto el primer mensaje) */}
          {!isUser && (() => {
            // Contar cuántos mensajes del asistente hay antes de este mensaje
            const assistantMessagesBefore = messages.slice(0, messages.indexOf(item)).filter(msg => !msg.isUser).length;
            // Solo mostrar botones de calificación si no es el primer mensaje del asistente
            return assistantMessagesBefore > 0;
          })() && (
            <View style={styles.ratingContainer}>
              <Text style={[styles.ratingLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
                ¿Te fue útil esta respuesta?
              </Text>
              <View style={styles.ratingButtons}>
                <TouchableOpacity
                  style={[
                    styles.ratingButton,
                    item.rated === 'positive' && styles.ratingButtonPositive,
                    { borderColor: Colors[colorScheme ?? 'light'].text + '20' }
                  ]}
                  onPress={() => {
                    console.log('Click en botón positivo para mensaje:', item.id);
                    if (item.rated !== 'positive') {
                      handleRateMessage(item.id, 'positive');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={item.rated === 'positive' ? "thumbs-up" : "thumbs-up-outline"} 
                    size={18} 
                    color={item.rated === 'positive' ? '#4caf50' : Colors[colorScheme ?? 'light'].text + '80'} 
                  />
                  {item.rated === 'positive' && (
                    <Text style={[styles.ratingButtonText, { color: '#4caf50' }]}>Útil</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.ratingButton,
                    item.rated === 'negative' && styles.ratingButtonNegative,
                    { borderColor: Colors[colorScheme ?? 'light'].text + '20' }
                  ]}
                  onPress={() => {
                    console.log('Click en botón negativo para mensaje:', item.id);
                    if (item.rated !== 'negative') {
                      handleRateMessage(item.id, 'negative');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={item.rated === 'negative' ? "thumbs-down" : "thumbs-down-outline"} 
                    size={18} 
                    color={item.rated === 'negative' ? '#f44336' : Colors[colorScheme ?? 'light'].text + '80'} 
                  />
                  {item.rated === 'negative' && (
                    <Text style={[styles.ratingButtonText, { color: '#f44336' }]}>No útil</Text>
                  )}
                </TouchableOpacity>
              </View>
              {/* Mostrar mensaje informativo si ya ha sido calificado */}
              {item.rated && (
                <Text style={[styles.ratingHelpText, { color: Colors[colorScheme ?? 'light'].text + '60' }]}>
                  Puedes cambiar tu calificación tocando el otro botón
                </Text>
              )}
            </View>
          )}
          <MessageStatus 
            isUser={isUser}
            timestamp={item.timestamp}
            status={isLoading && item.id === messages[messages.length - 1]?.id ? 'sending' : 'sent'}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modal de calificación con comentario */}
      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelRating}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                Calificar Respuesta
              </Text>
              <TouchableOpacity onPress={cancelRating} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalRatingInfo}>
              <Ionicons 
                name={pendingRating?.rating === 'positive' ? "thumbs-up" : "thumbs-down"} 
                size={32} 
                color={pendingRating?.rating === 'positive' ? '#4caf50' : '#f44336'} 
              />
              <Text style={[styles.modalRatingText, { color: Colors[colorScheme ?? 'light'].text }]}>
                Calificación: {pendingRating?.rating === 'positive' ? 'Útil' : 'No útil'}
              </Text>
            </View>

            <Text style={[styles.modalLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
              Comentario (opcional):
            </Text>
            <Text style={[styles.modalSubLabel, { color: Colors[colorScheme ?? 'light'].text + '70' }]}>
              Ayúdanos a mejorar contándonos por qué esta respuesta fue {pendingRating?.rating === 'positive' ? 'útil' : 'no útil'}
            </Text>
            <TextInput
              style={[
                styles.modalTextInput,
                { 
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: Colors[colorScheme ?? 'light'].text + '30',
                  backgroundColor: Colors[colorScheme ?? 'light'].background
                }
              ]}
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="Escribe un comentario sobre esta respuesta..."
              placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
              multiline
              maxLength={300}
              numberOfLines={4}
            />
            <Text style={[styles.modalCharCount, { color: Colors[colorScheme ?? 'light'].text + '60' }]}>
              {ratingComment.length}/300
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelRating}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.modalSubmitButton,
                  { backgroundColor: Colors[colorScheme ?? 'light'].tint }
                ]}
                onPress={submitRating}
              >
                <Text style={styles.modalSubmitButtonText}>Calificar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ThemedView style={styles.headerWrapper}>
        <ChatHeader 
          onClearChat={handleClearChat}
          onRefreshHistory={handleRefreshHistory}
          isOnline={isInitialized && !error}
          messagesCount={messages.length}
          isSyncing={isSyncing}
        />
      </ThemedView>

      <SyncStatusToast 
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: '#ffebee' }]}>
          <Text style={[styles.errorText, { color: '#c62828' }]}>
            {error}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {!isInitialized ? (
          <View style={styles.initializingContainer}>
            <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
            <Text style={[styles.initializingText, { color: Colors[colorScheme ?? 'light'].text }]}>
              Inicializando chat...
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                messages.length <= 1 && !isLoading ? (
                  <FeaturedQuestions 
                    onQuestionPress={handleSuggestionPress}
                    visible={true}
                  />
                ) : null
              }
            />

            <QuickSuggestions 
              onSuggestionPress={handleSuggestionPress}
              visible={messages.length > 1 && !isLoading}
            />

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
                <Text style={[styles.loadingText, { color: Colors[colorScheme ?? 'light'].text }]}>
                  {predefinedMessages.loading}
                </Text>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>

      {isInitialized && (
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: Colors[colorScheme ?? 'light'].background }}>
          <View style={[
            styles.inputContainer,
            { backgroundColor: Colors[colorScheme ?? 'light'].background }
          ]}>
            <TextInput
              style={[
                styles.textInput,
                { 
                  color: Colors[colorScheme ?? 'light'].text,
                  borderColor: Colors[colorScheme ?? 'light'].tint,
                  backgroundColor: Colors[colorScheme ?? 'light'].background
                }
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor={Colors[colorScheme ?? 'light'].text + '80'}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { 
                  backgroundColor: inputText.trim() 
                    ? Colors[colorScheme ?? 'light'].tint 
                    : Colors[colorScheme ?? 'light'].text + '40'
                }
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 5,
  },
  errorContainer: {
    margin: 15,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
  },
  initializingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  initializingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  messageContainer: {
    marginVertical: 5,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loadingText: {
    marginLeft: 8,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lowConfidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 8,
  },
  lowConfidenceText: {
    fontSize: 10,
    color: '#ff9800',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  resourceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
  },
  resourceText: {
    fontSize: 10,
    color: '#2196f3',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  ratingContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  ratingLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    minWidth: 50,
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  ratingButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  ratingButtonPositive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4caf50',
    borderWidth: 2,
  },
  ratingButtonNegative: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: '#f44336',
    borderWidth: 2,
  },
  ratingButtonText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
    color: '#666',
  },
  ratingHelpText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
  // Estilos del modal de calificación
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalRatingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  modalRatingText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalSubLabel: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalCharCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalCancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  modalSubmitButton: {
    // backgroundColor se define dinámicamente
  },
  modalSubmitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
