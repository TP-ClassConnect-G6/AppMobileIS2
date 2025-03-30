import { CenteredView } from "@/components/views/CenteredView";
import { client } from "@/lib/http";
import { AxiosError } from "axios";
import { Link, router } from "expo-router";
import { trim } from "lodash";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

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

type LoginError = {
  email?: string;
  password?: string;
  message?: string;
};

export default function LoginScreen() {
  // TODO: extract to a custom hook
  // TODO: use react-hook-form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginError | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const handleChangePassword = (text: string) => {
    setPassword(text);
    setError(undefined);
  };
  const handleChangeEmail = (text: string) => {
    setEmail(text);
    setError(undefined);
  };
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(undefined);
      if (!trim(email) || !trim(password)) {
        const errors: LoginError = { message: "Please fill all fields" };
        if (!trim(email)) {
          errors.email = "Email is required";
        }
        if (!trim(password)) {
          errors.password = "Password is required";
        }
        setError(errors);
        return;
      }
      const { data } = await client.post("/login", {
        email,
        password,
      });

      console.log(data.token);
      router.push("/(tabs)");
    } catch (e) {
      console.debug(process.env.EXPO_PUBLIC_API_URL, e);
      // let message : string;
      // if (e instanceof AxiosError && e.response) {
      //   message=  e.response.data.error;
      // } else {
      //   message= "Something went wrong";
      // }
      // setError({ message });
      setError({
        message:
          e instanceof AxiosError && e.response
            ? e.response.data.error
            : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <CenteredView>
      <Text style={styles.text}>Login</Text>
      {error?.message && (
        <Text style={{ backgroundColor: "red" }}>{error?.message}</Text>
      )}
      <View style={{ width: "100%" }}>
        <TextInput
          style={[styles.input, error?.email ? styles.error : {}]}
          placeholder="Username..."
          editable={!loading}
          value={email}
          onChangeText={handleChangeEmail}
        />
        <Text style={styles.helperText}>{error?.email}</Text>
      </View>

      <View style={{ width: "100%" }}>
        <TextInput
          style={[styles.input, error?.password ? styles.error : {}]}
          placeholder="Password..."
          editable={!loading}
          value={password}
          onChangeText={handleChangePassword}
          secureTextEntry
        />
        <Text style={styles.helperText}>{error?.password}</Text>
      </View>
      <View style={{ width: "100%" }}>
        <Button
          color="green"
          disabled={loading}
          title={loading ? "Loading..." : "Login"}
          onPress={handleLogin}
        />
      </View>
      <Link href="./register">Register</Link>
    </CenteredView>
  );
}
