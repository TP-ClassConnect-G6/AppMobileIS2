import axios from "axios";

export const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

export const courseClient = axios.create({
  baseURL: "https://cursosis2-production-94bb.up.railway.app",
});

// https://axios-http.com/docs/interceptors
//
// client.interceptors.request.use(
//   (config) => {
//     return config;
//   },
//   (error) => Promise.reject(error)
// );
