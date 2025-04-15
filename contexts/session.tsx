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

interface SessionService {
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  session?: Session;
}

const SessionContext = createContext<SessionService | undefined>(undefined);

export function useSession() {
  return useContext(SessionContext)!;
}

async function startSession(sessionData: Session) {
  await setItemAsync("session", JSON.stringify(sessionData));
  client.defaults.headers.common["Authorization"] = `Bearer ${sessionData.token}`;
  return sessionData;
}

async function endSession() {
  await deleteItemAsync("session");
  delete client.defaults.headers.common["Authorization"];
}

export async function recoverSession() {
  const sessionString = await getItemAsync("session");
  if (!sessionString) return undefined;

  const session: Session = JSON.parse(sessionString);

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

  useEffect(() => {
    recoverSession()
      .then((session) => session && setSession(session))
      .finally(() => setIsLoading(false));
  }, []);

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

    const savedSession = await startSession(session);
    setSession(savedSession);
    router.push("/(tabs)");
  };

  const signOut = async () => {
    await endSession();
    setSession(undefined);
    router.navigate("/(login)");
  };

  return isLoading ? undefined : { session, signInWithPassword, signOut };
}

export function SessionProvider({
  value,
  children,
}: PropsWithChildren<{ value: SessionService }>) {
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}