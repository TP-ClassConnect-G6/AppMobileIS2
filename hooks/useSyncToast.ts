import { useState, useCallback } from 'react';

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useSyncToast() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({
      visible: true,
      message,
      type,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const showSyncSuccess = useCallback((count: number) => {
    showToast(`Historial sincronizado (${count} mensajes)`, 'success');
  }, [showToast]);

  const showSyncError = useCallback(() => {
    showToast('Error al sincronizar historial', 'error');
  }, [showToast]);

  const showChatCleared = useCallback(() => {
    showToast('Chat limpiado correctamente', 'success');
  }, [showToast]);

  const showNewChatCreated = useCallback(() => {
    showToast('Nuevo chat creado', 'info');
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    showSyncSuccess,
    showSyncError,
    showChatCleared,
    showNewChatCreated,
  };
}
