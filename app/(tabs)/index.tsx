import {
  Image,
  StyleSheet,
  Platform,
  Button,
  View,
  Text,
  Pressable,
} from "react-native";

import { CenteredView } from "@/components/views/CenteredView";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/http";
import { map } from "lodash";
import { router } from "expo-router";

interface People {
  id: string;
  avatar: string;
  email: string;
  first_name: string;
  last_name: string;
}
const fetchPeople = async () =>
  (await client.get("/users")).data.data as People[];

export default function HomeScreen() {
  const { data, isFetching } = useQuery({
    queryKey: ["people"],
    queryFn: fetchPeople,
  });

  return (
    <CenteredView>
      {isFetching && <Text>Fetching...</Text>}
      {map(data, ({ email, id }) => (
        <View key={id}>
          <Pressable
            onPress={() =>
              router.navigate({
                pathname: "/(details)/[id]",
                params: { id },
              })
            }
          >
            <Text>{email}</Text>
          </Pressable>
        </View>
      ))}
    </CenteredView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
