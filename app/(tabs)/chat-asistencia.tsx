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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import QuickSuggestions from '@/components/QuickSuggestions';
import { ChatMessage, predefinedMessages } from '@/lib/chat';
import { useChat } from '@/hooks/useChat';

export default function ChatAsistencia() {
  const [inputText, setInputText] = useState('');
  const { messages, isLoading, error, sendMessage, clearChat, isInitialized } = useChat();
  const colorScheme = useColorScheme();
  const flatListRef = useRef<FlatList>(null);

  const handleSendMessage = async () => {
    await sendMessage(inputText);
    setInputText('');
  };

  const handleSuggestionPress = (suggestion: string) => {
    sendMessage(suggestion);
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
          <Text style={[
            styles.timestamp,
            { color: isUser ? '#FFFFFF99' : Colors[colorScheme ?? 'light'].text + '80' }
          ]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <ThemedText type="title">Chat de Asistencia</ThemedText>
            <ThemedText type="default" style={styles.subtitle}>
              Pregúntame cualquier cosa sobre la aplicación
            </ThemedText>
          </View>
          <TouchableOpacity 
            onPress={clearChat}
            style={[styles.clearButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint + '20' }]}
          >
            <IconSymbol name="trash" size={20} color={Colors[colorScheme ?? 'light'].tint} />
          </TouchableOpacity>
        </View>
      </ThemedView>

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
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        <QuickSuggestions 
          onSuggestionPress={handleSuggestionPress}
          visible={messages.length <= 1 && !isLoading}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
            <Text style={[styles.loadingText, { color: Colors[colorScheme ?? 'light'].text }]}>
              {predefinedMessages.loading}
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
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
            <IconSymbol 
              name="arrow.up" 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  messagesList: {
    flex: 1,
    paddingHorizontal: 15,
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
});
