import { CenteredView } from "@/components/views/CenteredView";
import { router } from "expo-router";
import { Button, Text, View } from "react-native";

export default function RegisterScreen() {
  return (
    <CenteredView>
      <Text>Under Construction </Text>
      <Button
        title="Go Back"
        onPress={() => {
          router.back();
        }}
      />
    </CenteredView>
  );
}
