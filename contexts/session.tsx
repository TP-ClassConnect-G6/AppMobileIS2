import {
  useContext,
  createContext,
  type PropsWithChildren,
  useState,
  useEffect,
} from "react";
import { client } from "@/lib/http";
import { router } from "expo-router";
import { deleteItemAsync, getItemAsync, setItemAsync } from "@/lib/storage";
import jwtDecode from "jwt-decode";
import * as Linking from 'expo-linking';
import * as WebBrowser from "expo-web-browser";

type Session = {
  token: string;
  expirationTime: string;
  userId: string; // Ejemplo de otro parámetro
  userType: string; // Ejemplo de otro parámetro
};

// Funciones que va a consumir el contexto
interface SessionService {
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  session?: Session;
}

//Creo el contexto
// SessionService es el tipo de datos que va a tener el contexto
// undefined es el valor inicial del contexto
const SessionContext = createContext<SessionService | undefined>(undefined);

//Proveedor del contexto
// Este componente va a envolver a otros componentes(children) y les va a dar acceso al contexto
// value es el valor que va a tener el contexto
// children son los componentes que van a tener acceso al contexto
export function SessionProvider({
  value,
  children,
}: PropsWithChildren<{ value: SessionService }>) {
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

//Consumo del contexto
export function useSession() {
  return useContext(SessionContext)!;
}

// Se guarda la sesion en el storage y se agrega el token al header de las peticiones
async function startSession(sessionData: Session) {
  await setItemAsync("session", JSON.stringify(sessionData));//key, value almaceno en el storage
  client.defaults.headers.common["Authorization"] = `Bearer ${sessionData.token}`;// agrego el token a los headers de la peticion
  return sessionData; 
}

async function endSession() {
  await deleteItemAsync("session");//key, elimino la sesion del storage
  delete client.defaults.headers.common["Authorization"]; //elimino el token de los headers de la peticion
}


export async function recoverSession() {
  const sessionString = await getItemAsync("session"); // Obtengo la sesión del storage
  if (!sessionString){
    return undefined; // Si no hay sesión guardada, retorno undefined
  }

  const session: Session = JSON.parse(sessionString); // Parseo la sesión guardada

  // Decodificar el token JWT
  try {
    const decodedToken: { exp: number } = jwtDecode(session.token);

    // Validar si el token ha expirado
    const now = Math.floor(Date.now() / 1000); 
    const remainingTime = decodedToken.exp - now;
    console.log(`Tiempo restante para que el token expire: ${remainingTime} segundos`);
    if (now > decodedToken.exp) {
      console.log("Token expirado, finalizando sesión");
      await endSession(); 
      // No navegamos aquí para evitar problemas, solo terminamos la sesión
      return undefined;
    }
  } catch (error) {
    console.error("Error decoding JWT:", error);
    await endSession(); // Eliminar la sesión si el token no es válido
    return undefined;
  }

  return await startSession(session); // Si el token es válido, inicio la sesión
}

export function useInitializeSessionService() {
  const [session, setSession] = useState<Session>();
  const [isLoading, setIsLoading] = useState(true);

  // Recuperar la sesión al iniciar la aplicación
  useEffect(() => {
    recoverSession()
      .then((session) => session && setSession(session)) // si hay sesion guardada, la guardo en el estado
      .finally(() => setIsLoading(false));// cuando termine la carga, seteo isLoading en false
  }, []);

  //se tiene q llamar a la funcion de signInWithPassword para iniciar sesion
  const signInWithPassword = async (email: string, password: string) => {
    const { data } = await client.post("/login", {
      email,
      password,
    });

    const session: Session = {
      token: data.token,
      expirationTime: data.expires_in,
      userId: data.user_id,
      userType: data.user_type,
    };

    const savedSession = await startSession(session);//guardo la sesion en el storage
    console.log("Usertype: ", session.userType);
    console.log("Session: ", session);
    setSession(savedSession);
    router.push("/requestLocation"); // Redirijo a la pantalla de solicitud de ubicación
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUri = Linking.createURL('redirect');
      const loginUrl = `https://usuariosis2-production.up.railway.app/login/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
  
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);
  
      if (result.type === 'success' && result.url) {
        const params = new URLSearchParams(result.url.split("?")[1]);
        const token = params.get("token");
        const expiresIn = params.get("expires_in");
        const userId = params.get("user_id");
        const userType = params.get("user_type");
  
        if (!token) {
          throw new Error("No se recibió un token JWT en la redirección");
        }
  
        // Crear objeto de sesión
        const session: Session = {
          token,
          expirationTime: expiresIn || "",
          userId: userId || "",
          userType: userType || ""
        };
  
        // Usar el startSession que ya está disponible en este contexto
        const savedSession = await startSession(session);
        setSession(savedSession);
        router.push("/requestLocation"); // Redirijo a la pantalla de solicitud de ubicación
      } else {
        console.warn("El login fue cancelado o no se recibió el token.");
      }
    } catch (error) {
      console.error("Error durante el inicio de sesión con Google:", error);
      throw error; // Relanza el error para que se maneje en el componente
    }
  };

  // se tiene q llamar a la funcion de signOut para cerrar sesion
  const signOut = async () => {
    await endSession();//elimino la sesion del storage
    setSession(undefined);
    router.navigate("/(login)");
  };

  return isLoading ? undefined : { session, signInWithPassword, signInWithGoogle, signOut };
}


