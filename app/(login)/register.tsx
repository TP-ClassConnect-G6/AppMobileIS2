// import { CenteredView } from "@/components/views/CenteredView";
// import { router } from "expo-router";
// import { Button, Text, View } from "react-native";

// export default function RegisterScreen() {
//   return (
//     <CenteredView>
//       <Text>Under Construction </Text>
//       <Button
//         title="Go Back"
//         onPress={() => {
//           router.back();
//         }}
//       />
//     </CenteredView>
//   );
// }
import { CenteredView } from "@/components/views/CenteredView";
import { useSession } from "@/contexts/session";
import { AxiosError } from "axios";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const styles = StyleSheet.create({
  text: {
    fontSize: 24,
    marginBottom: 16,
  },
  link: {
    fontStyle: "italic",
    marginTop: 16,
    color: "#007BFF",
    textDecorationLine: "underline",
  },
  input: {
    width: "100%",
    padding: 0,
    margin: 0,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
  },
  helperText: {
    width: "100%",
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    textAlign: "left",
  },
  error: {
    borderWidth: 1,
    borderColor: "red",
    borderRadius: 4,
  },
  button: {
    width: "100%",
    padding: 12,
    backgroundColor: "#007BFF",
    borderRadius: 4,
    alignItems: "center",
  },
});

const zodSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

export default function RegisterScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isLoading },
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [error, setError] = useState<string | undefined>(undefined);
  //const { signUpWithPassword } = useSession();

  const handleRegister = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    try {
      console.log(email, password);
      //await signUpWithPassword(email, password);
      router.push("./login");
    } catch (e) {
      setError(
        e instanceof AxiosError && e.response
          ? e.response.data.error
          : "Something went wrong"
      );
    }
  };

  return (
    <CenteredView>
      <Text style={styles.text}>Register</Text>
      {error && <Text style={{ backgroundColor: "red" }}>{error}</Text>}
      <View style={{ width: "100%" }}>
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors?.email ? styles.error : {}]}
              placeholder="Email..."
              editable={!isLoading}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
          name="email"
        />
        <Text style={styles.helperText}>{errors?.email?.message}</Text>
      </View>

      <View style={{ width: "100%" }}>
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors?.password ? styles.error : {}]}
              placeholder="Password..."
              editable={!isLoading}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
            />
          )}
          name="password"
        />
        <Text style={styles.helperText}>{errors?.password?.message}</Text>
      </View>

      <View style={{ width: "100%" }}>
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                errors?.confirmPassword ? styles.error : {},
              ]}
              placeholder="Confirm Password..."
              editable={!isLoading}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
            />
          )}
          name="confirmPassword"
        />
        <Text style={styles.helperText}>
          {errors?.confirmPassword?.message}
        </Text>
      </View>

      <View style={{ width: "100%" }}>
        <Button
          color="green"
          disabled={isLoading}
          title={isLoading ? "Loading..." : "Register"}
          onPress={handleSubmit(handleRegister)}
        />
      </View>
      <Button
        title="Go Back"
        onPress={() => {
          router.back();
        }}
      />
    </CenteredView>
  );
}