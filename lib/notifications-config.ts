import { notificationClient } from "./http";

export type NotificationPreferences = {
  session: {
    email: boolean;
    push: boolean;
  };
  courses: {
    email: boolean;
    push: boolean;
  };
  foro: {
    email: boolean;
    push: boolean;
  };
  permissions: {
    email: boolean;
    push: boolean;
  };
  other: {
    email: boolean;
    push: boolean;
  };
};

/**
 * Obtiene las preferencias de notificación del usuario actual
 * @param token Token JWT del usuario
 * @returns Preferencias de notificación
 */
export const getUserNotificationPreferences = async (token: string): Promise<NotificationPreferences> => {
  try {
    const response = await notificationClient.get('/config/user_preferences', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error al obtener las preferencias de notificación:', error);
    throw error;
  }
};

/**
 * Actualiza las preferencias de notificación del usuario
 * @param token Token JWT del usuario
 * @param preferences Nuevas preferencias de notificación
 * @returns Preferencias actualizadas
 */
export const updateUserNotificationPreferences = async (
  token: string, 
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  try {
    const response = await notificationClient.put('/config/user_preferences', preferences, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error al actualizar las preferencias de notificación:', error);
    throw error;
  }
};
