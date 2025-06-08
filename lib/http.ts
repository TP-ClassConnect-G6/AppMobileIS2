import axios from "axios";

export const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

export const courseClient = axios.create({
  baseURL: "https://apigatewayis2-production.up.railway.app/courses",
});

export const notificationClient = axios.create({
  baseURL: "https://apigatewayis2-production.up.railway.app/notifications",
});

export const forumClient = axios.create({
  baseURL: "https://apigatewayis2-production.up.railway.app/forum",
});

// https://axios-http.com/docs/interceptors
//
// client.interceptors.request.use(
//   (config) => {
//     return config;
//   },
//   (error) => Promise.reject(error)
// );
