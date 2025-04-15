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

type Session = {
  token: string;
  expirationTime: string;
  userId: string; // Ejemplo de otro parámetro
  userType: string; // Ejemplo de otro parámetro
};

// Funciones que va a consumir el contexto
interface SessionService {
  signInWithPassword: (email: string, password: string) => Promise<void>;
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
  const sessionString = await getItemAsync("session");//key, obtengo la sesion del storage
  if (!sessionString) // si no hay sesion guardada, retorno undefined
    return undefined;

  const session: Session = JSON.parse(sessionString); //parseo la sesion guardada

  // Validar si el token ha expirado
  const now = new Date().getTime();
  if (now > new Date(session.expirationTime).getTime()) {
    await endSession(); // Eliminar la sesión si ha expirado
    return undefined;
  }

  return await startSession(session); 
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
      expirationTime: data.expirationTime,
      userId: data.userId,
      userType: data.userType,
    };

    const savedSession = await startSession(session);//guardo la sesion en el storage
    setSession(savedSession);
    router.push("/(tabs)");
  };

  // se tiene q llamar a la funcion de signOut para cerrar sesion
  const signOut = async () => {
    await endSession();//elimino la sesion del storage
    setSession(undefined);
    router.navigate("/(login)");
  };

  return isLoading ? undefined : { session, signInWithPassword, signOut };
}

