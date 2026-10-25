import axios from 'axios';

// URL de la API, definida en .env.local (ver .env.example y README).
// En el celular "localhost" es el propio teléfono: hay que usar la IP de la PC donde corre el backend.
export const URL_API = process.env.EXPO_PUBLIC_API_URL;

// El token de la sesión vive solo en memoria (igual que en la web): al cerrar la app hay que volver a ingresar.
let tokenActual = null;
export const establecerToken = (token) => {
  tokenActual = token;
};

export const apiClient = axios.create({
  baseURL: URL_API,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (tokenActual) config.headers.Authorization = `Bearer ${tokenActual}`;
  return config;
});
