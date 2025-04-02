import { CenteredView } from "@/components/views/CenteredView";
import { client } from "@/lib/http";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { round } from "lodash";
import { Button, Image, Text } from "react-native";

interface People {
  id: string;
  avatar: string;
  email: string;
  first_name: string;
  last_name: string;
}

const fetchDetails = async (id: string) =>
  (await client.get(`/users/`, { params: { id } })).data.data as People;

export default function DetailScreen() {
  const { id } = useLocalSearchParams();
  const { data, isFetching } = useQuery({
    queryKey: ["details", id],
    queryFn: () => fetchDetails(id as string),
  });
  return (
    <CenteredView>
      {isFetching && <Text>Fetching...</Text>}
      <Image src={data && data.avatar} style={{ width: 100, height: 100 }} />
      <Text>Details {id}</Text>
    </CenteredView>
  );
}
