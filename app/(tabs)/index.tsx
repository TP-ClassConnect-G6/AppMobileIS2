// import {
//   Image,
//   StyleSheet,
//   Platform,
//   Button,
//   View,
//   Text,
//   Pressable,
// } from "react-native";

// import { CenteredView } from "@/components/views/CenteredView";
// import { useQuery } from "@tanstack/react-query";
// import { client } from "@/lib/http";
// import { map } from "lodash";
// import { router } from "expo-router";

// interface People {
//   id: string;
//   avatar: string;
//   email: string;
//   first_name: string;
//   last_name: string;
// }
// const fetchPeople = async () =>
//   (await client.get("/users")).data.data as People[];

// export default function HomeScreen() {
//   const { data, isFetching } = useQuery({
//     queryKey: ["people"],
//     queryFn: fetchPeople,
//   });

//   return (
//     <CenteredView>
//       {isFetching && <Text>Fetching...</Text>}
//       {map(data, ({ email, id }) => (
//         <View key={id}>
//           <Pressable
//             onPress={() =>
//               router.navigate({
//                 pathname: "/(tabs)/(details)/[id]",
//                 params: { id },
//               })
//             }
//           >
//             <Text>{email}</Text>
//           </Pressable>
//         </View>
//       ))}
//     </CenteredView>
//   );
// }

// const styles = StyleSheet.create({
//   titleContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//   },
//   stepContainer: {
//     gap: 8,
//     marginBottom: 8,
//   },
//   reactLogo: {
//     height: 178,
//     width: 290,
//     bottom: 0,
//     left: 0,
//     position: "absolute",
//   },
// });




import { router } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import { Button } from "react-native-paper";
import { CenteredView } from "@/components/views/CenteredView";
import { useSession } from "@/contexts/session";

export default function HomeScreen() {
  const { signOut } = useSession();
  return (
    <CenteredView style={styles.container}>
      <Text style={styles.welcomeText}>Bienvenido a la pantalla principal</Text>
      
      <Button
        mode="contained"
        icon="account"
        onPress={() => router.push("/(tabs)/profile")}
        style={styles.profileButton}
        contentStyle={styles.buttonContent}
      >
        Mi Perfil
      </Button>
      
      <View style={styles.spacer} />
      
      <Button
        mode="contained"
        icon="logout"
        onPress={signOut}
        style={styles.signOutButton}
        contentStyle={styles.buttonContent}
      >
        Cerrar Sesión
      </Button>
    </CenteredView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    marginBottom: 32,
  },
  profileButton: {
    backgroundColor: "#4A6572",
    marginBottom: 16,
  },
  signOutButton: {
    backgroundColor: "#F44336",
  },
  buttonContent: {
    height: 50,
  },
  spacer: {
    flex: 1,
  },
});