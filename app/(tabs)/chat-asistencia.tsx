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
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    clearChat, 
    refreshHistory,
    isInitialized,
    isSyncing 
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
});
