import { CenteredView } from "@/components/views/CenteredView";
import { Link, router } from "expo-router";
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

const postForJSON = async (url: string, payload: {}) => {
  // TODO: use axios
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.headers.get("Content-Type")?.includes("application/json")) {
    throw new Error("Invalid response");
  }
  const data = await res.json();
  return data;
};
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
      if (!email || !password) {
        const errors: LoginError = { message: "Please fill all fields" };
        if (!email) {
          errors.email = "Email is required";
        }
        if (!password) {
          errors.password = "Password is required";
        }
        setError(errors);
        return;
      }
      // TODO: extract endpoint to env
      const data = await postForJSON("https://reqres.in/api/login", {
        email,
        password,
      });
      if (data.error) {
        setError(data.error);
        return;
      }
      console.log(data.token);
      router.push("/(tabs)");
    } catch (e) {
      console.error(e);
      setError({ message: "Something went wrong" });
      return;
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
