// import { useSession } from "@/contexts/session";
// import { Redirect, Stack } from "expo-router";

// export default function App() {
//   const { session } = useSession();
//   // if (!session) return <Redirect href="/(login)" />;
//   // return <Redirect href="/(tabs)" />;
//   return <Redirect href="/(login)" />;
// }

import { useSession } from "@/contexts/session";
import { Redirect } from "expo-router";

export default function App() {
  const { session } = useSession();

  if (!session) {
    return <Redirect href="/(login)" />;
  }

  return <Redirect href="/(tabs)" />;
}